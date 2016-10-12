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
	
	var _representationLoaderRm = __webpack_require__(1);
	
	var _representationLoaderRm2 = _interopRequireDefault(_representationLoaderRm);
	
	var _representationLoaderV = __webpack_require__(7);
	
	var _representationLoaderV2 = _interopRequireDefault(_representationLoaderV);
	
	var _metadata = __webpack_require__(10);
	
	var _metadata2 = _interopRequireDefault(_metadata);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	/**
	 * Acts as an abstraction layer to Representation loading. It will create the proper
	 * loaders (Runmode or V2 API version) depending on options passed to it ie) token
	 * @public
	 * @param {object} [opts] If includes token, it'll create a V2 loader, otherwise a V1 loader.
	 * Is passed to the underlying loader. IE) apiBase on this will be given to (and set on) the loader
	 * @returns {void}
	 */
	function BoxSDK() {
	  var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	
	
	  if (opts.hasOwnProperty('token')) {
	    // use V2 client
	    this.representationLoader = new _representationLoaderV2.default(opts);
	  } else {
	    // use runmode client
	    this.representationLoader = new _representationLoaderRm2.default(opts);
	  }
	
	  // lazily created through accessor
	  this.metadata = null;
	  this.apiBase = opts.apiBase;
	  this.token = opts.token;
	  this.sharedLink = opts.sharedLink;
	}
	
	/**
	 * Abstracted representation loading. Loads a reperesentation from the appropriate endpoint
	 * @public
	 * @param {string} fileId The Box File ID of the file we want to load a representation from
	 * @param {string} fileVersionId The Box File Version ID of the file version we want to load
	 * a representation for
	 * @param {string} repType The type of representation we want to load.
	*  IE) (V2) { type: box3d, asset: geometry.bin: properties: { size: 1 } }
	*      (Runmode) 'thumb_32_jpg/1.jpg'
	 * @param {Function} [progress] Callback on progress events OPTIONAL
	 * @returns {Promise} a promise that resolves in and xhr response
	 */
	BoxSDK.prototype.loadRepresentation = function (fileId, fileVersionId, repType, progress) {
	
	  return this.representationLoader.load(fileId, fileVersionId, repType, progress);
	};
	
	/**
	 * Get metadata client for this SDK instance. Lazily creates one, if unavailable
	 * @param {string} [token] The Auth token for accessing Box API. This used if unavailable
	 * @param {string} [apiBase] The base url for all metadata api requests. This apiBase if unavailable
	 * @param {string} [sharedLink] Shared link to add to GET requests, if file come from share link
	 * @returns {object} Metadata client instance
	 */
	BoxSDK.prototype.getMetadataClient = function (token, apiBase, sharedLink) {
	  if (!this.metadata) {
	    this.metadata = new _metadata2.default(token || this.token, apiBase || this.apiBase, sharedLink || this.sharedLink);
	  }
	
	  return this.metadata;
	};
	
	/**
	 * Destroy the representationLoader (see destroy() in each loader)
	 * @public
	 * @returns {void}
	 */
	BoxSDK.prototype.destroy = function () {
	
	  this.representationLoader.destroy();
	  delete this.representationLoader;
	  delete this.metadata;
	};
	
	global.BoxSDK = BoxSDK;
	module.exports = BoxSDK;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };
	
	var _lie = __webpack_require__(2);
	
	var _lie2 = _interopRequireDefault(_lie);
	
	var _baseRepresentationLoader = __webpack_require__(5);
	
	var _baseRepresentationLoader2 = _interopRequireDefault(_baseRepresentationLoader);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var FILE_ASSOC_URL = '/index.php?rm=preview_file_association';
	
	var RepresentationLoaderRM = function (_BaseLoader) {
	  _inherits(RepresentationLoaderRM, _BaseLoader);
	
	  /**
	   * The Representation Loader Client that can be used with Box Runmodes. Creates the proper
	   * representation urls, includes shared names, and makes requests to the correct endpoints
	   * @param {object} [opts] Additional data that should be sent to the base loader, with
	   * sharedName being swallowed before then. sharedName will be appended to requests, if the
	   * file is shared
	   * @returns {void}
	   */
	
	  function RepresentationLoaderRM() {
	    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	
	    _classCallCheck(this, RepresentationLoaderRM);
	
	    //for creating URLs with a shared name appended
	
	    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(RepresentationLoaderRM).call(this, opts));
	
	    _this.sharedName = opts.sharedName;
	    return _this;
	  }
	
	  /**
	   * @inheritdoc
	   * @param {string} fileId The Box File ID of the file we want to load a representation from
	   * @param {string} fileVersionId The Box File Version ID of the file version we want to load
	   * a representation for
	   * @param {string} repType The type of representation we want to load. IE) image_1024_jpg/1.jpg
	   * @param {Function} [progress] Callback on progress events
	   * @param {object} [params] These will be passed down and used by the XHR instance. See xhr.js
	   * Supply responseType in params object if you want a different response type.
	   * @returns {Promise} When resolved, receives an XHR response with representation data.
	   * By default, response will be requested as an arraybuffer.
	   */
	
	
	  _createClass(RepresentationLoaderRM, [{
	    key: 'load',
	    value: function load(fileId, fileVersionId, repType, progress, params) {
	      var _this2 = this;
	
	      return this.buildRepresentationUrl(fileId, fileVersionId, repType).then(function (url) {
	        return _this2.getRepresentation(url, progress, params);
	      });
	    }
	
	    /**
	     * GET request to the file association runmode to get the file ids of a file, based off of
	     * a file path provided
	     * @public
	     * @param {string} filePath A path used to look for a file, and get the associated file ids.
	     * The lookup will compare each folder name in the path against folder names, in Box, starting at
	     * the same level and below the folder the baseFileId lives in. If not provided, throws Error
	     * @param {string} baseFileId The file id to base File association lookup from. All file
	     * association starts at this files parent folder, and the parent folder's subfolders
	     * @param {Object} [data] Additional data to send with the GET request. See get() in xhr.js
	     * @returns {Promise} A promise whos resolution recieves an object containing
	     * the relevant file and file version ids, as fileId and fileVersionId
	     */
	
	  }, {
	    key: 'getFileIds',
	    value: function getFileIds(filePath, baseFileId) {
	      var _this3 = this;
	
	      var data = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];
	
	
	      if (!filePath) {
	        return _lie2.default.reject(new Error('No File Path Passed to getFileIds!'));
	      }
	
	      // Check cache for file ids
	      var ids = this.getFromCache(filePath);
	      if (ids) {
	        return _lie2.default.resolve(ids);
	      }
	
	      data.filePaths = {
	        item: filePath
	      };
	      data.fileId = baseFileId;
	
	      var url = this.apiBase + FILE_ASSOC_URL + '&' + this.xhr.encodeToUri(data);
	
	      return new _lie2.default(function (resolve, reject) {
	
	        _this3.get(url).then(function (xhr) {
	          if (xhr.status === 200) {
	
	            var _data = JSON.parse(xhr.response);
	
	            if (_data.item) {
	              _this3.addToCache(filePath, _data.item.fileId, _data.item.fileVersionId);
	              resolve(_this3.getFromCache(filePath));
	            } else {
	              reject(new Error('No file association for: ' + filePath));
	            }
	          } else {
	            reject(new Error(xhr.statusText));
	          }
	        }).catch(reject);
	      });
	    }
	
	    /**
	     * Build the appropriate url to load the representation from
	     * @public
	     * @param {string} fileId The Box File ID of the file we want to load a representation from
	     * @param {string} fileVersionId The Box File Version ID of the file version we want to load
	     * a representation for. Throws error if not provided
	     * @param {string} repParams The representation parameters we want to GET ie) image_1024_jpg/1.jpg
	     * Throws error if not provided
	     * @returns {Promise} A promise that resolves in a Url to GET, for representation
	    */
	
	  }, {
	    key: 'buildRepresentationUrl',
	    value: function buildRepresentationUrl(fileId, fileVersionId, repParams) {
	
	      if (!fileVersionId || !repParams) {
	        throw new Error('Insufficient arguments for building asset url. File ID: ' + fileId + '\n        File Version: ' + fileVersionId + ' RepParams: ' + repParams);
	      }
	
	      return _lie2.default.resolve(this.apiBase + '/representation/file_version_' + fileVersionId + '/' + repParams);
	    }
	
	    /**
	    * Make a get request, through the xhr instance. Also appends a shared name to the
	    * get url, in the case a file being used is shared (and sharedName is provided)
	    * @private
	    * @param {string} url The url we want to make a get request to
	    * @param {Object} [params] Parameters to send with the GET request. See xhr.js get()
	    * @param {function} [progress] The callback to call on load progress of the GET request
	    * @returns {Promise} A Promise that resolves with an XHR response
	    */
	
	  }, {
	    key: 'get',
	    value: function get(url) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progress = arguments[2];
	
	
	      if (this.sharedName) {
	        url = this.appendSharedName(url);
	      }
	
	      params.withCredentials = true;
	
	      return _get(Object.getPrototypeOf(RepresentationLoaderRM.prototype), 'get', this).call(this, url, params, progress);
	    }
	
	    /**
	    * Given a url, append a shared name to it
	    * @private
	    * @param {string} url The URL to check and then append a shared name to
	    * @returns {string} The newly formatted URL
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
	}(_baseRepresentationLoader2.default);
	
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

	'use strict';
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _lie = __webpack_require__(2);
	
	var _lie2 = _interopRequireDefault(_lie);
	
	var _xhr = __webpack_require__(6);
	
	var _xhr2 = _interopRequireDefault(_xhr);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var DEFAULT_API_BASE = 'https://api.box.com';
	
	var BaseRepresentationLoader = function () {
	
	  /**
	   * Base loader that handles loading representations from Box, creating representation urls
	   * getting and caching file ids, and caching representation results. Extend this and add
	   * additional functionality depending on endpoints and data returned. Acts as an outline
	   * for the basic contract a loader must follow.
	   * @public
	   * @param {object} [opts] Optional data to append to loader. We use {string} apiBase for
	   * the base url for all Box API calls
	   * @returns {void}
	   */
	
	  function BaseRepresentationLoader(opts) {
	    _classCallCheck(this, BaseRepresentationLoader);
	
	    this.apiBase = opts.hasOwnProperty('apiBase') ? opts.apiBase : DEFAULT_API_BASE;
	
	    //cache of file and version ids!
	    this.idCache = {};
	
	    this.xhr = new _xhr2.default();
	  }
	
	  /**
	   * Load a Representation from Box
	   * @public
	   * @returns {Promise} Should return a promise that results in the representation requested
	   */
	
	
	  _createClass(BaseRepresentationLoader, [{
	    key: 'load',
	    value: function load() {
	      throw new Error('load() not implemented!');
	    }
	
	    /**
	     * Load a representation from Box, with a valid representation url. Each extended client
	     * will create different urls, and headers to go with the request
	     * @public
	     * @param {string} url The url to load that belongs to the representation
	     * @param {function} [progress] Called during loading progress of the requested representation
	     * @param {object} [params] These will be passed down and used by the XHR instance. See xhr.js
	     * Supply responseType in params object if you want a different response type.
	     * @returns {Promise} A promise that resolves with an XHR response, by default
	     * response data of the XHR Will be an array buffer
	    */
	
	  }, {
	    key: 'getRepresentation',
	    value: function getRepresentation(url, progress) {
	      var _this = this;
	
	      var params = arguments.length <= 2 || arguments[2] === undefined ? { responseType: 'arraybuffer' } : arguments[2];
	
	
	      return new _lie2.default(function (resolve, reject) {
	        _this.get(url, params, progress).then(function (xhr) {
	          switch (xhr.status) {
	            case 200:
	              // found, yay
	              resolve(xhr);
	              break;
	            case 404: // nope
	            default:
	              reject(new Error('Issue Loading ' + url));
	          }
	        }).catch(reject);
	      });
	    }
	
	    /**
	     * Get file id and file version id of a specified BoxFile. EXTEND AND IMPLEMENT FOR YOUR ENDPOINTS
	     * @public
	     * @param {string} filePath Path to associate with a file id set
	     * @param {Object} data Additional data to send with GET and use for addtional
	     * API specific parameters
	     * @returns {Promise} A promise whos resolution recieves an object containing the
	     * relevant file and file version ids
	     */
	
	  }, {
	    key: 'getFileIds',
	    value: function getFileIds() /*filePath, data*/{
	
	      throw new Error('getFileIds() has not been implemented');
	    }
	
	    /**
	     * Build the appropriate url to load the representation. EXTEND AND IMPLEMENT FOR YOUR ENDPOINTS
	     * @public
	     * @param {string} fileId The Box File ID of the file we want to load a representation from
	     * @param {string} fileVersionId The Box File Version ID of the file version we want to load
	     * a representation for
	     * @param {string} repParams The representation parameters we want to get!
	     * @returns {Promise} A promise that resolves in a Url to make a request to, for representation
	    */
	
	  }, {
	    key: 'buildRepresentationUrl',
	    value: function buildRepresentationUrl() /*fileId, fileVersion, repParams*/{
	
	      throw new Error('buildRepresentationUrl() has not been implemented');
	    }
	
	    /**
	     * Set the API Base for all requests
	     * @public
	     * @param {string} url New url to use for requests
	     * @returns {void}
	    */
	
	  }, {
	    key: 'setApiBase',
	    value: function setApiBase(url) {
	
	      this.apiBase = url;
	    }
	
	    /**
	    * Make a get request, through the xhr object
	    * @public
	    * @param {string} url The url we want to make a get request to
	    * @param {Object} [params] Parameters to send with the GET request. See xhr.js get()
	    * @param {function} [progress] The callback to call on load progress of the GET request
	    * @returns {Promise} A Promise that resolves with the XHR response
	    */
	
	  }, {
	    key: 'get',
	    value: function get(url) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? { withCredentials: true, responseType: null } : arguments[1];
	      var progress = arguments[2];
	
	      return this.xhr.get(url, progress, params);
	    }
	
	    /**
	     * Add file and versions ids in the cache
	     * @private
	     * @param {string} path Path to associate with the cached ids
	     * @param {string} fileId The Box File ID, to cache, of the Box Representation
	     * @param {string} fileVersionId The Box File Version ID, to cache, of the Box Representation
	     * @returns {void}
	    */
	
	  }, {
	    key: 'addToCache',
	    value: function addToCache(path, fileId, fileVersionId) {
	      if (!this.idCache[path]) {
	        this.idCache[path] = {};
	      }
	
	      //note, this will overwrite the old ids, if present
	      this.idCache[path].fileId = fileId;
	      this.idCache[path].fileVersionId = fileVersionId;
	    }
	
	    /**
	     * Get file and version ids from the cache
	     * @private
	     * @param {string} key The key to file ids that we want
	     * @returns {Object} Object from cache containing the file id and file version id
	    */
	
	  }, {
	    key: 'getFromCache',
	    value: function getFromCache(key) {
	      return this.idCache[key] || null;
	    }
	
	    /**
	    * Destructor. Also triggers XHR abortion
	    * @public
	    * @returns {void}
	    */
	
	  }, {
	    key: 'destroy',
	    value: function destroy() {
	
	      delete this.apiBase;
	
	      for (var i in this.idCache) {
	        delete this.idCache[i];
	      }
	      delete this.idCache;
	    }
	  }]);
	
	  return BaseRepresentationLoader;
	}();
	
	module.exports = BaseRepresentationLoader;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _lie = __webpack_require__(2);
	
	var _lie2 = _interopRequireDefault(_lie);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var XHR = function () {
	
	  /**
	   * Module that handles working with XHR requests
	   * @param {string} [token] The Oauth2 token to send with requests. If provided it'll
	   * automatically be sent with requests
	   * @returns {void}
	   */
	
	  function XHR(token) {
	    _classCallCheck(this, XHR);
	
	    this.token = token;
	    // keep track of requests so that we can abort, if need be
	    this.requests = {};
	    // for adding uniqueness to each request key
	    this.requestCount = 0;
	  }
	
	  /**
	  * All XHR requests will be tracked by their URL. If a duplicate key is provided,
	  * an error will be thrown
	  * @private
	  * @param {object} xhr The XHR object that we want to track
	  * @param {string} url The url of the request, we'll use this to construct a key
	  * @param {string} [key] Key to store the xhr request at. If not provided, one will be created.
	  * Used for explicit xhr abortion
	  * @returns {string} The key at which the request is stored
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
	    * Remove and XHR, by key, from the requests cache
	    * @private
	    * @param {string} key The key at which to remove the request
	    * @returns {void}
	    */
	
	  }, {
	    key: 'removeRequest',
	    value: function removeRequest(key) {
	
	      delete this.requests[key];
	    }
	
	    /**
	    * Abort a single request, by key (provided in addRequest())
	    * @public
	    * @param {string} key The key that the xhr has been stored at
	    * @returns {Object} The aborted XHR request
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
	    * Abort all current XHR requests
	    * @public
	    * @returns {void}
	    */
	
	  }, {
	    key: 'abortRequests',
	    value: function abortRequests() {
	
	      for (var reqKey in this.requests) {
	        this.abortRequest(reqKey);
	      }
	    }
	
	    /**
	    * Make a general AJAX request
	    * @public
	    * @param {string} url The url to make a request to
	    * @param {string} [method] The ajax method to use
	    * @param {string|FormData} [params] Any parameters that need to be sent with a request
	    * THEY MUST BE APPROPRIATE ie)Encoded paramters.
	    * @param {function} [progress] The callback that runs on AJAX progress
	    * @param {object} [options] Any optional data that we want to use with the request
	    * ie) a property of info will be attached to the xhr created here, responseType
	    * will change the response type of the request, and xhrKey will allow for manual xhr abortion,
	    * headers {object} will be iterated through and headers will be attached to the request.
	    * By default, we send credentials with each request. To NOT send a token with a
	    * request, set sendToken to false
	    * @returns {Promise} A Promise that resolves with an object describing the result.
	    * includes: status, response, and the original XHR.
	    */
	
	  }, {
	    key: 'makeRequest',
	    value: function makeRequest(url) {
	      var method = arguments.length <= 1 || arguments[1] === undefined ? 'GET' : arguments[1];
	      var params = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
	
	      var _this = this;
	
	      var progress = arguments[3];
	      var options = arguments.length <= 4 || arguments[4] === undefined ? { withCredentials: true,
	        xhrKey: undefined, responseType: undefined, info: undefined, headers: undefined,
	        sendToken: true } : arguments[4];
	
	
	      if (!url) {
	        return _lie2.default.reject(new Error('No URL provided'));
	      }
	
	      return new _lie2.default(function (resolve, reject) {
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
	          var response = xhr.response;
	
	          // Status codes relevant to BoxSDK
	          if (status === 200 || status === 202 || status === 404) {
	            // IE Support for JSON response type
	            if (options.responseType === 'json' && typeof response === 'string') {
	              response = JSON.parse(response);
	            }
	
	            resolve({
	              response: response,
	              status: status,
	              xhr: xhr
	            });
	          } else {
	            reject(new Error('Failed request for ' + url));
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
	
	        if (_this.token && options.sendToken !== false) {
	          xhr.setRequestHeader('authorization', 'Bearer ' + _this.token);
	        }
	
	        // By default, we send credentials
	        xhr.withCredentials = !!options.withCredentials;
	
	        xhr.send(params);
	      });
	    }
	
	    /**
	    * Make a GET request with the provided url. See makeRequest()
	    * @public
	    * @param {string} url The url we want to GET
	    * @param {function} [progress] The progress function to call, on xhr progress
	    * @param {object} [options] The options to apply to the request XHR
	    * @returns {Promise} Resolves with a response XHR object
	    */
	
	  }, {
	    key: 'get',
	    value: function get(url, progress, options) {
	
	      return this.makeRequest(url, 'GET', null, progress, options);
	    }
	
	    /**
	    * Make a POST request. See makeRequest()
	    * @public
	    * @param {string} url The url we want to POST to
	    * @param {object} [params] Any parameters to send with the XHR. Must be valid data
	    * @param {function} [progress]  The progress function to call, on xhr progress
	    * @param {object} [options] The options to apply to the request XHR
	    * @returns {Promise} Resolves with a response XHR object
	    */
	
	  }, {
	    key: 'post',
	    value: function post(url, params, progress, options) {
	
	      return this.makeRequest(url, 'POST', params, progress, options);
	    }
	
	    /**
	    * Make a PUT request. See makeRequest()
	    * @public
	    * @param {string} url The url we want to PUT to
	    * @param {object} [params] Any parameters to send with the XHR. Must be valid data
	    * @param {function} [progress] The progress function to call, on xhr progress
	    * @param {object} [options] The options to apply to the request XHR
	    * @returns {Promise} Resolves with a response XHR object
	    */
	
	  }, {
	    key: 'put',
	    value: function put(url, params, progress, options) {
	
	      return this.makeRequest(url, 'PUT', params, progress, options);
	    }
	
	    /**
	    * Make a DELETE request. See makeRequest()
	    * @public
	    * @param {string} url The url we want to send a DELETE request to
	    * @param {object} [params] Any parameters to send with the XHR. Must be valid data
	    * @param {function} [progress] The progress function to call, on xhr progress
	    * @param {object} [options] The options to apply to the request XHR
	    * @returns {Promise} Resolves with a response XHR object
	    */
	
	  }, {
	    key: 'delete',
	    value: function _delete(url, params, progress, options) {
	
	      return this.makeRequest(url, 'DELETE', params, progress, options);
	    }
	
	    /**
	     * Convert data provided into a format that can be passed in a url
	     * @public
	     * @param {Object} data The object we want to encode
	     * @returns {string} Url with query params
	     */
	
	  }, {
	    key: 'encodeToUri',
	    value: function encodeToUri(data) {
	
	      if (!data) {
	        return '';
	      }
	
	      var keys = Object.keys(data),
	          len = keys.length,
	          i = 0,
	          encodedUri = '';
	
	      for (i; i < len; ++i) {
	
	        encodedUri += (i > 0 ? '&' : '') + keys[i] + '=';
	
	        var val = data[keys[i]];
	
	        if ((typeof val === 'undefined' ? 'undefined' : _typeof(val)) === 'object') {
	          val = JSON.stringify(val);
	        }
	
	        encodedUri += encodeURIComponent(val);
	      }
	
	      return encodedUri;
	    }
	
	    /**
	    * Get the size of the content, given an XHR
	    * @public
	    * @param {object} xhr The xhr object to check the size of
	    * @returns {int} Size of asset, in bytes
	    */
	
	  }, {
	    key: 'getContentLength',
	    value: function getContentLength(xhr) {
	
	      var lengthStr = xhr.getResponseHeader('Content-Length');
	      return parseInt(lengthStr, 10);
	    }
	
	    /**
	    * Creates an object that has total size and loaded size of an XHR. Makes it easier
	    * for progress reporting
	    * @param {object} xhr The xhr progress event that contains loaded data
	    * @returns {object} status object that contains the total size of the asset we are loading,
	    * the number of bytes currently loaded, and the XHR itself
	    */
	
	  }, {
	    key: 'getLoadStatus',
	    value: function getLoadStatus(xhr) {
	
	      var status = {
	        total: 0,
	        loaded: 0,
	        xhr: xhr
	      };
	
	      if (xhr.lengthComputable && xhr.target) {
	        status.total = this.getContentLength(xhr.target);
	      }
	
	      status.loaded = xhr.loaded;
	
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
	    * @param {string} authToken The Oauth2 token to use
	    * @returns {void}
	    */
	
	  }, {
	    key: 'setAuthToken',
	    value: function setAuthToken(authToken) {
	
	      this.token = authToken;
	    }
	  }]);
	
	  return XHR;
	}();

	exports.default = XHR;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };
	
	var _lie = __webpack_require__(2);
	
	var _lie2 = _interopRequireDefault(_lie);
	
	var _search = __webpack_require__(8);
	
	var _search2 = _interopRequireDefault(_search);
	
	var _baseRepresentationLoader = __webpack_require__(5);
	
	var _baseRepresentationLoader2 = _interopRequireDefault(_baseRepresentationLoader);
	
	var _utils = __webpack_require__(9);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }
	
	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
	
	var CONVERT_STATUS = {
	  none: 'none', // No representation
	  success: 'success', // Representation available
	  pending: 'pending', // Representation is converting, please wait
	  error: 'error' // Something went wrong during conversion
	};
	
	//#TODO: Make these configurable
	var POLL_TIME = 500; // in milliseconds
	var MAX_POLL_RETRIES = 5; // number of times to poll a single representation
	
	var RepresentationLoaderV2 = function (_BaseLoader) {
	  _inherits(RepresentationLoaderV2, _BaseLoader);
	
	  /**
	   * The Representation Loader Client that can be used Box V2 Representations API.
	   * Creates the proper representation urls, and makes requests to the correct endpoints
	   * @param {object} opts Additional data that should be sent to the base loader, with
	   * REQUIRED token being swallowed before then. The provided OAuth2 token will
	   * be sent with requests
	   * @param {string} [sharedLink] If shared link is provided, it will be send with GET
	   * requests to allow Box File access, from shares
	   * @returns {Object} The RepresentationLoaderV2 instance
	   */
	
	  function RepresentationLoaderV2() {
	    var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
	
	    _classCallCheck(this, RepresentationLoaderV2);
	
	    if (!opts.token) {
	      throw new Error('No OAuth Token Provided!');
	    }
	
	    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(RepresentationLoaderV2).call(this, opts));
	
	    _this.xhr.setAuthToken(opts.token);
	
	    // keep track of content bases, to make sure we aren't making unnecessary
	    // file info requests
	    _this.contentBaseCache = {};
	
	    _this.search = new _search2.default(_this.xhr, _this.apiBase);
	
	    _this.pollRetries = {};
	
	    _this.sharedLink = opts.sharedLink;
	    return _this;
	  }
	
	  /**
	  * Make a get request, through the xhr instance.
	  * @public
	  * @param {string} url The url we want to make a get request to
	  * @param {Object} [params] Parameters to send with the GET request. See xhr.js get()
	  * withCredentials is set to false for this request, and attached to the params object
	  * @param {function} [progress] The callback to call on load progress of the GET request
	  * @returns {Promise} A Promise that resolves with the XHR response object
	  */
	
	
	  _createClass(RepresentationLoaderV2, [{
	    key: 'get',
	    value: function get(url) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progress = arguments[2];
	
	      // The options object used in XHR.makeRequest
	      var options = params;
	      options.withCredentials = false;
	
	      // Send shared link with requests, if available
	      if (this.sharedLink) {
	        options.headers = options.headers || {};
	        options.headers.boxapi = (0, _utils.sharedLinkForHeader)(this.sharedLink);
	      }
	
	      return this.xhr.get(url, progress, options);
	    }
	
	    /**
	    * From the path name, extract the file name and parent folders names
	    * @public
	    * @param {string} pathName The path name to split into directories and the file name
	    * @returns {array} List of parent folder names and the name of the file, as the last entry
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
	    * Given a path_collection of a BoxFile/BoxFolder, count the number of entry names that match
	    * folder names. For more on folder/file path_collections
	    * see https://box-content.readme.io/reference#folder-object-1
	    * @param {object} pathEntries The path_collection entries of a BoxFile or BoxFolder
	    * @param {array} folderNames The array of folder names to compare against
	    * @returns {int} The number of matches
	    */
	
	  }, {
	    key: 'countPathMatches',
	    value: function countPathMatches(pathEntries, folderNames) {
	
	      if (!pathEntries.length) {
	        throw new Error('No entries');
	      }
	
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
	    * @param {string} [ancestorFolderId] The id of the folder we want to search.
	    * WARNING: IF NOT PROVIDED, LOOKUP HAPPENS FROM USERS ROOT FOLDER. THIS CAN BE SLOW!
	    * @returns {Promise} A promise that resolves with the best matching file ids as an object
	    * with fileId and fileVersionId, or null if none available
	    */
	
	  }, {
	    key: 'searchForFileIds',
	    value: function searchForFileIds(path, ancestorFolderId) {
	      var _this2 = this;
	
	      var folders = this.extractDirectoryNames(path),
	          name = folders.pop(); // grab the file name off of the end of the list
	
	      return new _lie2.default(function (resolve, reject) {
	
	        var nameAndExtension = name.split('.');
	        name = nameAndExtension[0];
	
	        var searchParams = {
	          type: 'file'
	        };
	
	        if (nameAndExtension[1]) {
	          searchParams.file_extensions = nameAndExtension[1];
	        }
	
	        if (ancestorFolderId) {
	          searchParams.ancestor_folder_ids = ancestorFolderId;
	        } else {
	          /*eslint-disable*/
	          console.warn('No ancestorFolderId provided. Be warned, this can be slow w/ Search API');
	          /*eslint-enable*/
	        }
	
	        // search.search resolves in JSON
	        _this2.search.search(name, searchParams).then(function (response) {
	
	          var results = response.response,
	              bestMatch = null;
	
	          // If there's only one, don't bother comparing paths
	          if (results.entries.length === 1) {
	
	            bestMatch = results.entries[0];
	          } else {
	            (function () {
	
	              var bestMatchCount = -1;
	
	              results.entries.forEach(function (entry) {
	
	                var matches = _this2.countPathMatches(entry.path_collection.entries, folders);
	
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
	        }).catch(reject);
	      });
	    }
	
	    /**
	     * Makes a get request to the Search api to get the file ids of a file, based off of
	     * a file path provided
	     * @public
	     * @param {string} filePath A path used to look for a file, and get the associated file ids.
	     * The lookup will compare each folder name in the path against folder names, in Box, starting at
	     * the same level and below the folder the baseFileId lives in
	     * @param {string} [folderId] The id of a folder we want to start the search from
	     * @returns {Promise} A promise whos resolution recieves an object containing
	     * a fileId and fileVersionId. If none are found, an error will be thrown
	     */
	
	  }, {
	    key: 'getFileIds',
	    value: function getFileIds(filePath, folderId) {
	      var _this3 = this;
	
	      if (!filePath) {
	        return _lie2.default.reject(new Error('No File Path Passed to getFileIds()!'));
	      }
	
	      // Check cache for file ids
	      var ids = this.getFromCache(filePath);
	      if (ids) {
	        return _lie2.default.resolve(ids);
	      }
	
	      // use search API!
	      return new _lie2.default(function (resolve, reject) {
	
	        _this3.searchForFileIds(filePath, folderId).then(function (ids) {
	
	          if (!ids) {
	            return reject(new Error('No file and file version ids for ' + filePath));
	          }
	
	          _this3.addToCache(filePath, ids.fileId, ids.fileVersionId);
	          resolve(_this3.getFromCache(filePath));
	        }).catch(reject);
	      });
	    }
	
	    /**
	     * Get a representation url from V2 API
	     * @param {String} fileId The file id of the representation we want to get a content url for
	     * @param {Function} entryValidator A function that recieves a representation entry,
	     * and returns a boolean value.
	     * True for a valid representation to fetch.
	     * @param {Object} [properties] Additional properties of the representation to encode and add to
	     * the content url.
	     * @returns {Promise} A promise that resolves in the content url to get the representation
	     */
	
	  }, {
	    key: 'getRepresentationUrl',
	    value: function getRepresentationUrl(fileId, entryValidator) {
	      var _this4 = this;
	
	      var properties = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
	      var requestOptions = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];
	
	
	      if (!entryValidator) {
	        return _lie2.default.reject('No validator supplied to find content for ' + fileId);
	      }
	
	      var props = properties ? '?' + this.xhr.encodeToUri(properties) : '';
	
	      if (!this.contentBaseCache[fileId]) {
	        (function () {
	          var fileInfo = _this4.apiBase + '/2.0/files/' + fileId + '?fields=representations';
	
	          _this4.contentBaseCache[fileId] = new _lie2.default(function (resolve, reject) {
	
	            _this4.get(fileInfo, _extends({ responseType: 'json' }, requestOptions)).then(function (resp) {
	              if (resp.status !== 200) {
	                throw new Error('Failed to find file representation info for: ' + fileId);
	              }
	
	              var info = resp.response;
	
	              if (!info.representations) {
	                throw new Error('No representations for ' + fileId);
	              }
	
	              resolve(info.representations.entries);
	            }).catch(reject);
	          });
	        })();
	      }
	
	      return this.contentBaseCache[fileId].then(function (entries) {
	
	        if (!entries) {
	          throw new Error('No representation entries for ' + fileId);
	        }
	
	        // iterate over the represetantations to get the one for 3d
	        var length = entries.length;
	
	        for (var i = 0; i < length; ++i) {
	          var entry = entries[i];
	          // Check if a valid entry
	          if (entryValidator(entry)) {
	            return _this4.getContentUrl(entry);
	          }
	        }
	
	        // If we get to this point, everything went wrong
	        throw new Error('No valid representation found for ' + fileId);
	      }).then(function (contentBase) {
	        return '' + contentBase + props;
	      });
	    }
	
	    /**
	     * [getContentUrl description]
	     * @param {[type]} entry [description]
	     * @returns {[type]} [description]
	     */
	
	  }, {
	    key: 'getContentUrl',
	    value: function getContentUrl(entry) {
	      var _this5 = this;
	
	      var links = entry.links;
	
	      return new _lie2.default(function (resolve, reject) {
	
	        switch (entry.status) {
	          case CONVERT_STATUS.success:
	            resolve(links.content.url);
	            break;
	          case CONVERT_STATUS.none:
	          case CONVERT_STATUS.pending:
	            _this5.pollInfoStatus(links.info.url).then(function () {
	              _this5.clearPollCount(links.info.url);
	              resolve(links.content.url);
	            }).catch(function (err) {
	              _this5.clearPollCount(links.info.url);
	              reject(err);
	            });
	            break;
	          case CONVERT_STATUS.error:
	          default:
	            reject(new Error('Error converting representation' + entry.name));
	        }
	      });
	    }
	
	    /**
	     * Poll the representation info endpoint until it is ready for use
	     * @param {String} url The URL to poll info on
	     * @param {Number} waitTime Number of millseconds to wait before hitting the url
	     * @returns {Promise} A Promise that resolves if representation is ready, and rejects if fails OR
	     * polling takes too long
	     */
	
	  }, {
	    key: 'pollInfoStatus',
	    value: function pollInfoStatus(url) {
	      var _this6 = this;
	
	      var waitTime = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
	
	
	      var timesPolled = this.incrementPollCount(url);
	
	      if (timesPolled >= MAX_POLL_RETRIES) {
	        return _lie2.default.reject(new Error('Max poll time exceeded for ' + url));
	      }
	
	      return new _lie2.default(function (resolve, reject) {
	
	        _this6.get(url, { responseType: 'json' }).then(function (response) {
	          if (response.status !== 200) {
	            throw new Error('Info not available for ' + url);
	          }
	
	          var info = response.response;
	
	          switch (info.status) {
	            case CONVERT_STATUS.success:
	              resolve();
	              break;
	            case CONVERT_STATUS.none:
	            case CONVERT_STATUS.pending:
	              window.setTimeout(function () {
	                _this6.pollInfoStatus(url, POLL_TIME).then(resolve).catch(function () {
	                  reject(new Error('Error getting info @ ' + url));
	                });
	              }, waitTime);
	              break;
	            case CONVERT_STATUS.error:
	            default:
	              throw new Error('Error getting info @ ' + url);
	          }
	        }).catch(reject);
	      });
	    }
	
	    /**
	     * Increment the poll tracker for an url
	     * @param {String} url The url we are polling
	     * @returns {Number} The number of times we have polled the url
	     */
	
	  }, {
	    key: 'incrementPollCount',
	    value: function incrementPollCount(url) {
	      this.pollRetries[url] = ++this.pollRetries[url] || 0;
	      return this.pollRetries[url];
	    }
	
	    /**
	     * Clear out the poll retry counter
	     * @param {String} url The url we are done polling
	     * @returns {void}
	     */
	
	  }, {
	    key: 'clearPollCount',
	    value: function clearPollCount(url) {
	      delete this.pollRetries[url];
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
	      delete this.contentBaseCache;
	    }
	  }]);
	
	  return RepresentationLoaderV2;
	}(_baseRepresentationLoader2.default);
	
	module.exports = RepresentationLoaderV2;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _utils = __webpack_require__(9);
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var DEFAULT_API_BASE = 'https://api.box.com';
	
	var Search = function () {
	
	  /**
	   * Client for searching for items stored in Box
	   * See https://box-content.readme.io/reference#searching-for-content
	   * @param {XHR} xhr An XHR client instance. All requests pass through this. See xhr.js
	   * @param {string} [apiBase] The API Base url to use for all Search requests
	   * @param {string} [sharedLink] Used for GET requests, if File is served through a Shared Link
	   * @returns {void}
	   */
	
	  function Search(xhr) {
	    var apiBase = arguments.length <= 1 || arguments[1] === undefined ? DEFAULT_API_BASE : arguments[1];
	    var sharedLink = arguments[2];
	
	    _classCallCheck(this, Search);
	
	    if (!xhr) {
	      throw new Error('No XHR module given to search instance');
	    }
	    this.apiBase = apiBase;
	    this.sharedLink = sharedLink;
	    this.xhr = xhr;
	  }
	
	  /**
	  * Set the API base url for all Search API requests
	  * @param {string} url The api base to use
	  * @returns {void}
	  */
	
	
	  _createClass(Search, [{
	    key: 'setApiBase',
	    value: function setApiBase(url) {
	      this.apiBase = url;
	    }
	
	    /**
	    * Create a url that is formatted for Search queries
	    * @param {string} query The string to search for
	    * @param {object} [params] Params to turn into query parameters for search API
	    * @returns {string} A URL, with added query parameters, that is valid for Search API
	    */
	
	  }, {
	    key: 'createSearchQuery',
	    value: function createSearchQuery(query, params) {
	
	      var queryParams = '';
	
	      if (params) {
	        queryParams = '&' + this.xhr.encodeToUri(params);
	      }
	
	      return this.apiBase + '/2.0/search?query=' + query + queryParams;
	    }
	
	    /**
	    * A general search for anything matching the required query string. Will assemble the
	    * given params into additional query parameters
	    * @param {string} query The string we want to search for
	    * @param {object} [params] Any additional query params we want to look for
	    * @returns {Promise} A promise that resolves with the response XHR (response will be in json)
	    */
	
	  }, {
	    key: 'search',
	    value: function search(query, params) {
	      var options = {
	        responseType: 'json'
	      };
	
	      if (this.sharedLink) {
	        options.headers = {};
	        options.headers.boxapi = (0, _utils.sharedLinkForHeader)(this.sharedLink);
	      }
	
	      var queryUrl = this.createSearchQuery(query, params);
	      return this.xhr.get(queryUrl, null, options);
	    }
	  }]);
	
	  return Search;
	}();

	exports.default = Search;

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	/**
	 * Build a header ready shared link value for BoxAPI
	 * @param {string} url The url to turn into a value for the BoxAPI header, for shared_link
	 * @returns {string} Url that is header ready
	 */
	function sharedLinkForHeader(url) {
	  return 'shared_link=' + url;
	}
	
	exports.sharedLinkForHeader = sharedLinkForHeader;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	
	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();
	
	var _xhr = __webpack_require__(6);
	
	var _xhr2 = _interopRequireDefault(_xhr);
	
	var _utils = __webpack_require__(9);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
	
	var API_BASE = 'https://api.box.com';
	var UPDATE_HEADERS = { 'Content-Type': 'application/json-patch+json' };
	var CREATE_HEADERS = { 'Content-Type': 'application/json' };
	
	var Metadata = function () {
	
	  /**
	  * Client for using Box Metadata
	  * See https://box-content.readme.io/reference#searching-for-content
	  * @param {string} [token] Oauth2 token used for authorization
	  * @param {string} [apiBase] Base url to make all API calls to
	  * @param {string} [sharedLink] Used for GET requests, if File is served through a Shared Link
	  * @returns {void}
	  */
	
	  function Metadata(token, apiBase, sharedLink) {
	    _classCallCheck(this, Metadata);
	
	    this.xhr = new _xhr2.default(token);
	    this.apiBase = apiBase !== undefined ? apiBase : API_BASE;
	    this.sharedLink = sharedLink;
	  }
	
	  /**
	   * Set the api base of the XHR instance that belongs to this
	   * @param {string} baseUrl The base url we want to set for all Metadata requests
	   * @returns {void}
	   */
	
	
	  _createClass(Metadata, [{
	    key: 'setApiBase',
	    value: function setApiBase(baseUrl) {
	      this.apiBase = baseUrl;
	    }
	
	    /**
	     * Set the auth token of the XHR instance that belongs to this
	     * @param {string} token The auth token
	     * @returns {void}
	     */
	
	  }, {
	    key: 'setAuthToken',
	    value: function setAuthToken(token) {
	      this.xhr.setAuthToken(token);
	    }
	
	    /**
	     * Create a shared link header
	     * @returns {Object} The shared link header object
	     */
	
	  }, {
	    key: 'getSharedLinkHeader',
	    value: function getSharedLinkHeader() {
	      if (!this.sharedLink) {
	        return;
	      }
	
	      return {
	        headers: {
	          boxapi: (0, _utils.sharedLinkForHeader)(this.sharedLink)
	        }
	      };
	    }
	
	    /**
	    * Get a specified metadata template on a Box File
	    * @public
	    * @param {string} id The file id of the file we want to get metadata for
	    * @param {string} scope The scope of the object. global and enterprise are currently supported
	    * @param {string} template The display name of the template
	    * @returns {Promise} A promise that resolves in the metadata as json
	    */
	
	  }, {
	    key: 'get',
	    value: function get(id, scope, template) {
	      var options = Object.assign({ responseType: 'json' }, this.getSharedLinkHeader());
	
	      return this.xhr.get(this.apiBase + '/2.0/files/' + id + '/metadata/' + scope + '/' + template, null, options);
	    }
	
	    /**
	    * Get all metadata templates on the Box File
	    * @public
	    * @param {string} id The file id of the file we want to get metadata for
	    * @returns {Promise} A promise that resolves in the metadata as json
	    */
	
	  }, {
	    key: 'getAll',
	    value: function getAll(id) {
	      var options = Object.assign({ responseType: 'json' }, this.getSharedLinkHeader());
	
	      return this.xhr.get(this.apiBase + '/2.0/files/' + id + '/metadata', null, options);
	    }
	
	    /**
	     * Create a metadata template instance for a Box File. Values MUST adhere
	     * to metdata template schema
	     * For more, See https://box-content.readme.io/reference#create-metadata
	     * @param {string} id The File ID of the Box File we want to add a template instance to
	     * @param {string} scope The scope of the metadata template to add to the Box File
	     * @param {string} template The display name of the metadata template to instance
	     * @param {object} customKeyVal The custom key/value pairs for the template, defined by the
	     * application or user. Will be JSON.stringified and sent in the response
	     * @returns {promise} A promise that resolves with a response XHR, with a template
	     * instance that includes the key:value pairs defined. If the template already exists,
	     * a 409 status code will be returned. Use update() instead
	     */
	
	  }, {
	    key: 'create',
	    value: function create(id, scope, template, customKeyVal) {
	      return this.xhr.post(this.apiBase + '/2.0/files/' + id + '/metadata/' + scope + '/' + template, JSON.stringify(customKeyVal), null, { headers: CREATE_HEADERS });
	    }
	
	    /**
	     * Create an operation object for updating metadata template instances
	     * @param {string} operation The operation to apply to the template instance.
	     * Needs to be one of: 'add', 'replace', 'remove', 'test'
	     * @param {string} path The path that designates a key to modify. Must be prefixed with /
	     * @param {string} [value] The value, as a string, to apply to the template instance. Works with
	     * 'add' and 'replace' operations.
	     * @returns {object} A metdata template operation object
	     */
	
	  }, {
	    key: 'createOperation',
	    value: function createOperation(operation, path, value) {
	
	      if (operation !== 'add' && operation !== 'replace' && operation !== 'remove' && operation !== 'test') {
	
	        throw new Error('Not a valid metadata update operation: ' + operation);
	      }
	
	      var updateOp = {
	        op: operation,
	        path: path
	      };
	
	      if (value) {
	
	        if (typeof value !== 'string') {
	          throw new Error('value parameter for createOperation() requires string');
	        }
	
	        updateOp.value = value;
	      }
	
	      return updateOp;
	    }
	
	    /**
	     * Update a specific template instance on a Box File. Only values that adhere to
	     * the metadata template schema will be accepted
	     * @public
	     * @param {string} id The Box File ID who's template instance we are udpating
	     * @param {string} scope The scope of the metadata template
	     * @param {string} template The name of the metadata template
	     * @param {array|object} operation The operation(s) to apply to the template instance.
	     * A single operation can be accepted, but a list of operations can be passed in
	     * made by createOperation(). Will be converted to string before being sent off
	     * @returns {promise} A promise that resolves with an XHR response, with instance of the
	     * template that includes key:value pairs defined by a user or application.
	     * If no template present, a 404 will be returned
	     */
	
	  }, {
	    key: 'update',
	    value: function update(id, scope, template, operation) {
	      // make sure to convert to a proper operation list for Metadata API. A 'properation' list
	      if (typeof operation === 'string') {
	        operation = [operation];
	      }
	
	      // PUT to metadata API
	      return this.xhr.put(this.apiBase + '/2.0/files/' + id + '/metadata/' + scope + '/' + template, JSON.stringify(operation), undefined, { headers: UPDATE_HEADERS });
	    }
	
	    /**
	     * Delete a template instance on a Box File
	     * @public
	     * @param {string} id The Box File ID of the file we want to delete the instance on
	     * @param {string} scope The scope of the metdata template we want to delete
	     * @param {string} template The display name of the template we want to delete
	     * @returns {promise} A promise that resolves in an XHR response, with a status of 204
	     * if the DELETE is successful
	     */
	
	  }, {
	    key: 'delete',
	    value: function _delete(id, scope, template) {
	      return this.xhr.delete(this.apiBase + 'files/' + id + '/metadata/' + scope + '/' + template);
	    }
	
	    /**
	    * Get the global properties of a Box File
	    * @public
	    * @param {string} id The file id of the file we want to get metadata for
	    * @returns {Promise} A promise that resolves in the metadata as json
	    */
	
	  }, {
	    key: 'getGlobalProperties',
	    value: function getGlobalProperties(id) {
	      return this.get(id, 'global', 'properties');
	    }
	
	    /**
	     * Retrieve all metadata templates within a user's enterprise.
	     * @public
	     * @returns {Promise} A promise that resolves in the metadata as json
	     */
	
	  }, {
	    key: 'getEnterpriseTemplates',
	    value: function getEnterpriseTemplates() {
	      var options = Object.assign({ responseType: 'json' }, this.getSharedLinkHeader());
	
	      return this.xhr.get(this.apiBase + '/2.0/metadata_templates/enterprise', null, options);
	    }
	
	    /**
	    * Get the schema for a metadata template
	    * @public
	    * @param {string} scope The scope of the object. global and enterprise are currently supported
	    * @param {string} template The display name of the template
	    * @returns {Promise} A promise that resolves in the schema as json
	    */
	
	  }, {
	    key: 'getSchemaForTemplate',
	    value: function getSchemaForTemplate(scope, template) {
	      var options = Object.assign({ responseType: 'json' }, this.getSharedLinkHeader());
	
	      return this.xhr.get(this.apiBase + '/2.0/metadata_templates/' + scope + '/' + template + '/schema', null, options);
	    }
	  }]);
	
	  return Metadata;
	}();

	exports.default = Metadata;

/***/ }
/******/ ]);
//# sourceMappingURL=boxsdk-0.2.2.js.map