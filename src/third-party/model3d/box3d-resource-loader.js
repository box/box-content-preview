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

	var _runmodeLoader = __webpack_require__(8);

	var _runmodeLoader2 = _interopRequireDefault(_runmodeLoader);

	var _events = __webpack_require__(7);

	var _events2 = _interopRequireDefault(_events);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var Box3DResourceLoader = function (_EventEmitter) {
	  _inherits(Box3DResourceLoader, _EventEmitter);

	  /**
	  * Abstraction of Box asset loading for Box3D
	  * @param {string} fileId The file id of the model we are viewing
	  * @param {string} fileVersionId The file version id of the model we are viewing
	  * @param {object} opts Additional properties to add to the loader.
	  *  {BoxSDK} boxSdk and {string} apiBase can be added. If {string} token is provided
	  *  V2 API will be accessible
	  * @returns {void}
	  */

	  function Box3DResourceLoader(fileId, fileVersionId) {
	    var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

	    _classCallCheck(this, Box3DResourceLoader);

	    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Box3DResourceLoader).call(this));

	    if (opts.hasOwnProperty('boxSdk') && opts.boxSdk) {
	      _this.boxSdk = opts.boxSdk;
	    } else {
	      opts.boxSdk = _this.boxSdk = new BoxSDK(opts);
	    }

	    _this.loader = null;

	    if (opts.hasOwnProperty('token')) {
	      _this.loader = new _v2Loader2.default(fileId, fileVersionId, opts);
	    } else {
	      // create runmode loader
	      _this.loader = new _runmodeLoader2.default(fileId, fileVersionId, opts);
	    }

	    // delegate all notifcations to the external application
	    _this.loader.on('missingAsset', _this.onMissingAsset.bind(_this));

	    return _this;
	  }

	  /**
	   * Load the specified Box3DAsset.
	   * @method load
	   * @param {Box3DAsset} asset The Box3DAsset that is being loaded
	   * @param {Object} params The criteria for determining which representation to load
	   * @param {Function} progress The progress callback
	   * @returns {Promise} a promise that resolves the asset data
	   */


	  _createClass(Box3DResourceLoader, [{
	    key: 'load',
	    value: function load(asset) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progress = arguments[2];


	      return this.loader.loadAsset(asset, params, progress);
	    }

	    /**
	    * Interface with BoxSDK to halt a single request
	    * @method abortRequest
	    * @param {string} key The key of the XHR that we want to abort
	    * @returns {void}
	    */

	  }, {
	    key: 'abortRequest',
	    value: function abortRequest(key) {

	      this.loader.abortRequest(key);
	    }

	    /**
	    * Interface with BoxSDK to halt all requests currently loading
	    * @method abortRequests
	    * @returns {void}
	    */

	  }, {
	    key: 'abortRequests',
	    value: function abortRequests() {

	      this.loader.abortRequests();
	    }

	    /**
	     * Tell the application using this that an asset is missing
	     * @param {object} assetDescription A descriptor for the missing asset.
	     * See base-loader.js onAssetNotFound()
	     * @returns {void}
	     */

	  }, {
	    key: 'onMissingAsset',
	    value: function onMissingAsset(assetDescription) {

	      // As of right now, not modifying the outgoing data
	      this.emit('missingAsset', assetDescription);
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy() {

	      // loader calls box SDK destroy
	      this.loader.destroy();
	      this.removeAllListeners();
	      this.loader = null;
	      this.boxSdk = null;
	    }
	  }]);

	  return Box3DResourceLoader;
	}(_events2.default);

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

	var _lie = __webpack_require__(3);

	var _lie2 = _interopRequireDefault(_lie);

	var _baseLoader = __webpack_require__(6);

	var _baseLoader2 = _interopRequireDefault(_baseLoader);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               * V2 API Resource Loader for Box3D
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               **/


	var V2Loader = function (_BaseLoader) {
	  _inherits(V2Loader, _BaseLoader);

	  /**
	  * Used for loading Box3D Representations from Box V2 Content API
	  * @param {string} fileId The file id of the model we are viewing
	  * @param {string} fileVersionId The file version id of the model we are viewing
	  * @param {object} opts Additional properties to add to the loader.
	  *   {BoxSDK} boxSdk and {string} apiBase can be added and {string} parentId is used
	  *   for file search. {string} token MUST be added
	  * @returns {void}
	  */

	  function V2Loader(fileId, fileVersionId) {
	    var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

	    _classCallCheck(this, V2Loader);

	    if (!opts.hasOwnProperty('token')) {
	      throw new Error('No Token Provided for V2 Loader!');
	    }

	    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(V2Loader).call(this, fileId, fileVersionId, opts));

	    _this.token = opts.token;
	    _this.parentId = opts.parentId;

	    return _this;
	  }

	  /**
	   * Override for getting gzipped length, with credentials passing disabled
	   * @param {object} xhr The response xhr with the appropriate headers
	   * @param {string} url The key to store the total size at
	   * @returns {int} The byte size of the asset, with applied compression factor
	   */


	  _createClass(V2Loader, [{
	    key: 'getGzippedLength',
	    value: function getGzippedLength(xhr, url) {

	      return _get(Object.getPrototypeOf(V2Loader.prototype), 'getGzippedLength', this).call(this, xhr, url, { withCredentials: false });
	    }

	    /**
	     * @inheritdoc
	     */

	  }, {
	    key: 'getBaseUrl',
	    value: function getBaseUrl(fileId, fileVersionId, validator) {

	      return this.sdkLoader.getRepresentationUrl(fileId, validator).then(function (url) {
	        // Chop off entities.json
	        // TODO - this really assumes that we're loading the '3d'
	        // representation, doesn't it?...
	        return _lie2.default.resolve(url.replace('entities.json', ''));
	      });
	    }

	    /**
	     * @inheritdoc
	     */

	  }, {
	    key: 'getCredentialOptions',
	    value: function getCredentialOptions(isPathRelative) {
	      return { sendToken: isPathRelative, withCredentials: false };
	    }
	  }]);

	  return V2Loader;
	}(_baseLoader2.default);

	exports.default = V2Loader;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';
	var immediate = __webpack_require__(5);

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

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ },
/* 4 */
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
/* 5 */
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

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(4)))

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _lie = __webpack_require__(3);

	var _lie2 = _interopRequireDefault(_lie);

	var _events = __webpack_require__(7);

	var _events2 = _interopRequireDefault(_events);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var CompressionFactors = {
	  'application/vnd.box.box3d+bin': 1.0
	};

	var DEFAULT_CHANNELS = ['red', 'green', 'blue'];
	var MAX_IMAGE_RESOLUTION = 16384;
	var COMPRESSION_TYPE = {
	  DXT: 'dxt',
	  DXT1: 'dxt1',
	  DXT5: 'dxt5',
	  JPEG: 'jpeg',
	  ZIP: 'zip'
	};

	var BaseLoader = function (_EventEmitter) {
	  _inherits(BaseLoader, _EventEmitter);

	  /**
	  * Provides base functionality for all loaders that need to load assets from Box
	  * That need to work with the Box3DRuntime
	  * @param {string} fileId The file id of the model we are viewing
	  * @param {string} fileVersionId The file version id of the model we are viewing
	  * @param {object} opts Additional properties to add to the loader.
	  *   {BoxSDK} boxSdk and {string} apiBase can be added
	  * @returns {void}
	  */

	  function BaseLoader(fileId, fileVersionId) {
	    var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

	    _classCallCheck(this, BaseLoader);

	    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(BaseLoader).call(this));

	    if (opts.boxSdk) {
	      _this.boxSdk = opts.boxSdk;
	    } else {
	      throw new Error('No Box SDK Provided to Loader!');
	    }

	    _this.sdkLoader = _this.boxSdk.representationLoader;

	    _this.fileId = fileId;
	    _this.fileVersionId = fileVersionId;

	    _this.cache = {};
	    //for tracking progress callbacks
	    _this.progressListeners = {};
	    //for caching gzipped asset sizes
	    _this.gzipSizes = {};

	    _this.apiBase = opts.apiBase !== undefined ? opts.apiBase : undefined;

	    return _this;
	  }

	  /**
	   * Load the data for a given Box3DAsset.
	   * @method loadAsset
	   * @param {Box3DAsset} asset The asset that is being loaded
	   * @param {Object} params The criteria for determining which representation to load
	   * @param {Function} progress The progress callback
	   * @returns {Promise} a promise that resolves the asset data
	   */


	  _createClass(BaseLoader, [{
	    key: 'loadAsset',
	    value: function loadAsset(asset) {
	      var _this2 = this;

	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progress = arguments[2];


	      var loadFunc = this.getAssetLoadingMethod(asset);

	      if (!loadFunc) {
	        return _lie2.default.reject('Asset not supported for loading: ' + asset.type);
	      }

	      loadFunc = loadFunc.bind(this);
	      var fileIdPromise = this.getFileIdPromise(asset);
	      var prefixUrl = true;
	      var validator = validator = function validator(entry) {
	        return entry.representation === '3d';
	      };

	      switch (asset.type) {

	        case 'image':
	          {
	            prefixUrl = false;
	            var resource = void 0;
	            try {
	              resource = this.findImageResource(asset, params);
	            } catch (err) {
	              return _lie2.default.reject(err);
	            }
	            params.resource = resource;

	            // TODO - when we support 3d reps for images, change this.
	            validator = function validator(entry) {
	              if (params.resource.compression === 'zip' && entry.representation === 'png') {
	                return true;
	              } else if (params.resource.compression === 'jpeg' && entry.representation === 'jpg') {
	                return true;
	              }
	              return false;
	            };
	          }
	          break;

	        case 'document':
	          break;
	      }

	      // Load the representation.
	      return new _lie2.default(function (resolve, reject) {
	        // Get the file ID for the asset.
	        fileIdPromise.then(function (fileIds) {

	          if (fileIds.fileId !== _this2.fileId || prefixUrl) {

	            // Get the base representation url for fileId and fileVersionId
	            return _this2.getBaseUrl(fileIds.fileId, fileIds.fileVersionId, validator).then(function (baseUrl) {
	              if (!baseUrl) {
	                reject(new Error('No 3d representation available for: ' + fileIds.fileId));
	              }
	              // Load the data using our selected loading function
	              return loadFunc(baseUrl, params, progress);
	            });
	          }
	          return loadFunc('', params, progress);
	        }).then(resolve).catch(function (err) {
	          _this2.onAssetNotFound(asset);
	          reject(err);
	        });
	      });
	    }

	    /**
	     * Get the base url for a representation.
	     * @param  {String} fileId        Box file Id
	     * @param  {String} fileVersionId Box file version Id
	     * @param  {Function} validator   Function called for every representation found and finds one
	     * to fetch the url for.
	     * @returns {String}               The base url for the representation
	     */

	  }, {
	    key: 'getBaseUrl',
	    value: function getBaseUrl() /* fileId, fileVersionId, validator*/{
	      throw new Error('getBaseUrl not implemented!');
	    }

	    /**
	     * Get a method of loading a texture
	     * @param {Object} box3dAsset The Box3DAsset to load
	     * @returns {Function} The loading function needed to load the asset
	     */

	  }, {
	    key: 'getAssetLoadingMethod',
	    value: function getAssetLoadingMethod(box3dAsset) {
	      var loadFunc = void 0;

	      switch (box3dAsset.type) {
	        case 'image':
	          loadFunc = this.loadImage;
	          break;
	        case 'video':
	          loadFunc = this.loadVideo;
	          break;
	        case 'animation':
	        /*fall-through*/
	        case 'meshGeometry':
	          loadFunc = this.loadGeometry;
	          break;
	        case 'document':
	          loadFunc = this.loadDocument;
	          break;
	      }

	      return loadFunc;
	    }

	    /**
	     * Check to see if a Box3D Asset already has provided file ids
	     * @param {Object} box3dAsset The Box3DAsset we are checking for IDs
	     * @param {Object} params Additional params to be passed to the SDK search method
	     * @returns {Promise} A promise that resolves in FileID and FileVersionID
	     */

	  }, {
	    key: 'getFileIdPromise',
	    value: function getFileIdPromise(box3dAsset) {
	      var fileId = box3dAsset.getProperty('fileId');
	      var fileVersionId = box3dAsset.getProperty('fileVersionId');
	      var idPromise = void 0;

	      if (fileId) {
	        idPromise = _lie2.default.resolve({
	          fileId: fileId,
	          fileVersionId: fileVersionId
	        });
	      } else {
	        idPromise = _lie2.default.resolve({
	          fileId: this.fileId,
	          fileVersionId: this.fileVersionId
	        });
	      }

	      return idPromise;
	    }

	    /**
	     * Called when an asset cannot be resolved to a Box fileVersionId.
	     * @method onAssetNotFound
	     * @param {Box3DAsset} asset The asset that failed to resolve
	     * @returns {void}
	     */

	  }, {
	    key: 'onAssetNotFound',
	    value: function onAssetNotFound(asset) {

	      var filename = '';

	      switch (asset.type) {
	        case 'image':
	          filename = asset.getProperty('filename');
	          break;
	      }
	      // Broadcast that the asset is missing.
	      this.emit('missingAsset', {
	        assetName: asset.getName(),
	        fileName: filename,
	        type: asset.type,
	        asset: asset
	      });
	    }

	    /**
	    * Update all registered progress listeners
	    * @private
	    * @param {string} url The url associated with loading callback to call
	    * @param {object} status The status object to propogate to listeners
	    * @returns {void}
	    */

	  }, {
	    key: 'updateLoadProgress',
	    value: function updateLoadProgress(url, status) {

	      if (this.progressListeners.hasOwnProperty(url)) {
	        this.progressListeners[url].forEach(function (progress) {
	          progress(status);
	        });
	      }
	    }

	    /**
	    * Get the content length of a gzipped asset
	    * @param {object} xhr The response xhr with the appropriate headers
	    * @param {string} url The key to store the total size at
	    * @param {object} params Additional parameters to configure the XHR request
	    * @returns {int} The byte size of the asset, with applied compression factor
	    */

	  }, {
	    key: 'getGzippedLength',
	    value: function getGzippedLength(xhr, url, params) {
	      var _this3 = this;

	      if (!this.gzipSizes[url]) {
	        this.gzipSizes[url] = new _lie2.default(function (resolve, reject) {
	          // Check type to see if we need to apply a compression factor
	          var factor = CompressionFactors[xhr.getResponseHeader('Content-Type')] || 1;

	          // make the HEAD request for content length
	          _this3.sdkLoader.xhr.makeRequest(xhr.responseURL, 'HEAD', null, null, params).then(function (resp) {
	            var total = resp.getResponseHeader('Content-Length');
	            resolve(total ? total * factor : 0);
	          }).catch(reject);
	        });
	      }

	      return this.gzipSizes[url];
	    }

	    /**
	    * On a progress event, we need to update progressListeners
	    * @method onAssetLoadProgress
	    * @private
	    * @param {object} status The status object containing the XHR and loading progress
	    * of the XHR request
	    * @returns {void}
	    */

	  }, {
	    key: 'onAssetLoadProgress',
	    value: function onAssetLoadProgress(status) {
	      var _this4 = this;

	      var target = status.xhr.target || status.xhr.srcElement;
	      var info = target.info;

	      if (!info) {
	        return;
	      }
	      // get url from xhr request
	      var url = info.url;
	      var encoding = target.getResponseHeader('Content-Encoding');

	      if (encoding && encoding.indexOf('gzip') > -1) {
	        this.getGzippedLength(target, url).then(function (total) {
	          status.total = total;
	          _this4.updateLoadProgress(url, status);
	        });
	      } else {
	        this.updateLoadProgress(url, status);
	      }
	    }

	    /**
	    * Registers a progress callback for the given URL. If multiple listeners are registered
	    * to the same URL, each one will recieve updates.
	    * @method addProgressListener
	    * @private
	    * @param {string} url The url to register the callback with
	    * @param {function} progress The callback to call when recieving updates
	    * @returns {void}
	    */

	  }, {
	    key: 'addProgressListener',
	    value: function addProgressListener(url, progress) {

	      if (!this.progressListeners.hasOwnProperty(url)) {
	        this.progressListeners[url] = [];
	      }

	      this.progressListeners[url].push(progress);
	    }

	    /**
	    * Remove all progress listeners for a given url
	    * @method removeProgressListeners
	    * @private
	    * @param {string} url The url that the listeners are registered with
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
	     * Get the required credentials to load a file, taking into account whether the url
	     * is absolute or relative.
	     * This will be overridden if needed.
	     * @method getCredentialOptions
	     * @param {Boolean} isPathRelative Is the url defined relative to the base content url
	     * @returns {Object} The credentials to use.
	     */

	  }, {
	    key: 'getCredentialOptions',
	    value: function getCredentialOptions() /*isPathRelative*/{
	      return {};
	    }

	    /**
	     * Get loader-specific options for file searching, if any.
	     * @method getFileSearchOptions
	     * @returns {Object} Object containing file search params.
	     */

	  }, {
	    key: 'getFileSearchOptions',
	    value: function getFileSearchOptions() {
	      return {};
	    }

	    /**
	     * Use the base url and the relative url and construct a useable full url for the current loader
	     * This will be overridden if needed.
	     * @method modifyImagePath
	     * @param  {String} baseRepUrl The base content url for representations
	     * @param  {String} url     The relative url of the representation
	     * @returns {String}         The fully qualified url for the representation
	     */

	  }, {
	    key: 'modifyImagePath',
	    value: function modifyImagePath(baseRepUrl, url) {
	      return url;
	    }

	    /**
	     * Use the base url and the relative url and construct a useable full url for the current loader
	     * This will be overridden if needed.
	     * @method modifyGeometryPath
	     * @param  {String} baseUrl The base content url
	     * @param  {String} url     The relative url of the representation
	     * @returns {String}         The fully qualified url for the representation
	     */

	  }, {
	    key: 'modifyGeometryPath',
	    value: function modifyGeometryPath(baseUrl, url) {
	      return baseUrl + url;
	    }

	    /**
	     * Use the base url and the relative url and construct a useable full url for the current loader
	     * This will be overridden if needed.
	     * @method modifyDocumentPath
	     * @param  {String} baseUrl The base content url
	     * @param  {String} url     The relative url of the representation
	     * @returns {String}         The fully qualified url for the representation
	     */

	  }, {
	    key: 'modifyDocumentPath',
	    value: function modifyDocumentPath(baseUrl, url) {
	      return baseUrl + url;
	    }

	    /**
	     * Load a JSON file and return a JavaScript Object.
	     * @method loadDocument
	     * @param {string} baseUrl The representation url for the Box file
	     * @param {Object} params The criteria for determining which representation to load
	     * @param {Function} progress The progress callback
	     * @returns {Promise} a promise that resolves the JSON data
	     */

	  }, {
	    key: 'loadDocument',
	    value: function loadDocument(baseUrl) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progress = arguments[2];


	      var url = this.modifyDocumentPath(baseUrl, 'entities.json');

	      return this.loadResourceFromUrl(url, { responseType: 'json' }, function (response) {
	        return _lie2.default.resolve({
	          data: response.response,
	          properties: {}
	        });
	      }, progress);
	    }

	    /**
	     * Load an image representation from a Box3D package.
	     * @method loadImage
	     * @param {string} baseUrl The representation url for the Box file
	     * @param {object} params The criteria for determining which representation to load
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the image data
	     */

	  }, {
	    key: 'loadImage',
	    value: function loadImage(baseUrl, params, progress) {
	      var _this5 = this;

	      var resource = params.resource;
	      if (!resource) {
	        return _lie2.default.reject(new Error('No valid representation found.'));
	      }
	      var responseType = this.getImageResponseType(resource.compression);

	      var resourceUrl = resource.src;
	      var isRepresentation = !resource.isExternal;
	      if (isRepresentation) {
	        // The path is relative (to our base content path);
	        resourceUrl = this.modifyImagePath(baseUrl, resourceUrl);
	      }

	      // Get the representation URL.
	      return this.loadResourceFromUrl(resourceUrl, Object.assign({ responseType: responseType }, this.getCredentialOptions(isRepresentation)), function (response) {
	        return _this5.parseImage(response, resource);
	      }, progress);
	    }

	    /**
	     * Load the binary file that contains the geometry and return an array buffer.
	     * @method loadGeometry
	     * @param {string} baseUrl The representation url for the Box file
	     * @param {object} params The criteria for determining which representation to load.
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the array buffer
	     */

	  }, {
	    key: 'loadGeometry',
	    value: function loadGeometry(baseUrl) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	      var progress = arguments[2];


	      // Because 3d representation is only entities.json, we'll remove it,
	      // and add geometry.bin
	      var url = this.modifyGeometryPath(baseUrl, 'geometry.bin');

	      return this.loadResourceFromUrl(url, { responseType: 'arraybuffer' }, function (response) {
	        return _lie2.default.resolve({
	          data: response.response,
	          properties: {}
	        });
	      }, progress);
	    }

	    /**
	     * Returns a promise that loads a file from a given URL.
	     * @method loadResourceFromUrl
	     * @private
	     * @param  {String} url        The file to load.
	     * @param  {Object} params     Optional parameters to pass when loading representation.
	     * @param  {Function} processResponse Optional function to do something with the reponse before
	     * completion.
	     * @param  {Function} onProgress Optional progress function.
	     * @returns {Promise}            The promise for loading the file.
	     */

	  }, {
	    key: 'loadResourceFromUrl',
	    value: function loadResourceFromUrl(url) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	      var _this6 = this;

	      var processResponse = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
	      var onProgress = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

	      if (onProgress) {
	        this.addProgressListener(url, onProgress);
	      }
	      var repParams = Object.assign({ url: url }, params);
	      // If the representation is cached, return the cached data; otherwise,
	      // get the representation.
	      if (!this.cache.hasOwnProperty(url)) {
	        this.cache[url] = this.sdkLoader.getRepresentation(url, this.onAssetLoadProgress.bind(this), repParams).then(function (response) {
	          if (processResponse) {
	            return processResponse(response);
	          }
	          return _lie2.default.resolve(response);
	        }).then(function (data) {
	          _this6.removeProgressListeners(url);
	          return _lie2.default.resolve(data);
	        }).catch(function (err) {
	          _this6.removeProgressListeners(url);
	          return _lie2.default.reject(err);
	        });
	      }
	      return this.cache[url];
	    }

	    /**
	     * Given a compression type for a representation (e.g. 'jpeg', 'dxt', etc.), return
	     * the responseType that is expected (e.g. 'blob' or 'arraybuffer')
	     * @method getImageResponseType
	     * @public
	     * @param  {String} compression The compression type for the representation ('jpeg', 'dxt', etc.)
	     * @returns {String}             Either 'blob' or 'arraybuffer'
	     */

	  }, {
	    key: 'getImageResponseType',
	    value: function getImageResponseType(compression) {
	      var responseType = void 0;
	      switch (compression) {
	        case COMPRESSION_TYPE.DXT:
	        case COMPRESSION_TYPE.DXT1:
	        case COMPRESSION_TYPE.DXT5:
	          responseType = 'arraybuffer';
	          break;
	        default:
	          responseType = 'blob';
	          break;
	      }
	      return responseType;
	    }

	    /**
	     * Finds an image resource based on the specified criteria.
	     * @method findImageResource
	     * @param {Box3DAsset} asset The asset that is being loaded
	     * @param {object} params The criteria for determining which representation to load
	     * @returns {object} the resource that best matches the search criteria
	     */

	  }, {
	    key: 'findImageResource',
	    value: function findImageResource(asset) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];


	      var representations = asset.get('representations');
	      if (!representations || representations.length === 0) {
	        throw new Error('Box3DAsset has no resources: ' + asset.getName());
	      }

	      var match = this.findBestMatchImage(representations, params);
	      if (!match) {
	        throw new Error('Unable to find match for given image description');
	      }

	      return match;
	    }

	    /**
	     * Finds an image from a list that best matches the specified criteria.
	     * @method findBestMatchImage
	     * @param {array} representations The list of representations to search through.
	     * @param {object} params The criteria for determining which representation to load
	     * @returns {object} the representation that best matches the search criteria
	     */

	  }, {
	    key: 'findBestMatchImage',
	    value: function findBestMatchImage(representations) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	      var repParams = Object.assign({
	        maxResolution: MAX_IMAGE_RESOLUTION }, params);

	      if (!representations || !(representations instanceof Array)) {
	        throw new Error('Invalid sourceFiles list for image. Must specify a "regular" image.');
	      }

	      // Get closest match for compression param. Compression will either match exactly or
	      // fall back to 'none'
	      var compressionMatches = representations.filter(function (image) {
	        if (image.compression === repParams.compression) {
	          return true;
	        }
	        switch (image.compression) {
	          case COMPRESSION_TYPE.ZIP:
	          case COMPRESSION_TYPE.JPEG:
	            return !repParams.compression;
	          case COMPRESSION_TYPE.DXT:
	          case COMPRESSION_TYPE.DXT1:
	          case COMPRESSION_TYPE.DXT5:
	            return repParams.compression === COMPRESSION_TYPE.DXT;
	        }
	        return false;
	      });
	      // If no matches for the supplied compression exist, try to find the regular images (png or jpg)
	      if (compressionMatches.length === 0) {
	        compressionMatches = representations.filter(function (image) {
	          return image.compression === COMPRESSION_TYPE.ZIP || image.compression === COMPRESSION_TYPE.JPEG;
	        });
	      }

	      var formatMatches = compressionMatches.filter(function (image) {
	        var channels = image.channels || DEFAULT_CHANNELS;
	        return !repParams.channels || channels.toString() === repParams.channels.toString();
	      });

	      if (formatMatches.length === 0) {
	        formatMatches = compressionMatches;
	      }

	      // For each match, compute the difference between its size and the max size.
	      var sizeDiffs = formatMatches.map(function (image) {
	        return repParams.maxResolution - Math.max(image.width || 1, image.height || 1);
	      });

	      // Find the index of the minimum, *positive* “diff”.
	      // This is equivalent to the largest image that is less than or equal to the max specified.
	      var bestIdx = sizeDiffs.reduce(function (bestIdx, currentDiff, currentIdx) {
	        var bestDiff = bestIdx >= 0 ? sizeDiffs[bestIdx] : Number.MAX_VALUE;
	        return currentDiff >= 0 && currentDiff < bestDiff ? currentIdx : bestIdx;
	      }, -1);

	      // Locate the match.
	      return bestIdx >= 0 ? formatMatches[bestIdx] : undefined;
	    }

	    /**
	     * Parses the response and resolves with the correct image tag and image properties.
	     * @method parseImage
	     * @param {object} response A response with the requested image data
	     * @param {object} representation The descriptor for the representation that was loaded
	     * @returns {Promise} a promise that resolves the image data
	     */

	  }, {
	    key: 'parseImage',
	    value: function parseImage(response, representation) {
	      return new _lie2.default(function (resolve, reject) {

	        var data = {
	          properties: {
	            compression: representation.compression,
	            channels: representation.channels || DEFAULT_CHANNELS
	          }
	        };

	        if (response.response instanceof ArrayBuffer) {
	          data.data = response.response;
	          data.properties.width = representation.width;
	          data.properties.height = representation.height;
	          return resolve(data);
	        } else if (response.response instanceof Blob) {
	          try {
	            (function () {
	              var url = URL.createObjectURL(response.response),
	                  img = new Image();

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
	          return reject(new Error('data is not a valid format'));
	        }
	      });
	    }

	    /**
	    * Interface with BoxSDK to halt a single request
	    * @method abortRequest
	    * @param {string} key The key of the XHR that we want to abort
	    * @returns {void}
	    */

	  }, {
	    key: 'abortRequest',
	    value: function abortRequest(key) {

	      var request = this.sdkLoader.xhr.abortRequest(key);
	      // need to also kill listeners on this request
	      if (request && request.srcElement.info) {
	        this.removeAllListeners(request.srcElement.info.url);
	      }
	    }

	    /**
	    * Interface with BoxSDK to halt all requests currently loading
	    * @method abortRequests
	    * @returns {void}
	    */

	  }, {
	    key: 'abortRequests',
	    value: function abortRequests() {
	      var _this7 = this;

	      // clear all progress listeners
	      Object.keys(this.progressListeners).forEach(function (key) {
	        _this7.removeProgressListeners(key);
	      });
	      this.sdkLoader.xhr.abortRequests();
	    }
	  }, {
	    key: 'destroy',
	    value: function destroy() {

	      this.removeAllListeners();
	      this.abortRequests();
	      this.boxSdk.destroy();
	      delete this.sdkLoader;
	      delete this.boxSdk;
	      delete this.id;
	      delete this.fileVersionId;
	      delete this.cache;
	      delete this.gzipSizes;
	    }
	  }]);

	  return BaseLoader;
	}(_events2.default);

	exports.default = BaseLoader;

/***/ },
/* 7 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	function EventEmitter() {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function(n) {
	  if (!isNumber(n) || n < 0 || isNaN(n))
	    throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function(type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events)
	    this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events.error ||
	        (isObject(this._events.error) && !this._events.error.length)) {
	      er = arguments[1];
	      if (er instanceof Error) {
	        throw er; // Unhandled 'error' event
	      }
	      throw TypeError('Uncaught, unspecified "error" event.');
	    }
	  }

	  handler = this._events[type];

	  if (isUndefined(handler))
	    return false;

	  if (isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++)
	      listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function(type, listener) {
	  var m;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events)
	    this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener)
	    this.emit('newListener', type,
	              isFunction(listener.listener) ?
	              listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  else if (isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (isObject(this._events[type]) && !this._events[type].warned) {
	    if (!isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;
	      console.error('(node) warning: possible EventEmitter memory ' +
	                    'leak detected. %d listeners added. ' +
	                    'Use emitter.setMaxListeners() to increase limit.',
	                    this._events[type].length);
	      if (typeof console.trace === 'function') {
	        // not supported in IE 10
	        console.trace();
	      }
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function(type, listener) {
	  var list, position, length, i;

	  if (!isFunction(listener))
	    throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type])
	    return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener ||
	      (isFunction(list.listener) && list.listener === listener)) {
	    delete this._events[type];
	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);

	  } else if (isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener ||
	          (list[i].listener && list[i].listener === listener)) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0)
	      return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener)
	      this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  var key, listeners;

	  if (!this._events)
	    return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0)
	      this._events = {};
	    else if (this._events[type])
	      delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (listeners) {
	    // LIFO order
	    while (listeners.length)
	      this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  var ret;
	  if (!this._events || !this._events[type])
	    ret = [];
	  else if (isFunction(this._events[type]))
	    ret = [this._events[type]];
	  else
	    ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];

	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};

	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
	};

	function isFunction(arg) {
	  return typeof arg === 'function';
	}

	function isNumber(arg) {
	  return typeof arg === 'number';
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isUndefined(arg) {
	  return arg === void 0;
	}


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

	var _lie = __webpack_require__(3);

	var _lie2 = _interopRequireDefault(_lie);

	var _baseLoader = __webpack_require__(6);

	var _baseLoader2 = _interopRequireDefault(_baseLoader);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

	function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               * Runode Resource Loader for Box3D
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               **/


	var RunmodeLoader = function (_BaseLoader) {
	  _inherits(RunmodeLoader, _BaseLoader);

	  /**
	  * Used for loading Box3D Representations from Box Runmodes
	  * @param {string} fileId The file id of the model we are viewing
	  * @param {string} fileVersionId The file version id of the model we are viewing
	  * @param {object} opts Additional properties to add to the loader.
	  *   {BoxSDK} boxSdk and {string} apiBase can be added
	  * @returns {void}
	  */

	  function RunmodeLoader(fileId, fileVersionId) {
	    var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

	    _classCallCheck(this, RunmodeLoader);

	    return _possibleConstructorReturn(this, Object.getPrototypeOf(RunmodeLoader).call(this, fileId, fileVersionId, opts));
	  }

	  /**
	   * @inheritdoc
	   */


	  _createClass(RunmodeLoader, [{
	    key: 'getBaseUrl',
	    value: function getBaseUrl(fileId, fileVersionId /*, validator*/) {
	      // SDK requires that we pass something in as the 3rd param so we'll make it temporary.
	      return this.sdkLoader.buildRepresentationUrl(fileId, fileVersionId, 'temp').then(function (url) {
	        var tokens = url.match(/(.+)temp$/);
	        return _lie2.default.resolve(tokens[1]);
	      });
	    }

	    /**
	     * @inheritdoc
	     */

	  }, {
	    key: 'getFileSearchOptions',
	    value: function getFileSearchOptions() {
	      return { looseMatch: true };
	    }

	    /**
	     * @inheritdoc
	     */

	  }, {
	    key: 'modifyImagePath',
	    value: function modifyImagePath(baseUrl, relativeUrl) {
	      // Convert V2 relative src to runmode path
	      // (e.g., images/1024/0.jpg -> 3dcg_image_1024_jpg/0.jpg)
	      var urlTokens = relativeUrl.match(/^images\/(\d+)\/(\d+)\.(.+)$/);
	      if (!urlTokens) {
	        // Try to match this form - images/1024/rgbe/0.jpg
	        urlTokens = relativeUrl.match(/^images\/(\d+)\/(\w+)\/(\d+)\.(.+)$/);
	        if (!urlTokens) {
	          return _lie2.default.reject(new Error('Unexpected formatting in image representation src.'));
	        }
	      }

	      var length = urlTokens.length;
	      var filename = urlTokens[length - 2] + '.' + urlTokens[length - 1];
	      var fileExtension = urlTokens[length - 1];

	      var folder1 = urlTokens[1];
	      var folder2 = urlTokens.length > 4 ? '_' + urlTokens[2] : '';
	      return '3dcg_images_' + folder1 + folder2 + '_' + fileExtension + '/' + filename;
	    }

	    /**
	     * @inheritdoc
	     */

	  }, {
	    key: 'modifyGeometryPath',
	    value: function modifyGeometryPath(baseUrl /*, url*/) {
	      return baseUrl + '3dcg_bin.bin';
	    }

	    /**
	     * @inheritdoc
	     */

	  }, {
	    key: 'modifyDocumentPath',
	    value: function modifyDocumentPath(baseUrl /*, url*/) {
	      return baseUrl + '3dcg_json.json';
	    }

	    /**
	    * Override of getGzippedLenght, with credentials passing enabled
	    * @param {object} xhr The response xhr with the appropriate headers
	    * @param {string} url The key to store the total size at
	    * @returns {int} The byte size of the asset, with applied compression factor
	    */

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