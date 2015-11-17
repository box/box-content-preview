/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {'use strict';

  var RepresentationLoaderRM = __webpack_require__(1),
      RepresentationLoaderV2 = __webpack_require__(7);

  function BoxSDK() {
    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    if (opts.hasOwnProperty('token')) {
      // use V2 client
      this.representationLoader = new RepresentationLoaderV2(opts);
    } else {
      // use runmode client
      this.representationLoader = new RepresentationLoaderRM(opts);
    }
  }

  BoxSDK.prototype.loadRepresentation = function (fileId, fileVersionId, repType, progress) {
    return this.representationLoader.load.apply(this.representationLoader, arguments);
  };

  BoxSDK.prototype.destroy = function () {
    this.representationLoader.destroy();
    delete this.representationLoader;
  };

  global.BoxSDK = BoxSDK;
  module.exports = BoxSDK;
  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

  /**
  * The Representation Loader Client that can be used Box Runmodes
  */

  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  var _lie = __webpack_require__(2);

  var _lie2 = _interopRequireDefault(_lie);

  var _baseRepresentationLoader = __webpack_require__(5);

  var _baseRepresentationLoader2 = _interopRequireDefault(_baseRepresentationLoader);

  var FILE_ASSOC_URL = '/index.php?rm=preview_file_association';

  var RepresentationLoaderRM = (function (_BaseLoader) {
    _inherits(RepresentationLoaderRM, _BaseLoader);

    /**
    * @param string fileId The file ID of the asset we are loading from(ie, the OBJ)
    * @param float pollTime When a file is converting, how long to wait before fetching again
    */

    function RepresentationLoaderRM() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      _classCallCheck(this, RepresentationLoaderRM);

      _get(Object.getPrototypeOf(RepresentationLoaderRM.prototype), 'constructor', this).call(this, opts.apiBase);

      //for creating URLs with a shared name appended
      this.sharedName = opts.sharedName;
    }

    /** Hit the file association runmode to get the file ids of the requested file! Cache any results!
    * @param string filePath Path to associate with a file id set
    * @param string baseFileId The file id to base File association lookup from
    * @param Object data Additional data to send with GET
    * @return Promise A promise whos resolution recieves an object containing the relevant file and file version ids
    */

    _createClass(RepresentationLoaderRM, [{
      key: 'fetchFileIds',
      value: function fetchFileIds(filePath, baseFileId, data) {
        var _this = this;

        if (!filePath) {
          return _lie2['default'].reject(new Error('No File Path Passed to Fetch File ID!'));
        }

        // Check cache for file ids
        var ids = this.getFromCache(filePath);
        if (ids) {
          return _lie2['default'].resolve(ids);
        }

        data = data || {};
        data.filePaths = {
          item: filePath
        };
        data.fileId = baseFileId;
        var url = this.apiBase + FILE_ASSOC_URL + this.xhr.encodeToUri(data);

        return new _lie2['default'](function (resolve, reject) {

          _this.fetch(url).then(function (xhr) {
            if (xhr.status === 200) {

              var data = JSON.parse(xhr.response);

              if (data.item) {
                _this.addToCache(filePath, data.item.fileId, data.item.fileVersionId);
                resolve(_this.getFromCache(filePath));
              } else {
                reject(new Error('No file association for: ' + filePath));
              }
            } else {
              reject(new Error(xhr.statusText));
            }
          })['catch'](reject);
        });
      }

      /** Build the appropriate url to load the representation
       * @param {string} fileId The ID of the file we are going to load
       * @param {string} fileVersion The file version id of the representation
       * @param {string} repParams The representation parameters we want to get!
       * @return {string} Url to hit, for representation
      */
    }, {
      key: 'buildRepresentationUrl',
      value: function buildRepresentationUrl(fileId, fileVersion, repParams) {

        if (!fileVersion || !repParams) {
          throw new Error('Insufficient arguments for building asset url. File Version: ' + fileVersion + ' RepParams: ' + repParams);
        }

        return this.apiBase + '/representation/file_version_' + fileVersion + '/' + repParams;
      }

      /**
      * Just a workaround for fetch, since we aren't ready to use the stream api for progress
      * @param string url The url we want to fetch!
      * @param Object init The fetch request initializer object. Used to fake being closer to fetch(when ready)
      * @return Promise A Promise that resolves with the XHR object after being fetched
      */
    }, {
      key: 'fetch',
      value: function fetch(url, params, progress) {
        if (params === undefined) params = { withCredentials: true, responseType: null };

        if (this.sharedName) {
          url = this.appendSharedName(url);
        }

        return _get(Object.getPrototypeOf(RepresentationLoaderRM.prototype), 'fetch', this).call(this, url, progress, params);
      }

      /**
      * given the url, append a shared name
      * @param string url The URL to check and then append a shared name to
      * @return string The newly formatted URL for you to load!
      */
    }, {
      key: 'appendSharedName',
      value: function appendSharedName(url) {
        //check for correct parameter endings
        var paramSymbol = url.indexOf('?') > 0 ? '&' : '?';
        return url + paramSymbol + 'shared_name=' + this.sharedName;
      }

      /**
      * Destructor
      * @returns {void}
      */
    }, {
      key: 'destroy',
      value: function destroy() {
        _get(Object.getPrototypeOf(RepresentationLoaderRM.prototype), 'destroy', this).call(this);
        delete this.sharedName;
      }
    }]);

    return RepresentationLoaderRM;
  })(_baseRepresentationLoader2['default']);

  module.exports = RepresentationLoaderRM;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(process) {'use strict';
  var immediate = __webpack_require__(4);

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
      if (typeof onRejected === 'function' && this.handled === UNHANDLED) {
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

  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(3)))

/***/ },
/* 3 */
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
              currentQueue[queueIndex].run();
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

  // TODO(shtylman)
  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
  };
  process.umask = function() { return 0; };


/***/ },
/* 4 */
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

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(3)))

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

  /**
  * The Base Representation Loader that future clients need to extend
  */

  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var _lie = __webpack_require__(2);

  var _lie2 = _interopRequireDefault(_lie);

  var _xhr = __webpack_require__(6);

  var _xhr2 = _interopRequireDefault(_xhr);

  var BaseRepresentationLoader = (function () {

    /**
    * @param {string} apiBase The base url for all API calls
    */

    function BaseRepresentationLoader(apiBase) {
      _classCallCheck(this, BaseRepresentationLoader);

      this.apiBase = apiBase || '';

      //cache of file and version ids!
      this.idCache = {};

      this.xhr = new _xhr2['default']();
    }

    /**
     * @param string fileId The file id or file version id to load
     * @param string repType The type of representation we want to load. IE) image_1024_jpg/1.jpg
     * @param Function progress Callback on progress events OPTIONAL
     * @return Promise. When resolved, receives a response. Response holds data that consumer must parse
    */

    _createClass(BaseRepresentationLoader, [{
      key: 'load',
      value: function load(fileId, fileVersionId, repType, progress) {
        var _this = this;

        var url = this.buildRepresentationUrl(fileId, fileVersionId, repType);

        return new _lie2['default'](function (resolve, reject) {
          _this.fetchRepresentation(url, progress).then(resolve)['catch'](reject);
        });
      }

      /**
       * load a representation and return its raw data
       * @param string url The url to load that belongs to the representation
       * @return Promise The promise who's resolution is given the raw data
      */
    }, {
      key: 'fetchRepresentation',
      value: function fetchRepresentation(url, progress) {
        var _this2 = this;

        var params = arguments.length <= 2 || arguments[2] === undefined ? { responseType: 'arraybuffer' } : arguments[2];

        return new _lie2['default'](function (resolve, reject) {

          _this2.fetch(url, params, progress).then(function (xhr) {
            switch (xhr.status) {
              case 200:
                // found, yay
                resolve(xhr);
                break;
              case 404: // nope
              default:
                reject(new Error('Issue Loading ' + url));
            }
          })['catch'](reject);
        });
      }

      /** Hit the file association runmode to get the file ids of the requested file! Cache any results!
      * @param string filePath Path to associate with a file id set
      * @param Object data Additional data to send with GET
      * @return Promise A promise whos resolution recieves an object containing the relevant file and file version ids
      */
    }, {
      key: 'fetchFileIds',
      value: function fetchFileIds() /*filePath, data*/{
        throw new Error('fetchFileIds() has not been implemented');
      }

      /** Build the appropriate url to load the representation
       * @param {string} fileId The ID of the file we are going to load
       * @param {string} fileVersion The file version id of the representation
       * @param {string} repParams The representation parameters we want to get!
       * @return {string} Url to hit, for representation
      */
    }, {
      key: 'buildRepresentationUrl',
      value: function buildRepresentationUrl() /*fileId, fileVersion, repParams*/{
        throw new Error('buildRepresentationUrl() has not been implemented');
      }

      /** Overwrite request URL base
       * @param string url New url to use for requests
       * @return void
      */
    }, {
      key: 'setApiBase',
      value: function setApiBase(url) {

        this.apiBase = url;
      }

      /** Add file and versions ids in the cache
       * @param string path Path to associate with the cahced ids
       * @param string id The file id of the Box Representation
       * @param string versionId The File Version ID of the Box Representation
       * @return void
      */
    }, {
      key: 'addToCache',
      value: function addToCache(path, id, versionId) {

        if (!this.idCache[path]) {
          this.idCache[path] = {};
        }

        //note, this will overwrite the old ids, if present
        this.idCache[path].fileId = id;
        this.idCache[path].fileVersionId = versionId;
      }

      /** Get file and version ids from the cache
       * @param
       * @return Object Object from cache containing the file id and file version id
      */
    }, {
      key: 'getFromCache',
      value: function getFromCache(path) {
        return this.idCache[path] || null;
      }

      /**
      * Just a workaround for fetch, since we aren't ready to use the stream api for progress
      * @param string url The url we want to fetch!
      * @param Object init The fetch request initializer object. Used to fake being closer to fetch(when ready)
      * @return Promise A Promise that resolves with the XHR object after being fetched
      */
    }, {
      key: 'fetch',
      value: function fetch(url, params, progress) {
        if (params === undefined) params = { withCredentials: true, responseType: null };

        return this.xhr.get(url, progress, params);
      }

      /**
      * Destructor
      * @returns {void}
      */
    }, {
      key: 'destroy',
      value: function destroy() {
        delete this.apiBase;

        var i = undefined;
        for (i in this.idCache) {
          delete this.idCache[i];
        }
        delete this.idCache;
      }
    }]);

    return BaseRepresentationLoader;
  })();

  module.exports = BaseRepresentationLoader;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var _lie = __webpack_require__(2);

  var _lie2 = _interopRequireDefault(_lie);

  var XHR = (function () {
    function XHR(token) {
      _classCallCheck(this, XHR);

      this.token = token;
      // keep track of requests so that we can abort, if need be
      this.requests = {};
      // for adding uniqueness to each request key
      this.requestCount = 0;
    }

    /**
    * All XHR requests will be tracked by their URL
    * @private
    * @param {object} xhr The XHR object that we want to track
    * @param {string} url The url of the request, we'll use this to construct a key
    * @param {string | null} key Optional key to store the xhr request at. Used for explicit xhr abortion
    * @return {string} The key at which the request is stored
    */

    _createClass(XHR, [{
      key: 'addRequest',
      value: function addRequest(xhr, url, key) {
        if (!key) {
          do {
            key = url + '-' + this.requestCount;
            this.requestCount++;
          } while (this.requests.hasOwnProperty(key));
        }
        //check uniqueness
        if (this.requests.hasOwnProperty(key)) {
          throw new Error('Non-unique XHR Key');
        }

        this.requests[key] = xhr;
        return key;
      }

      /**
      * Remove an xhr from the request object, on completion
      * @private
      * @param {string} key The key at qhich to remove the request
      * @return {void}
      */
    }, {
      key: 'removeRequest',
      value: function removeRequest(key) {
        delete this.requests[key];
      }

      /**
      * Abort a single request, by key
      * @param {string} key The key that the xhr has been stored at
      * @return {Object} The aborted XHR request
      */
    }, {
      key: 'abortRequest',
      value: function abortRequest(key) {
        var xhr = this.requests[key];
        if (!xhr) {
          return;
        }
        this.removeRequest(key);
        xhr.abort();
        return xhr;
      }

      /**
      * Abort all XHR requests
      * @return void
      */
    }, {
      key: 'abortRequests',
      value: function abortRequests() {
        for (var reqKey in this.requests) {
          this.abortRequest(reqKey);
        }
      }

      /**
      * Make a general AJAX request, with full control
      * @param {string} url The url to make a request to
      * @param {string} method The ajax method to use
      * @param {string|FormData} params Any parameters that need to be sent with a request
      * THEY MUST BE APPROPRIATE ie)Encoded paramters.
      * @param {object} options Any optional data that we want to use with the request
      * ie) a property of info will be attached to the xhr created here, responseType
      * will change the response type of the request, and xhrKey will allow for manual xhr abortion
      * @param {function} progress The callback that runs on AJAX progress
      * @returns {Promise} A Promsie that resolves in the xhr response
      */
    }, {
      key: 'makeRequest',
      value: function makeRequest(url, method, params, progress) {
        if (method === undefined) method = 'GET';
        if (params === undefined) params = null;

        var _this = this;

        var options = arguments.length <= 4 || arguments[4] === undefined ? { withCredentials: true, xhrKey: null, responseType: null, info: null, headers: null } : arguments[4];

        if (!url) {
          return _lie2['default'].reject(new Error('No URL provided'));
        }

        return new _lie2['default'](function (resolve, reject) {
          var xhr = new XMLHttpRequest();

          var key = _this.addRequest(xhr, url, options.xhrKey);

          if (options.info) {
            xhr.info = options.info;
          }

          xhr.addEventListener('error', function (err) {
            _this.removeRequest(key);
            reject(err);
          });

          xhr.addEventListener('load', function () {

            var status = xhr.status;

            // Status codes relevant to BoxSDK
            if (status === 200 || status === 202 || status === 404) {
              resolve(xhr);
            }

            _this.removeRequest(key);
          });

          if (progress && typeof progress === 'function') {
            (function () {

              var onProgress = function onProgress(event) {
                progress(_this.getLoadStatus(event));
              };

              xhr.addEventListener('progress', onProgress);

              xhr.addEventListener('abort', function () {
                xhr.removeEventListener('progress', onProgress);
              });
            })();
          }

          xhr.open(method, url);
          if (options.responseType) {
            xhr.responseType = options.responseType;
          }
          // add any custom headers
          if (options.headers) {
            for (var header in options.headers) {
              xhr.setRequestHeader(header, options.headers[header]);
            }
          }

          if (_this.token) {
            xhr.setRequestHeader('authorization', 'Bearer ' + _this.token);
          } else {
            xhr.withCredentials = options.withCredentials !== undefined ? options.withCredentials : true;
          }

          xhr.send(params);
        });
      }

      /**
      * Make a get request
      * @public
      * @param {string} url The url we want to GET
      * @param {function} progress The progress function to call, on xhr progress
      * @param {object} options The options to apply to the request XHR
      * @returns {Promise} Resolves with the response data
      */
    }, {
      key: 'get',
      value: function get(url, progress, options) {
        return this.makeRequest(url, 'GET', null, progress, options);
      }

      /**
      * Make a post request
      * @public
      * @param {string} url The url we want to post to
      * @param {object} params Any parameters to send with the XHR. Must be valid data
      * @param {function} progress  The progress function to call, on xhr progress
      * @param {object} options The options to apply to the request XHR
      * @returns {Promise} Resolves with the response data
      */
    }, {
      key: 'post',
      value: function post(url, params, progress, options) {
        return this.makeRequest(url, 'POST', params, progress, options);
      }

      /** Build a valid url for a GET request, from a base string and a JSON object
      * @param {Object} data The object we want to encode
      * @returns {string} Url with query params
      */
    }, {
      key: 'encodeToUri',
      value: function encodeToUri(data) {

        if (!data) {
          return;
        }

        var keys = Object.keys(data),
            len = keys.length,
            i = 0,
            encodedUri = '';

        for (i; i < len; ++i) {

          encodedUri += '&' + keys[i] + '=';

          var val = data[keys[i]];

          if (typeof val === 'object') {
            val = JSON.stringify(val);
          }

          encodedUri += encodeURIComponent(val);
        }

        return encodedUri;
      }

      /**
      * get the size of the content, given a response (taken from Box3D Engine)
      * @param XHR xhr The fetch response
      * @return int Size of asset, in bytes
      */
    }, {
      key: 'getContentLength',
      value: function getContentLength(xhr) {
        var lengthStr = xhr.getResponseHeader('Content-Length');
        return parseInt(lengthStr, 10);
      }

      /**
      * Respond with a status object for progress events!
      * @param event the progress event that contains loaded data
      * @param xhr the XHR object to recieve header data from
      * @returns status object that contains the total size of the asset we are loading,
      * the number of bytes currently loaded, and the response XHR
      */
    }, {
      key: 'getLoadStatus',
      value: function getLoadStatus(event) {
        var status = {
          total: 0,
          loaded: 0,
          xhr: event
        };

        if (event.lengthComputable && event.target) {
          status.total = this.getContentLength(event.target);
        }

        status.loaded = event.loaded;

        return status;
      }

      /**
      * Return the list of current requests
      * @returns {object} The current requests being made
      */
    }, {
      key: 'getCurrentRequests',
      value: function getCurrentRequests() {
        return this.requests;
      }

      /**
      * Set the Oauth2 token for all requests to use
      * @param {string} token The Oauth2 token to use
      * @returns {void}
      */
    }, {
      key: 'setAuthToken',
      value: function setAuthToken(authToken) {
        this.token = authToken;
      }
    }]);

    return XHR;
  })();

  exports['default'] = XHR;
  module.exports = exports['default'];

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  var _lie = __webpack_require__(2);

  var _lie2 = _interopRequireDefault(_lie);

  var _search = __webpack_require__(8);

  var _search2 = _interopRequireDefault(_search);

  var _baseRepresentationLoader = __webpack_require__(5);

  var _baseRepresentationLoader2 = _interopRequireDefault(_baseRepresentationLoader);

  var API_BASE = 'https://api.box.com';

  var RepresentationLoaderV2 = (function (_BaseLoader) {
    _inherits(RepresentationLoaderV2, _BaseLoader);

    /**
    * @param string fileId The file ID of the asset we are loading from(ie, the OBJ)
    * @param float pollTime When a file is converting, how long to wait before fetching again
    */

    function RepresentationLoaderV2() {
      var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      _classCallCheck(this, RepresentationLoaderV2);

      if (!opts.token) {
        throw new Error('No OAuth Token Provided!');
      }

      _get(Object.getPrototypeOf(RepresentationLoaderV2.prototype), 'constructor', this).call(this, opts.apiBase || API_BASE);

      this.xhr.setAuthToken(opts.token);

      this.search = new _search2['default'](this.xhr, this.apiBase);
    }

    /**
    * Just a workaround for fetch, since we aren't ready to use the stream api for progress
    * @param string url The url we want to fetch!
    * @param Object init The fetch request initializer object. Used to fake being closer to fetch(when ready)
    * @return Promise A Promise that resolves with the XHR object after being fetched
    */

    _createClass(RepresentationLoaderV2, [{
      key: 'fetch',
      value: function fetch(url, params, progress) {

        if (this.sharedName) {
          url = this.appendSharedName(url);
        }

        params = params || {};
        params.withCredentials = false;
        return this.xhr.get(url, progress, params);
      }

      /**
      * From the path name, extract the file name and parent folders names
      * @param {string} pathName The path name to split into directories and the file name
      * @returns {array} list Parent folder names and the name of the
      */
    }, {
      key: 'extractDirectoryNames',
      value: function extractDirectoryNames(pathName) {

        // Remove drive, if available
        pathName = pathName.replace(/^\w\:/, '');
        // check for windows style pathing
        var dirSeparation = pathName.indexOf('\\') > -1 ? '\\' : '/';
        // remove drive slashed from the start, if they're there
        pathName = pathName.replace(/^\W*/, '');
        // Now explode the string into folders list, with file name at the end of the list
        return pathName.split(dirSeparation);
      }

      /**
      * Given a list pf path_collection entries, compare and track against a list of folders
      * @param {array} pathEntries The collection of entries to compare
      * @param {array} folderNames The array of folder names to compare against
      * @return {int} The number of matches
      */
    }, {
      key: 'countPathMatches',
      value: function countPathMatches(pathEntries, folderNames) {

        var matches = 0,
            //begin with one, since anything in our list is considered a match
        entryLength = pathEntries.length,
            entryIndex = entryLength - 1,
            entry = pathEntries[entryIndex],
            nameLength = folderNames.length,
            nameIndex = nameLength - 1,
            name = folderNames[nameIndex];

        while (name && entry && nameIndex >= 0 && entryIndex >= 0) {

          if (name === entry.name) {
            matches++;
          }

          entryIndex--;
          entry = pathEntries[entryIndex];
          nameIndex--;
          name = folderNames[nameIndex];
        }

        return matches;
      }

      /**
      * Search for a given file name, using the Search API
      * @param {string} path The path for the file we want to find
      * @param {string} ancestorFolderId The id of the folder we want to search
      * @returns {Promise} A promise that resolves with the best matching file ids, or null
      */
    }, {
      key: 'searchForFileIds',
      value: function searchForFileIds(path, ancestorFolderId) {
        var _this = this;

        var folders = this.extractDirectoryNames(path),
            name = folders.pop(); // grab the file name off of the end of the list

        return new _lie2['default'](function (resolve, reject) {
          // search.search resolves in JSON
          _this.search.search(name, { type: 'file', ancestor_folder_ids: ancestorFolderId }).then(function (response) {

            var results = response.response,
                bestMatch = null;

            // If there's only one, don't bother comparing paths
            if (results.entries.length === 1) {

              bestMatch = results.entries[0];
            } else {
              (function () {

                var bestMatchCount = -1;

                results.entries.forEach(function (entry) {
                  var matches = _this.countPathMatches(entry.path_collection.entries, folders);

                  if (matches > bestMatchCount) {
                    bestMatchCount = matches;
                    bestMatch = entry;
                  }
                });
              })();
            }

            if (!bestMatch) {
              return resolve(null);
            }

            resolve({
              fileId: bestMatch.id,
              fileVersionId: bestMatch.file_version.id
            });
          })['catch'](reject);
        });
      }

      /** Hit the file association runmode to get the file ids of the requested file! Cache any results!
      * @param string filePath Path to associate with a file id set
      * @param string fileId The file id we are searching from
      * @param Object data Additional data to send with GET
      * @return Promise A promise whos resolution recieves an object containing the relevant file and file version ids
      */
    }, {
      key: 'fetchFileIds',
      value: function fetchFileIds(filePath, fileId) {
        var _this2 = this;

        var data = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

        if (!filePath) {
          return _lie2['default'].reject(new Error('No File Path Passed to Fetch File ID!'));
        }

        // Check cache for file ids
        var ids = this.getFromCache(filePath);
        if (ids) {
          return _lie2['default'].resolve(ids);
        }

        // use search API!
        return new _lie2['default'](function (resolve, reject) {

          _this2.searchForFileIds(filePath, data.parentId).then(function (ids) {

            if (!ids) {
              return reject(new Error('No file and file version ids for ' + filePath));
            }

            _this2.addToCache(filePath, ids.fileId, ids.fileVersionId);
            resolve(_this2.getFromCache(filePath));
          })['catch'](reject);
        });
      }

      /** Build the appropriate url to load the representation
       * @param {string} fileId The ID of the file we are going to load
       * @param {string} fileVersionId The file version id of the representation
       * @param {object} repParams Used to build the representation query.
       * type is the representation type to get, properties is an optional object to
       * use as query params
       * @return {string} Url to hit, for representation
      */
    }, {
      key: 'buildRepresentationUrl',
      value: function buildRepresentationUrl(fileId, fileVersionId, repParams) {

        if (!repParams) {
          throw new Error('buildRepresentationUrl() requires representation parameters!');
        }

        var props = '';

        if (repParams.properties) {

          props = '?';

          var keys = Object.keys(repParams.properties);
          props += keys.reduce(function conatenateFileNames(previous, current) {
            return previous + '=' + repParams.properties[previous] + '&' + current + '=' + repParams.properties[current];
          });
        }

        // #TODO: Build representations SHOULD fetch the file info
        // GET: https://app.jholdstock.inside-box.net/api/2.0/files/5011689813?fields=representations
        // With X-Rep-Hints, then build from that

        return this.apiBase + '/2.0/internal_files/' + fileId + '/versions/' + fileVersionId + '/representations/' + repParams.type + '/content/' + (repParams.asset || '') + props;
      }

      /**
      * Destructor
      * @returns {void}
      */
    }, {
      key: 'destroy',
      value: function destroy() {
        _get(Object.getPrototypeOf(RepresentationLoaderV2.prototype), 'destroy', this).call(this);
        delete this.search;
      }
    }]);

    return RepresentationLoaderV2;
  })(_baseRepresentationLoader2['default']);

  module.exports = RepresentationLoaderV2;

  // https://app.jholdstock.inside-box.net/api/2.0/files/5011689813?fields=representations,extension,file_version
  // https://app.jholdstock.inside-box.net/api/2.0/internal_files/5011689813/versions/124869305/representations/png/content/?dimensions=2048x2048
  // https://app.jholdstock.inside-box.net/api/2.0/internal_files/5015447497/versions/129067557/representations/3djson/content/

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

  /**
  * Client for searching for items living in Box
  * See https://box-content.readme.io/reference#searching-for-content
  */
  'use strict';

  Object.defineProperty(exports, '__esModule', {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var _lie = __webpack_require__(2);

  var _lie2 = _interopRequireDefault(_lie);

  var API_BASE = 'https://api.box.com';

  var Search = (function () {
    function Search(xhr, apiBase) {
      _classCallCheck(this, Search);

      if (!xhr) {
        throw new Error('No XHR module given to search instance');
      }
      this.apiBase = apiBase || API_BASE;
      this.xhr = xhr;
    }

    /**
    * Set the API base for the Search API
    * @param {string} url The api base to make requests to
    * @return {void}
    */

    _createClass(Search, [{
      key: 'setApiBase',
      value: function setApiBase(url) {

        this.apiBase = url;
      }

      /**
      * Create a url for the Search API
      * @param {string} query The string to search for
      * @param {object} params Params to turn into query parameters for search API
      * @returns {string} A URL for search params
      */
    }, {
      key: 'createSearchQuery',
      value: function createSearchQuery(query, params) {

        var queryParams = '';

        if (params) {
          queryParams = '&';
          var keys = Object.keys(params);
          queryParams += keys.reduce(function (previous, current) {
            return previous + '=' + params[previous] + '&' + current + '=' + params[current];
          });
        }

        return this.apiBase + '/2.0/search?query=' + query + queryParams;
      }

      /**
      * A general search for anything matching the required query string. Will assemble the
      * given params into additional query parameters
      * @param {string} query The string we want to search for
      * @param {object} params Any additional query params we want to look for
      * @returns {Promise} A promise that results in the search results
      */
    }, {
      key: 'search',
      value: function search(query, params) {

        var queryUrl = this.createSearchQuery(query, params);
        return this.xhr.get(queryUrl, null, { responseType: 'json' });
      }
    }]);

    return Search;
  })();

  exports['default'] = Search;
  module.exports = exports['default'];

/***/ }
/******/ ]);
//# sourceMappingURL=boxsdk-0.0.2.js.map
