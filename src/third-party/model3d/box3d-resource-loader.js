/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(1);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _v2Loader = __webpack_require__(2);

	var _v2Loader2 = _interopRequireDefault(_v2Loader);

	var _runmodeLoader = __webpack_require__(7);

	var _runmodeLoader2 = _interopRequireDefault(_runmodeLoader);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var NUM_PRIORITIES = 10;
	var DEFAULT_PRIORITY = 5;
	var MAX_CONCURRENT_LOADS = 4;

	var Box3DResourceLoader = function () {
	  /**
	   * Abstraction of Box asset loading for Box3D.
	   * @constructor
	   * @param {BoxSDK} boxSdk An instance of BoxSDK.
	   * @param {Object} [options] Loading options.
	   * @param {Integer} [options.maxConcurrentLoads] The maximum number of concurrent loads.
	   */

	  function Box3DResourceLoader(boxSdk) {
	    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	    _classCallCheck(this, Box3DResourceLoader);

	    if (!boxSdk) {
	      throw new Error('Missing argument: boxSdk');
	    }

	    this.boxSdk = boxSdk;

	    if (this.boxSdk.token) {
	      this.loader = new _v2Loader2.default(this.boxSdk);
	    } else {
	      this.loader = new _runmodeLoader2.default(this.boxSdk);
	    }

	    // The buckets for keeping track of pending downloads by priority.
	    this.priorityBuckets = [];
	    this.currentNumLoading = 0;
	    this.maxConcurrentLoads = options.maxConcurrentLoads !== undefined ? options.maxConcurrentLoads : MAX_CONCURRENT_LOADS;
	  }

	  /**
	   * Abort the XHR request with the specified key.
	   * @method abortRequest
	   * @public
	   * @param {String} key The key of the XHR to abort. This is the same as the xhrKey option passed
	   * to load().
	   * @returns {void}
	   */


	  _createClass(Box3DResourceLoader, [{
	    key: 'abortRequest',
	    value: function abortRequest(key) {
	      this.loader.abortRequest(key);
	    }

	    /**
	     * Abort all active requests.
	     * @method abortRequests
	     * @public
	     * @returns {void}
	     */

	  }, {
	    key: 'abortRequests',
	    value: function abortRequests() {
	      this.loader.abortRequests();
	    }

	    /**
	     * Free resources used by this loader. After calling this method, the loader can no longer be
	     * used.
	     * @method destroy
	     * @public
	     * @returns {void}
	     */

	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      this.loader.destroy();
	      this.loader = null;
	      this.boxSdk = null;
	    }

	    /**
	     * Load the specified Box3DAsset.
	     * @method load
	     * @public
	     * @param {Box3DAsset} asset The Box3DAsset to load.
	     * @param {Object} [options] Loading options.
	     * @param {Integer} [options.priority] The loading priority, where lower numbers indicate higher
	     * priority. Must be greater than or equal to 0.
	     * @param {Integer} [options.maxSize] The maximum texture size.
	     * @param {Array} [options.channels] The preferred texture channel layout.
	     * @param {String} [options.compression] The preferred texture compression.
	     * @param {String} [options.xhrKey] The ID of the request.
	     * @param {Function} [progressFn] Called with progress events.
	     * @returns {Promise} A promise that resolves to the asset data.
	     */

	  }, {
	    key: 'load',
	    value: function load(asset) {
	      var _this = this;

	      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progressFn = arguments[2];

	      // Figure out the priority and then add the asset to the queue in the appropriate priority
	      // location.
	      var priority = Math.max(Math.min(options.priority !== undefined ? options.priority : DEFAULT_PRIORITY, NUM_PRIORITIES), 0);

	      if (!this.priorityBuckets[priority]) {
	        this.priorityBuckets[priority] = {};
	      }

	      return new Promise(function (resolve, reject) {
	        // Add the asset loading function to the queue and wait to be called.
	        _this.priorityBuckets[priority][asset.id] = function () {
	          _this.currentNumLoading++;

	          _this.loader.loadAsset(asset, options, progressFn).then(function (data) {
	            _this.currentNumLoading--;
	            _this.loadNext();
	            resolve(data);
	          }).catch(function (err) {
	            _this.currentNumLoading--;
	            _this.loadNext();
	            reject(err);
	          });
	        };

	        _this.loadNext();
	      });
	    }

	    /**
	     * Begin loading the next asset, if there are any waiting and if the maximum number of concurrent
	     * downloads has not been reached.
	     * @method loadNext
	     * @private
	     * @returns {void}
	     */

	  }, {
	    key: 'loadNext',
	    value: function loadNext() {
	      // Make sure we haven't reached the maximum number of concurrent downloads.
	      if (this.currentNumLoading >= this.maxConcurrentLoads) {
	        return;
	      }

	      // Look through the list and find the next asset to load, if any.
	      for (var i = 0; i < this.priorityBuckets.length; i++) {
	        if (this.priorityBuckets[i]) {
	          var keys = Object.keys(this.priorityBuckets[i]);
	          if (keys.length > 0) {
	            this.priorityBuckets[i][keys[0]]();
	            // Remove the asset from the queue and return.
	            delete this.priorityBuckets[i][keys[0]];
	            return;
	          }
	        }
	      }
	    }
	  }]);

	  return Box3DResourceLoader;
	}();

	global.Box3DResourceLoader = Box3DResourceLoader;
	module.exports = Box3DResourceLoader;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	var _baseLoader = __webpack_require__(3);

	var _baseLoader2 = _interopRequireDefault(_baseLoader);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Concrete sub-class of BaseLoader that loads assets using the V2 API.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */


	var V2Loader = function (_BaseLoader) {
	  _inherits(V2Loader, _BaseLoader);

	  /**
	   * Used for loading Box3D assets with the Box V2 Content API.
	   * @constructor
	   * @param {BoxSDK} boxSdk An instance of BoxSDK.
	   */

	  function V2Loader(boxSdk) {
	    _classCallCheck(this, V2Loader);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(V2Loader).call(this, boxSdk));
	  }

	  /** @inheritdoc */


	  _createClass(V2Loader, [{
	    key: 'getCredentialOptions',
	    value: function getCredentialOptions(external) {
	      return {
	        sendToken: !external,
	        withCredentials: false
	      };
	    }

	    /** @inheritdoc */

	  }, {
	    key: 'getGzippedLength',
	    value: function getGzippedLength(xhr, url) {
	      return _get(Object.getPrototypeOf(V2Loader.prototype), 'getGzippedLength', this).call(this, xhr, url, { withCredentials: false });
	    }
	  }]);

	  return V2Loader;
	}(_baseLoader2.default);

	exports.default = V2Loader;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _lie = __webpack_require__(4);

	var _lie2 = _interopRequireDefault(_lie);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var COMPRESSION_FACTORS = {
	  'application/vnd.box.box3d+bin': 1.0
	};

	var COMPRESSION_TYPE = {
	  DXT: 'dxt',
	  DXT1: 'dxt1',
	  DXT5: 'dxt5',
	  JPEG: 'jpeg',
	  ZIP: 'zip'
	};

	var DEFAULT_CHANNELS = ['red', 'green', 'blue'];

	var MAX_IMAGE_SIZE = 16384;

	var BaseLoader = function () {
	  /**
	   * Base class for loading Box3D assets.
	   * @constructor
	   * @param {BoxSDK} boxSdk An instance of BoxSDK.
	   */

	  function BaseLoader(boxSdk) {
	    _classCallCheck(this, BaseLoader);

	    this.boxSdk = boxSdk;
	    this.sdkLoader = this.boxSdk.representationLoader;

	    this.cache = {};
	    this.progressListeners = {}; // for tracking progress callbacks
	    this.gzipSizes = {}; // for caching gzipped asset sizes
	  }

	  /**
	   * Load data for the specified asset.
	   * @method loadAsset
	   * @public
	   * @param {Box3DAsset} asset The asset to load.
	   * @param {Object} options Loading options (@see Box3DResourceLoader.prototype.load()).
	   * @param {Function} [progressFn] The progress callback.
	   * @returns {Promise} A promise that resolves the asset data.
	   */


	  _createClass(BaseLoader, [{
	    key: 'loadAsset',
	    value: function loadAsset(asset) {
	      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progressFn = arguments[2];

	      var loadFn = this.getLoadFunction(asset.type);
	      if (!loadFn) {
	        return _lie2.default.reject('Unsupported asset type: ' + asset.type);
	      }

	      return loadFn.bind(this)(asset, options, progressFn);
	    }

	    /**
	     * Returns the loading function for the specified asset type.
	     * @method getLoadFunction
	     * @private
	     * @param {String} assetType The Box3DAsset's type.
	     * @returns {Function} The loading function.
	     */

	  }, {
	    key: 'getLoadFunction',
	    value: function getLoadFunction(assetType) {
	      switch (assetType) {
	        case 'buffer':
	          return this.loadBuffer;

	        case 'image':
	          return this.loadImage;
	      }
	    }

	    /**
	     * Called on progress events.
	     * @method onLoadProgress
	     * @private
	     * @param {Object} status The status object containing the XHR and loading progress.
	     * @returns {void}
	     */

	  }, {
	    key: 'onLoadProgress',
	    value: function onLoadProgress(status) {
	      var _this = this;

	      var target = status.xhr.target || status.xhr.srcElement;
	      var info = target.info;

	      if (!info) {
	        return;
	      }

	      // Get the URL from the XHR request.
	      var url = info.url;
	      var encoding = target.getResponseHeader('Content-Encoding');

	      // Notify progress listeners.
	      if (encoding && encoding.indexOf('gzip') > -1) {
	        this.getGzippedLength(target, url).then(function (total) {
	          status.total = total;
	          _this.notifyProgressListeners(url, status);
	        });
	      } else {
	        this.notifyProgressListeners(url, status);
	      }
	    }

	    /**
	     * Registers a progress callback for the given URL. Multiple listeners per URL are allowed.
	     * @method addProgressListener
	     * @private
	     * @param {String} url The URL to register the listener with.
	     * @param {Function} callback Called on progress events.
	     * @returns {void}
	     */

	  }, {
	    key: 'addProgressListener',
	    value: function addProgressListener(url, callback) {
	      if (!this.progressListeners.hasOwnProperty(url)) {
	        this.progressListeners[url] = [];
	      }

	      this.progressListeners[url].push(callback);
	    }

	    /**
	     * Remove all progress listeners for a given URL.
	     * @method removeProgressListeners
	     * @private
	     * @param {String} url The URL that the listeners are registered with.
	     * @returns {void}
	     */

	  }, {
	    key: 'removeProgressListeners',
	    value: function removeProgressListeners(url) {
	      if (this.progressListeners.hasOwnProperty(url)) {
	        delete this.progressListeners[url];
	      }
	    }

	    /**
	     * Notify progress listeners of progress.
	     * @private
	     * @param {String} url The URL associated with loading callback to call.
	     * @param {Object} status The status object to send to listeners.
	     * @returns {void}
	     */

	  }, {
	    key: 'notifyProgressListeners',
	    value: function notifyProgressListeners(url, status) {
	      if (this.progressListeners.hasOwnProperty(url)) {
	        this.progressListeners[url].forEach(function (callback) {
	          callback(status);
	        });
	      }
	    }

	    /**
	     * Get the required credentials for an XHR, taking into account whether the URL is external to the
	     * representation. Sub-classes should override this method if needed.
	     * @method getCredentialOptions
	     * @protected
	     * @param {Boolean} external Whether or not the URL is external to the representation.
	     * @returns {Object} The credentials to use.
	     */

	  }, {
	    key: 'getCredentialOptions',
	    value: function getCredentialOptions() /* external */{
	      return {};
	    }

	    /**
	     * Get the content length of a gzipped asset.
	     * @method getGzippedLength
	     * @protected
	     * @param {Object} xhr The response XHR with the appropriate headers.
	     * @param {String} url The key to store the total size at.
	     * @param {Object} options XHR request options (@see XHR.prototype.makeRequest() in BoxSDK).
	     * @returns {Integer} The byte size of the asset, with applied compression factor.
	     */

	  }, {
	    key: 'getGzippedLength',
	    value: function getGzippedLength(xhr, url, options) {
	      var _this2 = this;

	      if (!this.gzipSizes[url]) {
	        this.gzipSizes[url] = new _lie2.default(function (resolve, reject) {
	          // Check type to see if we need to apply a compression factor
	          var contentType = xhr.getResponseHeader('Content-Type');
	          var factor = COMPRESSION_FACTORS[contentType] || 1;

	          // make the HEAD request for content length
	          _this2.sdkLoader.xhr.makeRequest(xhr.responseURL, 'HEAD', null, null, options).then(function (resp) {
	            var total = resp.getResponseHeader('Content-Length');
	            resolve(total ? total * factor : 0);
	          }).catch(reject);
	        });
	      }

	      return this.gzipSizes[url];
	    }

	    /**
	     * Sub-classes may override this method to modify the buffer URL prior to the request being made.
	     * @method modifyBufferUrl
	     * @protected
	     * @param {String} url The URL defined in the representation.
	     * @returns {String} The fully qualified URL for the representation.
	     * @throws {Error} The error that occurs when modifying the URL.
	     */

	  }, {
	    key: 'modifyBufferUrl',
	    value: function modifyBufferUrl(url) {
	      return url;
	    }

	    /**
	     * Sub-classes may override this method to modify the image URL prior to the request being made.
	     * @method modifyImageUrl
	     * @protected
	     * @param {String} url The URL defined in the representation.
	     * @returns {String} The fully qualified URL for the representation.
	     * @throws {Error} The error that occurs when modifying the URL.
	     */

	  }, {
	    key: 'modifyImageUrl',
	    value: function modifyImageUrl(url) {
	      return url;
	    }

	    /**
	     * Load a buffer asset.
	     * @method loadBuffer
	     * @private
	     * @param {Box3DAsset} asset The asset to load.
	     * @param {Object} options Not used.
	     * @param {Function} [progressFn] The progress callback.
	     * @returns {Promise} A promise that resolves the ArrayBuffer.
	     */

	  }, {
	    key: 'loadBuffer',
	    value: function loadBuffer(asset) {
	      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progressFn = arguments[2];

	      var url = void 0;
	      try {
	        url = this.modifyBufferUrl(asset.getProperty('src'));
	      } catch (err) {
	        return _lie2.default.reject(err);
	      }

	      var requestOpts = Object.assign({
	        responseType: 'arraybuffer'
	      }, this.getCredentialOptions(false));

	      return this.loadResourceFromUrl(url, requestOpts, function (response) {
	        return _lie2.default.resolve({
	          data: response,
	          properties: {}
	        });
	      }, progressFn);
	    }

	    /**
	     * Load an image asset.
	     * @method loadImage
	     * @private
	     * @param {Box3DAsset} asset The asset to load.
	     * @param {Object} options Loading options (@see Box3DResourceLoader.prototype.load()).
	     * @param {Function} [progressFn] The progress callback.
	     * @returns {Promise} A promise that resolves the image data.
	     */

	  }, {
	    key: 'loadImage',
	    value: function loadImage(asset, options, progressFn) {
	      var _this3 = this;

	      var representation = this.findImageRepresentation(asset, options);
	      if (!representation) {
	        return _lie2.default.reject(new Error('No matching representations found'));
	      }

	      var responseType = this.getImageResponseType(representation.compression);
	      var credentials = this.getCredentialOptions(representation.isExternal);
	      var requestOptions = Object.assign({ responseType: responseType }, credentials);

	      if (representation.isExternal) {
	        return this.sdkLoader.xhr.get(representation.src, progressFn, requestOptions).then(function (xhr) {
	          return _this3.processImage(xhr.response, representation);
	        });
	      }

	      var url = void 0;

	      try {
	        url = this.modifyImageUrl(representation.src);
	      } catch (err) {
	        return _lie2.default.reject(err);
	      }

	      return this.loadResourceFromUrl(url, requestOptions, function (response) {
	        return _this3.processImage(response, representation);
	      }, progressFn);
	    }

	    /**
	     * Returns a promise that loads data from the specified URL.
	     * @method loadResourceFromUrl
	     * @private
	     * @param {String} url The URL to load.
	     * @param {Object} options Loading options (@see Box3DResourceLoader.prototype.load()).
	     * @param {Function} processFn Called with the XmlHttpRequest response for post-processing.
	     * @param {Function} [progressFn] The progress callback.
	     * @returns {Promise} A promise that resolves with the loaded data.
	     */

	  }, {
	    key: 'loadResourceFromUrl',
	    value: function loadResourceFromUrl(url) {
	      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	      var _this4 = this;

	      var processFn = arguments[2];
	      var progressFn = arguments[3];

	      if (progressFn) {
	        this.addProgressListener(url, progressFn);
	      }

	      var optionsEx = Object.assign({ url: url }, options);

	      // If the representation is cached, return the cached data; otherwise, get
	      // the representation.
	      if (!this.cache.hasOwnProperty(url)) {
	        this.cache[url] = this.sdkLoader.getRepresentation(url, this.onLoadProgress.bind(this), optionsEx).then(function (xhr) {
	          _this4.removeProgressListeners(url);
	          return processFn(xhr.response);
	        }).catch(function (err) {
	          _this4.removeProgressListeners(url);
	          return _lie2.default.reject(err);
	        });
	      }

	      return this.cache[url];
	    }

	    /**
	     * Given a compression type for a representation (e.g. 'jpeg', 'dxt', etc.),
	     * return the response type that is expected (e.g. 'blob' or 'arraybuffer').
	     * @method getImageResponseType
	     * @public
	     * @param {String} compression The compression type for the representation ('jpeg', 'dxt', etc.).
	     * @returns {String} Either 'blob' or 'arraybuffer'.
	     */

	  }, {
	    key: 'getImageResponseType',
	    value: function getImageResponseType(compression) {
	      switch (compression) {
	        case COMPRESSION_TYPE.DXT:
	        case COMPRESSION_TYPE.DXT1:
	        case COMPRESSION_TYPE.DXT5:
	          return 'arraybuffer';
	      }

	      return 'blob';
	    }

	    /**
	     * Find the image representation that best matches the specified criteria.
	     * @method findImageRepresentation
	     * @private
	     * @param {Box3DAsset} asset The image asset.
	     * @param {Object} options Loading options (@see Box3DResourceLoader.prototype.load()).
	     * @returns {Object} the representation that best matches the search criteria or null if none were
	     * found.
	     */

	  }, {
	    key: 'findImageRepresentation',
	    value: function findImageRepresentation(asset) {
	      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	      var representations = asset.get('representations');
	      if (!representations || representations.length === 0) {
	        return null;
	      }

	      var optionsEx = Object.assign({ maxSize: MAX_IMAGE_SIZE }, options);

	      // Get closest match for compression param. Compression will either match exactly or fall back
	      // to 'none'.
	      var compressionMatches = representations.filter(function (image) {
	        if (image.compression === optionsEx.compression) {
	          return true;
	        }

	        switch (image.compression) {
	          case COMPRESSION_TYPE.ZIP:
	          case COMPRESSION_TYPE.JPEG:
	            return !optionsEx.compression;

	          case COMPRESSION_TYPE.DXT:
	          case COMPRESSION_TYPE.DXT1:
	          case COMPRESSION_TYPE.DXT5:
	            return optionsEx.compression === COMPRESSION_TYPE.DXT;
	        }

	        return false;
	      });

	      // If no matches for the supplied compression exist, try to find the regular images (png or
	      // jpg).
	      if (compressionMatches.length === 0) {
	        compressionMatches = representations.filter(function (image) {
	          return image.compression === COMPRESSION_TYPE.ZIP || image.compression === COMPRESSION_TYPE.JPEG;
	        });
	      }

	      var formatMatches = compressionMatches.filter(function (image) {
	        var channels = image.channels || DEFAULT_CHANNELS;
	        return !optionsEx.channels || channels.toString() === optionsEx.channels.toString();
	      });

	      if (formatMatches.length === 0) {
	        formatMatches = compressionMatches;
	      }

	      // For each match, compute the difference between its size and the max size.
	      var sizeDiffs = formatMatches.map(function (image) {
	        return optionsEx.maxSize - Math.max(image.width || 1, image.height || 1);
	      });

	      // Find the index of the minimum, *positive* “diff”. This is equivalent to the largest image
	      // that is less than or equal to the max specified.
	      var bestIdx = sizeDiffs.reduce(function (bestIdx, currentDiff, currentIdx) {
	        var bestDiff = bestIdx >= 0 ? sizeDiffs[bestIdx] : Number.MAX_VALUE;
	        return currentDiff >= 0 && currentDiff < bestDiff ? currentIdx : bestIdx;
	      }, -1);

	      // Locate the match.
	      return bestIdx >= 0 ? formatMatches[bestIdx] : null;
	    }

	    /**
	     * Post-processes an image response, resolving to an object that contains an
	     * Image or an ArrayBuffer.
	     * @method processImage
	     * @private
	     * @param {Object} response An XHR response object.
	     * @param {Object} representation The image representation that was loaded.
	     * @returns {Promise} A promise that resolves the image data.
	     */

	  }, {
	    key: 'processImage',
	    value: function processImage(response, representation) {
	      return new _lie2.default(function (resolve, reject) {
	        var data = {
	          properties: {
	            compression: representation.compression,
	            channels: representation.channels || DEFAULT_CHANNELS
	          }
	        };

	        if (response instanceof ArrayBuffer) {
	          data.data = response;
	          data.properties.width = representation.width;
	          data.properties.height = representation.height;
	          return resolve(data);
	        }

	        if (response instanceof Blob) {
	          try {
	            (function () {
	              var url = URL.createObjectURL(response);
	              var img = new Image();

	              img.onload = function () {
	                data.data = img;
	                data.properties.width = img.width;
	                data.properties.height = img.height;
	                return resolve(data);
	              };

	              img.src = url;
	            })();
	          } catch (err) {
	            return reject(err);
	          }
	        } else {
	          return reject(new Error('Image data has unexpected type'));
	        }
	      });
	    }

	    /**
	     * Abort all requests associated with the specified key.
	     * @method abortRequest
	     * @public
	     * @param {String} key The key of the XHR to abort.
	     * @returns {void}
	     */

	  }, {
	    key: 'abortRequest',
	    value: function abortRequest(key) {
	      this.removeProgressListeners(key);
	      this.sdkLoader.xhr.abortRequest(key);
	    }

	    /**
	     * Abort all requests.
	     * @method abortRequests
	     * @public
	     * @returns {void}
	     */

	  }, {
	    key: 'abortRequests',
	    value: function abortRequests() {
	      var _this5 = this;

	      // Clear all progress listeners.
	      Object.keys(this.progressListeners).forEach(function (key) {
	        _this5.removeProgressListeners(key);
	      });

	      this.sdkLoader.xhr.abortRequests();
	    }

	    /**
	     * Free resources used by this loader. After calling this method, the loader can no longer be
	     * used.
	     * @method destroy
	     * @public
	     * @returns {void}
	     */

	  }, {
	    key: 'destroy',
	    value: function destroy() {
	      this.abortRequests();
	      delete this.sdkLoader;
	      delete this.boxSdk;
	      delete this.cache;
	      delete this.gzipSizes;
	    }
	  }]);

	  return BaseLoader;
	}();

	exports.default = BaseLoader;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';
	var immediate = __webpack_require__(6);

	/* istanbul ignore next */
	function INTERNAL() {}

	var handlers = {};

	var REJECTED = ['REJECTED'];
	var FULFILLED = ['FULFILLED'];
	var PENDING = ['PENDING'];
	/* istanbul ignore else */
	if (!process.browser) {
	  // in which we actually take advantage of JS scoping
	  var UNHANDLED = ['UNHANDLED'];
	}

	module.exports = exports = Promise;

	function Promise(resolver) {
	  if (typeof resolver !== 'function') {
	    throw new TypeError('resolver must be a function');
	  }
	  this.state = PENDING;
	  this.queue = [];
	  this.outcome = void 0;
	  /* istanbul ignore else */
	  if (!process.browser) {
	    this.handled = UNHANDLED;
	  }
	  if (resolver !== INTERNAL) {
	    safelyResolveThenable(this, resolver);
	  }
	}

	Promise.prototype.catch = function (onRejected) {
	  return this.then(null, onRejected);
	};
	Promise.prototype.then = function (onFulfilled, onRejected) {
	  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
	    typeof onRejected !== 'function' && this.state === REJECTED) {
	    return this;
	  }
	  var promise = new this.constructor(INTERNAL);
	  /* istanbul ignore else */
	  if (!process.browser) {
	    if (this.handled === UNHANDLED) {
	      this.handled = null;
	    }
	  }
	  if (this.state !== PENDING) {
	    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
	    unwrap(promise, resolver, this.outcome);
	  } else {
	    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
	  }

	  return promise;
	};
	function QueueItem(promise, onFulfilled, onRejected) {
	  this.promise = promise;
	  if (typeof onFulfilled === 'function') {
	    this.onFulfilled = onFulfilled;
	    this.callFulfilled = this.otherCallFulfilled;
	  }
	  if (typeof onRejected === 'function') {
	    this.onRejected = onRejected;
	    this.callRejected = this.otherCallRejected;
	  }
	}
	QueueItem.prototype.callFulfilled = function (value) {
	  handlers.resolve(this.promise, value);
	};
	QueueItem.prototype.otherCallFulfilled = function (value) {
	  unwrap(this.promise, this.onFulfilled, value);
	};
	QueueItem.prototype.callRejected = function (value) {
	  handlers.reject(this.promise, value);
	};
	QueueItem.prototype.otherCallRejected = function (value) {
	  unwrap(this.promise, this.onRejected, value);
	};

	function unwrap(promise, func, value) {
	  immediate(function () {
	    var returnValue;
	    try {
	      returnValue = func(value);
	    } catch (e) {
	      return handlers.reject(promise, e);
	    }
	    if (returnValue === promise) {
	      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
	    } else {
	      handlers.resolve(promise, returnValue);
	    }
	  });
	}

	handlers.resolve = function (self, value) {
	  var result = tryCatch(getThen, value);
	  if (result.status === 'error') {
	    return handlers.reject(self, result.value);
	  }
	  var thenable = result.value;

	  if (thenable) {
	    safelyResolveThenable(self, thenable);
	  } else {
	    self.state = FULFILLED;
	    self.outcome = value;
	    var i = -1;
	    var len = self.queue.length;
	    while (++i < len) {
	      self.queue[i].callFulfilled(value);
	    }
	  }
	  return self;
	};
	handlers.reject = function (self, error) {
	  self.state = REJECTED;
	  self.outcome = error;
	  /* istanbul ignore else */
	  if (!process.browser) {
	    if (self.handled === UNHANDLED) {
	      immediate(function () {
	        if (self.handled === UNHANDLED) {
	          process.emit('unhandledRejection', error, self);
	        }
	      });
	    }
	  }
	  var i = -1;
	  var len = self.queue.length;
	  while (++i < len) {
	    self.queue[i].callRejected(error);
	  }
	  return self;
	};

	function getThen(obj) {
	  // Make sure we only access the accessor once as required by the spec
	  var then = obj && obj.then;
	  if (obj && typeof obj === 'object' && typeof then === 'function') {
	    return function appyThen() {
	      then.apply(obj, arguments);
	    };
	  }
	}

	function safelyResolveThenable(self, thenable) {
	  // Either fulfill, reject or reject with error
	  var called = false;
	  function onError(value) {
	    if (called) {
	      return;
	    }
	    called = true;
	    handlers.reject(self, value);
	  }

	  function onSuccess(value) {
	    if (called) {
	      return;
	    }
	    called = true;
	    handlers.resolve(self, value);
	  }

	  function tryToUnwrap() {
	    thenable(onSuccess, onError);
	  }

	  var result = tryCatch(tryToUnwrap);
	  if (result.status === 'error') {
	    onError(result.value);
	  }
	}

	function tryCatch(func, value) {
	  var out = {};
	  try {
	    out.value = func(value);
	    out.status = 'success';
	  } catch (e) {
	    out.status = 'error';
	    out.value = e;
	  }
	  return out;
	}

	exports.resolve = resolve;
	function resolve(value) {
	  if (value instanceof this) {
	    return value;
	  }
	  return handlers.resolve(new this(INTERNAL), value);
	}

	exports.reject = reject;
	function reject(reason) {
	  var promise = new this(INTERNAL);
	  return handlers.reject(promise, reason);
	}

	exports.all = all;
	function all(iterable) {
	  var self = this;
	  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
	    return this.reject(new TypeError('must be an array'));
	  }

	  var len = iterable.length;
	  var called = false;
	  if (!len) {
	    return this.resolve([]);
	  }

	  var values = new Array(len);
	  var resolved = 0;
	  var i = -1;
	  var promise = new this(INTERNAL);

	  while (++i < len) {
	    allResolver(iterable[i], i);
	  }
	  return promise;
	  function allResolver(value, i) {
	    self.resolve(value).then(resolveFromAll, function (error) {
	      if (!called) {
	        called = true;
	        handlers.reject(promise, error);
	      }
	    });
	    function resolveFromAll(outValue) {
	      values[i] = outValue;
	      if (++resolved === len && !called) {
	        called = true;
	        handlers.resolve(promise, values);
	      }
	    }
	  }
	}

	exports.race = race;
	function race(iterable) {
	  var self = this;
	  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
	    return this.reject(new TypeError('must be an array'));
	  }

	  var len = iterable.length;
	  var called = false;
	  if (!len) {
	    return this.resolve([]);
	  }

	  var i = -1;
	  var promise = new this(INTERNAL);

	  while (++i < len) {
	    resolver(iterable[i]);
	  }
	  return promise;
	  function resolver(value) {
	    self.resolve(value).then(function (response) {
	      if (!called) {
	        called = true;
	        handlers.resolve(promise, response);
	      }
	    }, function (error) {
	      if (!called) {
	        called = true;
	        handlers.reject(promise, error);
	      }
	    });
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(5)))

/***/ },
/* 5 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {'use strict';
	var Mutation = global.MutationObserver || global.WebKitMutationObserver;

	var scheduleDrain;

	if (process.browser) {
	  if (Mutation) {
	    var called = 0;
	    var observer = new Mutation(nextTick);
	    var element = global.document.createTextNode('');
	    observer.observe(element, {
	      characterData: true
	    });
	    scheduleDrain = function () {
	      element.data = (called = ++called % 2);
	    };
	  } else if (!global.setImmediate && typeof global.MessageChannel !== 'undefined') {
	    var channel = new global.MessageChannel();
	    channel.port1.onmessage = nextTick;
	    scheduleDrain = function () {
	      channel.port2.postMessage(0);
	    };
	  } else if ('document' in global && 'onreadystatechange' in global.document.createElement('script')) {
	    scheduleDrain = function () {

	      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
	      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
	      var scriptEl = global.document.createElement('script');
	      scriptEl.onreadystatechange = function () {
	        nextTick();

	        scriptEl.onreadystatechange = null;
	        scriptEl.parentNode.removeChild(scriptEl);
	        scriptEl = null;
	      };
	      global.document.documentElement.appendChild(scriptEl);
	    };
	  } else {
	    scheduleDrain = function () {
	      setTimeout(nextTick, 0);
	    };
	  }
	} else {
	  scheduleDrain = function () {
	    process.nextTick(nextTick);
	  };
	}

	var draining;
	var queue = [];
	//named nextTick for less confusing stack traces
	function nextTick() {
	  draining = true;
	  var i, oldQueue;
	  var len = queue.length;
	  while (len) {
	    oldQueue = queue;
	    queue = [];
	    i = -1;
	    while (++i < len) {
	      oldQueue[i]();
	    }
	    len = queue.length;
	  }
	  draining = false;
	}

	module.exports = immediate;
	function immediate(task) {
	  if (queue.push(task) === 1 && !draining) {
	    scheduleDrain();
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(5)))

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	var _baseLoader = __webpack_require__(3);

	var _baseLoader2 = _interopRequireDefault(_baseLoader);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Concrete sub-class of BaseLoader that loads assets using run-modes.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */


	var RunmodeLoader = function (_BaseLoader) {
	  _inherits(RunmodeLoader, _BaseLoader);

	  /**
	   * Used for loading Box3D assets with Box run-modes.
	   * @constructor
	   * @param {BoxSDK} boxSdk An instance of BoxSDK.
	   */

	  function RunmodeLoader(boxSdk) {
	    _classCallCheck(this, RunmodeLoader);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(RunmodeLoader).call(this, boxSdk));
	  }

	  /** @inheritdoc */


	  _createClass(RunmodeLoader, [{
	    key: 'modifyBufferUrl',
	    value: function modifyBufferUrl(url) {
	      var urlTokens = url.match(/^(.*)geometry.bin$/);
	      if (!urlTokens) {
	        throw new Error('Unexpected buffer URL format: ' + url);
	      }

	      var baseUrl = urlTokens[1];
	      return baseUrl + '3dcg_bin.bin';
	    }

	    /** @inheritdoc */

	  }, {
	    key: 'modifyImageUrl',
	    value: function modifyImageUrl(url) {
	      // This code assumes that url is actually the fully qualified path.
	      // Convert V2 src to runmode path
	      // (e.g., images/1024/0.jpg -> 3dcg_image_1024_jpg/0.jpg)
	      var urlTokens = url.match(/^(.*)images\/(\d+)\/(\d+)\.(.+)$/);
	      if (!urlTokens) {
	        // Try to match this form - images/1024/rgbe/0.jpg
	        urlTokens = url.match(/^(.*)images\/(\d+)\/(\w+)\/(\d+)\.(.+)$/);
	        if (!urlTokens) {
	          throw new Error('Unexpected image URL format: ' + url);
	        }
	      }

	      var length = urlTokens.length;
	      var filename = urlTokens[length - 2] + '.' + urlTokens[length - 1];
	      var fileExtension = urlTokens[length - 1];

	      var baseUrl = urlTokens[1];
	      var folder1 = urlTokens[2];
	      var folder2 = urlTokens.length > 5 ? '_' + urlTokens[3] : '';

	      // Construct the runmode URL.
	      return baseUrl + '3dcg_image_' + folder1 + folder2 + '_' + fileExtension + '/' + filename;
	    }

	    /** @inheritdoc */

	  }, {
	    key: 'getGzippedLength',
	    value: function getGzippedLength(xhr, url) {
	      return _get(Object.getPrototypeOf(RunmodeLoader.prototype), 'getGzippedLength', this).call(this, xhr, url, { withCredentials: true });
	    }
	  }]);

	  return RunmodeLoader;
	}(_baseLoader2.default);

	exports.default = RunmodeLoader;

/***/ }
/******/ ]);