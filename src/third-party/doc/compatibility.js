/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals VBArray, PDFJS */

'use strict';

// Initializing PDFJS global object here, it case if we need to change/disable
// some PDF.js features, e.g. range requests
if (typeof PDFJS === 'undefined') {
  (typeof window !== 'undefined' ? window : this).PDFJS = {};
}


// No XMLHttpRequest#response?
// Support: IE<11, Android <4.0
(function checkXMLHttpRequestResponseCompatibility() {
  var xhrPrototype = XMLHttpRequest.prototype;
  var xhr = new XMLHttpRequest();
  if (!('overrideMimeType' in xhr)) {
    // IE10 might have response, but not overrideMimeType
    // Support: IE10
    Object.defineProperty(xhrPrototype, 'overrideMimeType', {
      value: function xmlHttpRequestOverrideMimeType(mimeType) {}
    });
  }
  if ('responseType' in xhr) {
    return;
  }

  // The worker will be using XHR, so we can save time and disable worker.
  PDFJS.disableWorker = true;

  Object.defineProperty(xhrPrototype, 'responseType', {
    get: function xmlHttpRequestGetResponseType() {
      return this._responseType || 'text';
    },
    set: function xmlHttpRequestSetResponseType(value) {
      if (value === 'text' || value === 'arraybuffer') {
        this._responseType = value;
        if (value === 'arraybuffer' &&
            typeof this.overrideMimeType === 'function') {
          this.overrideMimeType('text/plain; charset=x-user-defined');
        }
      }
    }
  });

  // Support: IE9
  if (typeof VBArray !== 'undefined') {
    Object.defineProperty(xhrPrototype, 'response', {
      get: function xmlHttpRequestResponseGet() {
        if (this.responseType === 'arraybuffer') {
          return new Uint8Array(new VBArray(this.responseBody).toArray());
        } else {
          return this.responseText;
        }
      }
    });
    return;
  }

  Object.defineProperty(xhrPrototype, 'response', {
    get: function xmlHttpRequestResponseGet() {
      if (this.responseType !== 'arraybuffer') {
        return this.responseText;
      }
      var text = this.responseText;
      var i, n = text.length;
      var result = new Uint8Array(n);
      for (i = 0; i < n; ++i) {
        result[i] = text.charCodeAt(i) & 0xFF;
      }
      return result.buffer;
    }
  });
})();

// HTMLElement dataset property
// Support: IE<11, Safari<5.1, Android<4.0
(function checkDatasetProperty() {
  var div = document.createElement('div');
  if ('dataset' in div) {
    return; // dataset property exists
  }

  Object.defineProperty(HTMLElement.prototype, 'dataset', {
    get: function() {
      if (this._dataset) {
        return this._dataset;
      }

      var dataset = {};
      for (var j = 0, jj = this.attributes.length; j < jj; j++) {
        var attribute = this.attributes[j];
        if (attribute.name.substring(0, 5) !== 'data-') {
          continue;
        }
        var key = attribute.name.substring(5).replace(/\-([a-z])/g,
          function(all, ch) {
            return ch.toUpperCase();
          });
        dataset[key] = attribute.value;
      }

      Object.defineProperty(this, '_dataset', {
        value: dataset,
        writable: false,
        enumerable: false
      });
      return dataset;
    },
    enumerable: true
  });
})();

// Checks if possible to use URL.createObjectURL()
// Support: IE
(function checkOnBlobSupport() {
  // sometimes IE loosing the data created with createObjectURL(), see #3977
  if (navigator.userAgent.indexOf('Trident') >= 0) {
    PDFJS.disableCreateObjectURL = true;
  }
})();

// Checks if navigator.language is supported
(function checkNavigatorLanguage() {
  if ('language' in navigator) {
    return;
  }
  PDFJS.locale = navigator.userLanguage || 'en-US';
})();

(function checkRangeRequests() {
  // Safari has issues with cached range requests see:
  // https://github.com/mozilla/pdf.js/issues/3260
  // Last tested with version 6.0.4.
  // Support: Safari 6.0+
  var isSafari = Object.prototype.toString.call(
                  window.HTMLElement).indexOf('Constructor') > 0;

  // Older versions of Android (pre 3.0) has issues with range requests, see:
  // https://github.com/mozilla/pdf.js/issues/3381.
  // Make sure that we only match webkit-based Android browsers,
  // since Firefox/Fennec works as expected.
  // Support: Android<3.0
  var regex = /Android\s[0-2][^\d]/;
  var isOldAndroid = regex.test(navigator.userAgent);

  // Range requests are broken in Chrome 39 and 40, https://crbug.com/442318
  var isChromeWithRangeBug = /Chrome\/(39|40)\./.test(navigator.userAgent);

  if (isSafari || isOldAndroid || isChromeWithRangeBug) {
    PDFJS.disableRange = true;
    PDFJS.disableStream = true;
  }
})();

// Support: IE<11, Chrome<21, Android<4.4, Safari<6
(function checkSetPresenceInImageData() {
  // IE < 11 will use window.CanvasPixelArray which lacks set function.
  if (window.CanvasPixelArray) {
    if (typeof window.CanvasPixelArray.prototype.set !== 'function') {
      window.CanvasPixelArray.prototype.set = function(arr) {
        for (var i = 0, ii = this.length; i < ii; i++) {
          this[i] = arr[i];
        }
      };
    }
  } else {
    // Old Chrome and Android use an inaccessible CanvasPixelArray prototype.
    // Because we cannot feature detect it, we rely on user agent parsing.
    var polyfill = false, versionMatch;
    if (navigator.userAgent.indexOf('Chrom') >= 0) {
      versionMatch = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
      // Chrome < 21 lacks the set function.
      polyfill = versionMatch && parseInt(versionMatch[2]) < 21;
    } else if (navigator.userAgent.indexOf('Android') >= 0) {
      // Android < 4.4 lacks the set function.
      // Android >= 4.4 will contain Chrome in the user agent,
      // thus pass the Chrome check above and not reach this block.
      polyfill = /Android\s[0-4][^\d]/g.test(navigator.userAgent);
    } else if (navigator.userAgent.indexOf('Safari') >= 0) {
      versionMatch = navigator.userAgent.
        match(/Version\/([0-9]+)\.([0-9]+)\.([0-9]+) Safari\//);
      // Safari < 6 lacks the set function.
      polyfill = versionMatch && parseInt(versionMatch[1]) < 6;
    }

    if (polyfill) {
      var contextPrototype = window.CanvasRenderingContext2D.prototype;
      var createImageData = contextPrototype.createImageData;
      contextPrototype.createImageData = function(w, h) {
        var imageData = createImageData.call(this, w, h);
        imageData.data.set = function(arr) {
          for (var i = 0, ii = this.length; i < ii; i++) {
            this[i] = arr[i];
          }
        };
        return imageData;
      };
      // this closure will be kept referenced, so clear its vars
      contextPrototype = null;
    }
  }
})();

// Support: IE<10, Android<4.0, iOS
(function checkRequestAnimationFrame() {
  function fakeRequestAnimationFrame(callback) {
    window.setTimeout(callback, 20);
  }

  var isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
  if (isIOS) {
    // requestAnimationFrame on iOS is broken, replacing with fake one.
    window.requestAnimationFrame = fakeRequestAnimationFrame;
    return;
  }
  if ('requestAnimationFrame' in window) {
    return;
  }
  window.requestAnimationFrame =
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    fakeRequestAnimationFrame;
})();

(function checkCanvasSizeLimitation() {
  var isIOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
  var isAndroid = /Android/g.test(navigator.userAgent);
  if (isIOS || isAndroid) {
    // 5MP
    PDFJS.maxCanvasPixels = 5242880;
  }
})();

// Disable fullscreen support for certain problematic configurations.
// Support: IE11+ (when embedded).
(function checkFullscreenSupport() {
  var isEmbeddedIE = (navigator.userAgent.indexOf('Trident') >= 0 &&
                      window.parent !== window);
  if (isEmbeddedIE) {
    PDFJS.disableFullscreen = true;
  }
})();

// Provides document.currentScript support
// Support: IE, Chrome<29.
(function checkCurrentScript() {
  if ('currentScript' in document) {
    return;
  }
  Object.defineProperty(document, 'currentScript', {
    get: function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    },
    enumerable: true,
    configurable: true
  });
})();
