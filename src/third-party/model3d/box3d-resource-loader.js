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

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var _v2Loader = __webpack_require__(2);

	var _v2Loader2 = _interopRequireDefault(_v2Loader);

	var _runmodeLoader = __webpack_require__(8);

	var _runmodeLoader2 = _interopRequireDefault(_runmodeLoader);

	var _events = __webpack_require__(7);

	var _events2 = _interopRequireDefault(_events);

	var Box3DResourceLoader = (function (_EventEmitter) {
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

	    _get(Object.getPrototypeOf(Box3DResourceLoader.prototype), 'constructor', this).call(this);

	    if (opts.hasOwnProperty('boxSdk') && opts.boxSdk) {
	      this.boxSdk = opts.boxSdk;
	    } else {
	      opts.boxSdk = this.boxSdk = new BoxSDK(opts);
	    }

	    this.loader = null;

	    if (opts.hasOwnProperty('token')) {
	      this.loader = new _v2Loader2['default'](fileId, fileVersionId, opts);
	    } else {
	      // create runmode loader
	      this.loader = new _runmodeLoader2['default'](fileId, fileVersionId, opts);
	    }

	    // delegate all notifcations to the external application
	    this.loader.on('missingAsset', this.onMissingAsset.bind(this));
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
	    value: function load(asset, params, progress) {
	      if (params === undefined) params = {};

	      if (asset.getProperty('isLocal')) {
	        return this.loader.loadLocalAsset(asset, params, progress);
	      } else {
	        return this.loader.loadRemoteAsset(asset, params, progress);
	      }
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
	})(_events2['default']);

	global.Box3DResourceLoader = Box3DResourceLoader;
	module.exports = Box3DResourceLoader;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/**
	* V2 API Resource Loader for Box3D
	**/
	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	var _get = function get(_x6, _x7, _x8) { var _again = true; _function: while (_again) { var object = _x6, property = _x7, receiver = _x8; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x6 = parent; _x7 = property; _x8 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var _lie = __webpack_require__(3);

	var _lie2 = _interopRequireDefault(_lie);

	var _baseLoader = __webpack_require__(6);

	var _baseLoader2 = _interopRequireDefault(_baseLoader);

	var V2Loader = (function (_BaseLoader) {
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

	    /* eslint-disable */
	    if (!opts.parentId) {
	      console.warn('No parent id provided. Be careful, this can cause long requests for file ids, via Search API');
	    }
	    /* eslint-enable */

	    _get(Object.getPrototypeOf(V2Loader.prototype), 'constructor', this).call(this, fileId, fileVersionId, opts);

	    this.token = opts.token;
	    this.parentId = opts.parentId;
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
	    key: 'getAssetIdPromise',
	    value: function getAssetIdPromise(box3dAsset) {
	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	      var fileName = box3dAsset.getProperty('filename');
	      var fileId = box3dAsset.getProperty('fileId');
	      var fileVersionId = box3dAsset.getProperty('fileVersionId');
	      var idPromise = undefined;

	      if (fileId) {
	        idPromise = _lie2['default'].resolve({
	          fileId: fileId,
	          fileVersionId: fileVersionId
	        });
	      } else {
	        // Use search API Instead
	        idPromise = this.sdkLoader.getFileIds(fileName, this.parentId, params);
	      }

	      return idPromise;
	    }

	    /**
	     * Unfortunately, right now, we don't have access to the 32x32 jpgs from a
	     * png representation via new Representations API.
	     * #TODO: Refactor once all Representations && conversion available
	     * @method findImageRepresentation
	     * @param {string} fileId The id of the file to load
	     * @param {Object} params Additional params to search against. We currently
	     * use size and representation
	     * @returns {Object} the representation that best matches the search criteria
	     */
	  }, {
	    key: 'findImageRepresentation',
	    value: function findImageRepresentation(fileId) {
	      var _this = this;

	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	      // TODO: Expand functionality for 32x32 representations, and eventually conversion
	      // We are going to hack into here the represntation we want to get for images
	      return new _lie2['default'](function (resolve, reject) {
	        _this.sdkLoader.xhr.get(_this.apiBase + '/2.0/files/' + fileId + '?fields=representations', null, { responseType: 'json' }).then(function (resp) {
	          if (resp.status !== 200) {
	            return reject(new Error('File Not Found: ' + fileId));
	          }

	          var info = resp.response,
	              representationPath = undefined;

	          if (info.representations && info.representations.entries) {

	            info.representations.entries.some(function (entry) {

	              // for now, only check representations that are ready :D
	              if (entry.status === 'success' && entry.properties) {
	                // #TODO: better check of all values of params vs properties
	                if (entry.properties.dimensions === params.size || entry.representation === params.representation) {

	                  representationPath = entry.links.content.url;
	                  return true;
	                }
	              }
	            });
	          }
	          resolve(representationPath);
	        })['catch'](reject);
	      });
	    }

	    /**
	     * Find a video representation we can load
	     * @param {[type]} fileId [description]
	     * @param {[type]} params =             {} [description]
	     * @returns {[type]} [description]
	     */
	  }, {
	    key: 'findVideoRepresentation',
	    value: function findVideoRepresentation(fileId) {
	      var _this2 = this;

	      var params = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	      return new _lie2['default'](function (resolve, reject) {

	        _this2.sdkLoader.xhr.get(_this2.apiBase + '/2.0/files/' + fileId + '?fields=representations', null, { responseType: 'json' }).then(function (resp) {
	          if (resp.status !== 200) {
	            return reject(new Error('File Not Found: ' + fileId));
	          }

	          var info = resp.response,
	              representationPath = undefined;

	          if (info.representations && info.representations.entries) {

	            info.representations.entries.some(function (entry) {
	              // for now, only check representations that are ready :D
	              if (entry.status === 'success' && entry.representation === params.representation) {
	                representationPath = entry.links.content.url;
	                return true;
	              }
	            });
	          }
	          resolve(representationPath);
	        })['catch'](reject);
	      });
	    }

	    /**
	     * Load an image representation.
	     * @method loadRemoteImage
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {Object} params The criteria for determining which representation to load
	     * @param {Function} progress The progress callback
	     * @returns {Promise} a promise that resolves the image data
	     */
	  }, {
	    key: 'loadRemoteImage',
	    value: function loadRemoteImage(fileId, fileVersionId, params, progress) {
	      var _this3 = this;

	      if (params === undefined) params = {};

	      return new _lie2['default'](function (resolve, reject) {

	        // if no size provided, try and use width and height, or defaults
	        params.size = params.size || (params.width || params.height) ? params.width + 'x' + params.height : '2048x2048';

	        _this3.findImageRepresentation(fileId, params).then(function (url) {

	          //#TODO @jholdstock: Generalize this loading & progress behaviour
	          if (!url) {
	            reject(new Error('No representation available for: ' + fileId));
	          }

	          if (progress) {
	            _this3.addProgressListener(url, progress);
	          }

	          if (!_this3.cache[url]) {

	            _this3.cache[url] = new _lie2['default'](function (resolve, reject) {
	              _this3.sdkLoader.getRepresentation(url, _this3.onAssetLoadProgress.bind(_this3), { responseType: 'blob', info: { url: url } }).then(function (response) {
	                return _this3.parseImage(response, {
	                  size: 2048,
	                  pixelFormat: params.extension === 'png' ? 'rgba' : 'rgb',
	                  compression: 'none'
	                });
	              }).then(function (imgData) {
	                _this3.removeProgressListeners(url);
	                resolve(imgData);
	              })['catch'](function (err) {
	                _this3.removeProgressListeners(url);
	                reject(err);
	              });
	            });
	          }

	          resolve(_this3.cache[url]);
	        })['catch'](reject);
	      });
	    }

	    /**
	     * Load a Video representation
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {Object} params The criteria for determining which representation to load
	     * @returns {Promise} a promise that resolves in video data usable by the Box3DRuntime
	     */
	  }, {
	    key: 'loadRemoteVideo',
	    value: function loadRemoteVideo(fileId, fileVersionId) {
	      var _this4 = this;

	      var params = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

	      params.representation = 'mp4';

	      return new _lie2['default'](function (resolve, reject) {

	        _this4.findVideoRepresentation(fileId, params).then(function (url) {
	          if (!url) {
	            return reject(new Error('No representation available for: ' + fileId));
	          }

	          _this4.parseVideo(url).then(resolve)['catch'](reject);
	        })['catch'](reject);
	      });
	    }

	    /**
	     * Load a binary file and return an array buffer.
	     * @method loadArrayBuffer
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {object} params The criteria for determining which representation to load.
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the array buffer
	     */
	  }, {
	    key: 'loadArrayBuffer',
	    value: function loadArrayBuffer(fileId, fileVersionId, params, progress) {
	      var _this5 = this;

	      if (params === undefined) params = {};

	      params.repParams = {
	        type: '3d'
	      };

	      // what we need to do here is fetch the URL for the json file, and then
	      // pop "entities.json" off the end of it, and push on "geometry.bin"

	      // We need to fetch file info for a content path (it can be a cached url)
	      return this.sdkLoader.buildRepresentationUrl(fileId, fileVersionId, params.repParams).then(function (url) {

	        // Because 3d representation is only entities.json, we'll remove it,
	        // and add geometry.bin
	        url = url.replace('entities.json', 'geometry.bin');

	        if (progress) {
	          _this5.addProgressListener(url, progress);
	        }

	        // If the representation is cached, return the cached data; otherwise,
	        // get the representation.
	        if (!_this5.cache.hasOwnProperty(url)) {

	          _this5.cache[url] = new _lie2['default'](function (resolve, reject) {
	            _this5.sdkLoader.getRepresentation(url, _this5.onAssetLoadProgress.bind(_this5), { responseType: 'arraybuffer', info: { url: url } }).then(function (response) {
	              _this5.removeProgressListeners(url);
	              resolve({
	                data: response.response,
	                properties: {}
	              });
	            })['catch'](function (err) {
	              _this5.removeProgressListeners(url);
	              reject(err);
	            });
	          });
	        }

	        return _this5.cache[url];
	      });
	    }

	    /**
	     * Load a JSON file and return a JavaScript Object.
	     * @method loadJson
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {Object} params The criteria for determining which representation to load
	     * @param {Function} progress The progress callback
	     * @returns {Promise} a promise that resolves the JSON data
	     */
	  }, {
	    key: 'loadJson',
	    value: function loadJson(fileId, fileVersionId, params, progress) {
	      var _this6 = this;

	      if (params === undefined) params = {};

	      params.repParams = {
	        type: '3d'
	      };

	      // Get the representation URL.
	      return this.sdkLoader.buildRepresentationUrl(fileId, fileVersionId, params.repParams).then(function (url) {

	        if (progress) {
	          _this6.addProgressListener(url, progress);
	        }

	        // If the representation is cached, return the cached data; otherwise,
	        // get the representation.
	        if (!_this6.cache.hasOwnProperty(url)) {
	          _this6.cache[url] = new _lie2['default'](function (resolve, reject) {
	            _this6.sdkLoader.getRepresentation(url, _this6.onAssetLoadProgress.bind(_this6), {
	              responseType: 'json',
	              info: { url: url }
	            }).then(function (response) {
	              _this6.removeProgressListeners(url);
	              resolve({
	                data: response.response,
	                properties: {}
	              });
	            })['catch'](function (err) {
	              _this6.removeProgressListeners(url);
	              reject(err);
	            });
	          });
	        }

	        return _this6.cache[url];
	      });
	    }
	  }]);

	  return V2Loader;
	})(_baseLoader2['default']);

	exports['default'] = V2Loader;
	module.exports = exports['default'];

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

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var _lie = __webpack_require__(3);

	var _lie2 = _interopRequireDefault(_lie);

	var _events = __webpack_require__(7);

	var _events2 = _interopRequireDefault(_events);

	var CompressionFactors = {
	  'application/vnd.box.box3d+bin': 1.0
	};

	var BaseLoader = (function (_EventEmitter) {
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

	    _get(Object.getPrototypeOf(BaseLoader.prototype), 'constructor', this).call(this);

	    if (opts.boxSdk) {
	      this.boxSdk = opts.boxSdk;
	    } else {
	      throw new Error('No Box SDK Provided to Loader!');
	    }

	    this.sdkLoader = this.boxSdk.representationLoader;

	    this.fileId = fileId;
	    this.fileVersionId = fileVersionId;

	    this.cache = {};
	    //for tracking progress callbacks
	    this.progressListeners = {};
	    //for caching gzipped asset sizes
	    this.gzipSizes = {};

	    this.apiBase = opts.apiBase !== undefined ? opts.apiBase : undefined;
	  }

	  /**
	   * Load a "remote" (dynamically resolved) Box3DAsset.
	   * @method loadRemoteAsset
	   * @param {Box3DAsset} asset The asset that is being loaded
	   * @param {Object} params The criteria for determining which representation to load
	   * @param {Function} progress The progress callback
	   * @returns {Promise} a promise that resolves the asset data
	   */

	  _createClass(BaseLoader, [{
	    key: 'loadRemoteAsset',
	    value: function loadRemoteAsset(asset, params, progress) {
	      var _this = this;

	      if (params === undefined) params = {};

	      var loadFunc = this.getAssetLoadingMethod(asset);

	      if (!loadFunc) {
	        return _lie2['default'].reject('Asset not supported for loading: ' + asset.type);
	      }

	      loadFunc = loadFunc.bind(this);

	      var idPromise = this.getAssetIdPromise(asset, params);

	      switch (asset.type) {
	        case 'texture2D':
	          {
	            var fileName = asset.getProperty('filename');
	            // Check the file extension to know which representation we need.
	            params.extension = fileName.match(/(\.jpg|\.jpeg|\.gif|\.bmp)$/i) ? 'jpg' : 'png';
	          }
	          break;

	        case 'animation':
	        case 'meshGeometry':
	          {
	            var fileId = asset.getProperty('fileId');
	            var fileVersionId = asset.getProperty('fileVersionId');
	            // Mesh geometry and animation data are part of the 3dcg representation,
	            // so we use the same fileVersionId to fetch them.
	            // #TODO @jholdstock: Need to fix this for external meshes. I believe @dweis
	            // already had a fix for this, but it was never merged.
	            idPromise = _lie2['default'].resolve({
	              fileId: fileId || this.fileId,
	              fileVersionId: fileVersionId || this.fileVersionId
	            });
	          }
	          break;
	      }

	      // First, resolve the fileVersionId, then load the representation.
	      return new _lie2['default'](function (resolve, reject) {
	        idPromise.then(function (fileIds) {
	          return loadFunc(fileIds.fileId, fileIds.fileVersionId, params, progress);
	        }).then(resolve)['catch'](function (err) {
	          _this.onAssetNotFound(asset);
	          reject(err);
	        });
	      });
	    }

	    /**
	     * Get a method of loading a texture
	     * @param {Object} box3dAsset The Box3DAsset to load
	     * @returns {Function} The loading function needed to load the asset
	     */
	  }, {
	    key: 'getAssetLoadingMethod',
	    value: function getAssetLoadingMethod(box3dAsset) {
	      var loadFunc = undefined;

	      switch (box3dAsset.type) {
	        case 'texture2D':
	          loadFunc = this.loadRemoteImage;
	          break;
	        case 'textureVideo':
	          loadFunc = this.loadRemoteVideo;
	          break;
	        case 'animation':
	        /*fall-through*/
	        case 'meshGeometry':
	          loadFunc = this.loadArrayBuffer;
	          break;
	        case 'document':
	          loadFunc = this.loadJson;
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
	    key: 'getAssetIdPromise',
	    value: function getAssetIdPromise() /*box3dAsset, params = {}*/{
	      throw new Error('getAssetIdPromise not implemented!');
	    }

	    /**
	     * Load a "local" (statically resolved) Box3DAsset.
	     * @method loadLocalAsset
	     * @param {Box3DAsset} asset The asset that is being loaded
	     * @param {Object} params The criteria for determining which representation to load
	     * @param {Function} progress The progress callback
	     * @returns {Promise} a promise that resolves the asset data
	     */
	  }, {
	    key: 'loadLocalAsset',
	    value: function loadLocalAsset(asset, params, progress) {
	      if (params === undefined) params = {};

	      var loadFunc = undefined;

	      switch (asset.type) {
	        case 'texture2D':
	        case 'textureCube':
	          loadFunc = this.loadLocalImage.bind(this);
	          break;
	        default:
	          return _lie2['default'].reject(new Error('Asset type not supported for local loading: ' + asset.type));
	      }

	      return loadFunc(asset, params, progress);
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
	        case 'texture2D':
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
	      var _this2 = this;

	      if (!this.gzipSizes[url]) {
	        this.gzipSizes[url] = new _lie2['default'](function (resolve, reject) {
	          // Check type to see if we need to apply a compression factor
	          var factor = CompressionFactors[xhr.getResponseHeader('Content-Type')] || 1;

	          // make the HEAD request for content length
	          _this2.sdkLoader.xhr.makeRequest(xhr.responseURL, 'HEAD', null, null, params).then(function (resp) {
	            var total = resp.getResponseHeader('Content-Length');
	            resolve(total ? total * factor : 0);
	          })['catch'](reject);
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
	      var _this3 = this;

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
	          _this3.updateLoadProgress(url, status);
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
	     * Load a JSON file and return a JavaScript Object.
	     * @method loadJson
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {Object} params The criteria for determining which representation to load
	     * @param {Function} progress The progress callback
	     * @returns {Promise} a promise that resolves the JSON data
	     */
	  }, {
	    key: 'loadJson',
	    value: function loadJson() /*fileId, fileVersionId, params = {}, progress*/{
	      throw new Error('loadJson() Not Implemented');
	    }

	    /**
	     * Load an image representation.
	     * @method loadRemoteImage
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {object} params The criteria for determining which representation to load
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the image data
	     */
	  }, {
	    key: 'loadRemoteImage',
	    value: function loadRemoteImage() /*fileId, fileVersionId, params, progress*/{
	      throw new Error('loadRemoteImage() Not Implemented');
	    }

	    /**
	     * Load a video representation.
	     * @method loadRemoteVideo
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {object} params The criteria for determining which representation to load
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the video data
	     */
	  }, {
	    key: 'loadRemoteVideo',
	    value: function loadRemoteVideo() /*fileId, fileVersionId, params, progress*/{
	      throw new Error('loadRemoteVideo() Not Implemented');
	    }

	    /**
	     * Load a binary file and return an array buffer.
	     * @method loadArrayBuffer
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {object} params The criteria for determining which representation to load.
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the array buffer
	     */
	  }, {
	    key: 'loadArrayBuffer',
	    value: function loadArrayBuffer() /*fileId, fileVersionId, params = {}, progress*/{
	      throw new Error('loadArrayBuffer() not implemented');
	    }

	    /**
	     * Load a "local" image. Local images are statically resolved using the asset's "resources".
	     * @method loadLocalImage
	     * @param {Box3DAsset} asset The asset being loaded
	     * @param {object} params The criteria for deciding which resource to load
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the image data
	     */
	  }, {
	    key: 'loadLocalImage',
	    value: function loadLocalImage(asset, params, progress) {
	      var _this4 = this;

	      var resource = undefined;

	      try {
	        resource = this.findImageResource(asset, params);
	      } catch (err) {
	        return _lie2['default'].reject(err);
	      }

	      var url = resource.path;

	      if (progress) {
	        this.addProgressListener(url, progress);
	      }

	      return new _lie2['default'](function (resolve, reject) {
	        _this4.sdkLoader.get(url, { responseType: 'blob', sendToken: false, withCredentials: false,
	          info: { url: url } }, _this4.onAssetLoadProgress.bind(_this4)).then(function (response) {
	          _this4.removeProgressListeners(url);
	          return _this4.parseImage(response, resource.properties);
	        }).then(resolve)['catch'](function (err) {
	          _this4.removeProgressListeners(url);
	          reject(err);
	        });
	      });
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
	    value: function findImageResource(asset /*, params*/) {

	      // TODO: intelligently find a resource based on params.
	      var resources = asset.get('resources');

	      if (!resources || resources.length === 0) {
	        throw new Error('Box3DAsset has no resources: ' + asset.getName());
	      }

	      return resources[0];
	    }

	    /**
	     * Finds an image representation based on the specified criteria.
	     * @method findImageRepresentation
	     * @param {object} params The criteria for determining which representation to load
	     * @returns {object} the representation that best matches the search criteria
	     */
	  }, {
	    key: 'findImageRepresentation',
	    value: function findImageRepresentation() /*params*/{

	      throw new Error('findImageRepresentation() Not Implemented');
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

	      return new _lie2['default'](function (resolve, reject) {
	        try {
	          (function () {
	            var url = URL.createObjectURL(response.response),
	                img = new Image();

	            img.onload = function () {
	              var data = {
	                data: img,
	                properties: {
	                  width: img.width,
	                  height: img.height,
	                  compression: representation.compression || 'none',
	                  pixelFormat: representation.pixelFormat || 'rgb',
	                  packingFormat: representation.packingFormat
	                }
	              };

	              resolve(data);
	            };

	            img.src = url;
	          })();
	        } catch (err) {
	          reject(err);
	        }
	      });
	    }

	    /**
	     * Create a video usable by the Box3DRuntime
	     * @param {String} videoUrl The src url for the video asset
	     * @param {Object} representation  The descriptor for the representation that was loaded
	     * @returns {Promise} A promise that resolves with video data usable by Box3DRuntime
	     */
	  }, {
	    key: 'parseVideo',
	    value: function parseVideo(videoUrl /*, representation = {}*/) {
	      var videoTag = document.createElement('video');
	      videoTag.src = videoUrl;

	      return _lie2['default'].resolve({
	        data: videoTag
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
	      var _this5 = this;

	      // clear all progress listeners
	      Object.keys(this.progressListeners).forEach(function (key) {
	        _this5.removeProgressListeners(key);
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
	})(_events2['default']);

	exports['default'] = BaseLoader;
	module.exports = exports['default'];

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
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++)
	          args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++)
	      args[i - 1] = arguments[i];

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
	    var m;
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
	  } else {
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

	EventEmitter.listenerCount = function(emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type])
	    ret = 0;
	  else if (isFunction(emitter._events[type]))
	    ret = 1;
	  else
	    ret = emitter._events[type].length;
	  return ret;
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

	/**
	* Runode Resource Loader for Box3D
	**/
	'use strict';

	Object.defineProperty(exports, '__esModule', {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var _lie = __webpack_require__(3);

	var _lie2 = _interopRequireDefault(_lie);

	var _baseLoader = __webpack_require__(6);

	var _baseLoader2 = _interopRequireDefault(_baseLoader);

	// Available image representations
	var ImageRepresentations = [{
	  extension: 'jpg',
	  size: 32,
	  pixelFormat: 'rgb',
	  compression: 'none',
	  path: 'thumb_32_jpg/1.jpg'
	}, {
	  extension: 'jpg',
	  size: 2048,
	  pixelFormat: 'rgb',
	  compression: 'none',
	  path: 'image_2048_jpg/1.jpg'
	}, {
	  extension: 'png', //need to use a 32 jpg here bc a png representation does not exist
	  size: 32,
	  pixelFormat: 'rgb',
	  compression: 'none',
	  path: 'thumb_32_jpg/1.jpg'
	}, {
	  extension: 'png',
	  size: 2048,
	  pixelFormat: 'rgba',
	  compression: 'none',
	  path: 'image_2048/1.png'
	}];

	var RunmodeLoader = (function (_BaseLoader) {
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

	    _get(Object.getPrototypeOf(RunmodeLoader.prototype), 'constructor', this).call(this, fileId, fileVersionId, opts);
	  }

	  /**
	  * See base-loader.js for base functionality.
	  * @param {object} asset The verold asset to load
	  * @param {object} params The parameters we want to pass to the BoxSDK and base loader.
	  * Used for things like xhr key, progress id, and looseMatch mode
	  * @param {function|null} progress The progress callback, on xhr load progress
	  * @returns {Promise} a promise that resolves in the loaded and parsed data for Box3D
	  */

	  _createClass(RunmodeLoader, [{
	    key: 'loadRemoteAsset',
	    value: function loadRemoteAsset(asset, params, progress) {
	      if (params === undefined) params = {};

	      params.looseMatch = true;

	      return _get(Object.getPrototypeOf(RunmodeLoader.prototype), 'loadRemoteAsset', this).call(this, asset, params, progress);
	    }

	    /**
	     * @inheritdoc
	     */
	  }, {
	    key: 'getAssetIdPromise',
	    value: function getAssetIdPromise(box3dAsset) {
	      var fileName = box3dAsset.getProperty('filename');
	      var fileId = box3dAsset.getProperty('fileId');
	      var fileVersionId = box3dAsset.getProperty('fileVersionId');
	      var idPromise = undefined;

	      if (fileId) {
	        idPromise = _lie2['default'].resolve({
	          fileId: fileId,
	          fileVersionId: fileVersionId
	        });
	      } else {
	        // Use search API Instead
	        idPromise = this.sdkLoader.getFileIds(fileName, this.fileId, { looseMatch: true });
	      }

	      return idPromise;
	    }

	    /**
	     * Load an image representation.
	     * @method loadRemoteImage
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {Object} params The criteria for determining which representation to load
	     * @param {Function} progress The progress callback
	     * @returns {Promise} a promise that resolves the image data
	     */
	  }, {
	    key: 'loadRemoteImage',
	    value: function loadRemoteImage(fileId, fileVersionId, params, progress) {
	      var _this = this;

	      var representation = undefined,
	          url = undefined;

	      // Find a suitable representation.
	      try {
	        representation = this.findImageRepresentation(params);
	      } catch (err) {
	        return _lie2['default'].reject(err);
	      }

	      // Get the representation URL.
	      return this.sdkLoader.buildRepresentationUrl(fileId, fileVersionId, representation.path).then(function (url) {

	        if (progress) {
	          _this.addProgressListener(url, progress);
	        }

	        // If the representation is cached, return the cached data; otherwise,
	        // get the representation.
	        if (!_this.cache.hasOwnProperty(url)) {
	          _this.cache[url] = new _lie2['default'](function (resolve, reject) {
	            _this.sdkLoader.getRepresentation(url, _this.onAssetLoadProgress.bind(_this), { responseType: 'blob', info: { url: url } }).then(function (response) {
	              return _this.parseImage(response, representation);
	            }).then(function (imgData) {
	              if (params.width && imgData.properties.width > params.width || params.height && imgData.properties.height > params.height) {
	                // 2048 representation dimensions are larger than that of the width/height
	                // that has been requested. Fallback to the 32 representation
	                params.size = 32;
	                resolve(_this.loadRemoteImage(fileId, fileVersionId, params));
	              } else {
	                _this.removeProgressListeners(url);
	                resolve(imgData);
	              }
	            })['catch'](function (err) {
	              _this.removeProgressListeners(url);
	              reject(err);
	            });
	          });
	        }

	        return _this.cache[url];
	      });
	    }
	  }, {
	    key: 'loadRemoteVideo',
	    value: function loadRemoteVideo(fileId, fileVersionId) /*, progress*/{
	      var _this2 = this;

	      var params = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

	      params.repParams = 'video_480.mp4';

	      return this.sdkLoader.buildRepresentationUrl(fileId, fileVersionId, params.repParams).then(function (url) {
	        if (!_this2.cache.hasOwnProperty(url)) {
	          _this2.cache[url] = _this2.parseVideo(url);
	        }

	        return _this2.cache[url];
	      });
	    }

	    /**
	     * Load a binary file and return an array buffer.
	     * @method loadArrayBuffer
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {object} params The criteria for determining which representation to load.
	     * @param {function} progress The progress callback
	     * @returns {Promise} a promise that resolves the array buffer
	     */
	  }, {
	    key: 'loadArrayBuffer',
	    value: function loadArrayBuffer(fileId, fileVersionId, params, progress) {
	      var _this3 = this;

	      if (params === undefined) params = {};

	      params.repParams = '3dcg_bin.bin';

	      // Get the representation URL.
	      return this.sdkLoader.buildRepresentationUrl(fileId, fileVersionId, params.repParams).then(function (url) {

	        if (progress) {
	          _this3.addProgressListener(url, progress);
	        }
	        // If the representation is cached, return the cached data; otherwise,
	        // get the representation.
	        if (!_this3.cache.hasOwnProperty(url)) {
	          _this3.cache[url] = new _lie2['default'](function (resolve, reject) {
	            _this3.sdkLoader.getRepresentation(url, _this3.onAssetLoadProgress.bind(_this3), { responseType: 'arraybuffer', info: { url: url } }).then(function (response) {
	              _this3.removeProgressListeners(url);
	              resolve({
	                data: response.response,
	                properties: {}
	              });
	            })['catch'](function (err) {
	              _this3.removeProgressListeners(url);
	              reject(err);
	            });
	          });
	        }

	        return _this3.cache[url];
	      });
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

	    /**
	     * Load a JSON file and return a JavaScript Object.
	     * @method loadJson
	     * @param {string} fileId The ID of the file we are going to load
	     * @param {string} fileVersionId The file version ID of the file to load
	     * @param {Object} params The criteria for determining which representation to load
	     * @param {Function} progress The progress callback
	     * @returns {Promise} a promise that resolves the JSON data
	     */
	  }, {
	    key: 'loadJson',
	    value: function loadJson(fileId, fileVersionId, params, progress) {
	      var _this4 = this;

	      if (params === undefined) params = {};

	      params.repParams = '3dcg_json.json';

	      // Get the representation URL.
	      var url = this.sdkLoader.buildRepresentationUrl(fileId, fileVersionId, params.repParams);

	      if (progress) {
	        this.addProgressListener(url, progress);
	      }

	      // If the representation is cached, return the cached data; otherwise,
	      // get the representation.
	      if (!this.cache.hasOwnProperty(url)) {
	        this.cache[url] = new _lie2['default'](function (resolve, reject) {
	          _this4.sdkLoader.getRepresentation(url, _this4.onAssetLoadProgress.bind(_this4), {
	            responseType: 'json',
	            info: { url: url }
	          }).then(function (response) {
	            _this4.removeProgressListeners(url);
	            resolve({
	              data: response.response,
	              properties: {}
	            });
	          })['catch'](function (err) {
	            _this4.removeProgressListeners(url);
	            reject(err);
	          });
	        });
	      }

	      return this.cache[url];
	    }

	    /**
	     * Finds an image representation based on the specified criteria.
	     * @method findImageRepresentation
	     * @param {Object} params The criteria for determining which representation to load
	     * @returns {Object} the representation that best matches the search criteria
	     */
	  }, {
	    key: 'findImageRepresentation',
	    value: function findImageRepresentation(params) {

	      var size = params.size,
	          extension = params.extension || 'png';

	      // Attempt to get width and height and use for size.
	      if (!size) {
	        // Using default 2048 as it is the representation we want to hit first.
	        size = Math.max(isNaN(params.width) ? 2048 : params.width, isNaN(params.height) ? 2048 : params.height);
	      }

	      // Filter representations by by pixel format.
	      var matches = [];

	      ImageRepresentations.forEach(function (representation) {
	        if (extension === representation.extension) {
	          matches.push(representation);
	        }
	      });

	      // Check to see if there are any matches.
	      if (matches.length === 0) {
	        throw new Error('No matching image representations found');
	      }

	      // Sort available representations by size (BIGGEST to smallest).
	      matches.sort(function (a, b) {
	        return b.size - a.size;
	      });

	      // Default to the largest image size.
	      var match = matches[0];

	      // Round up to the closest image size. (Working our way from LARGEST to smallest)
	      matches.forEach(function (representation) {
	        if (size <= representation.size) {
	          match = representation;
	        }
	      });

	      return match;
	    }
	  }]);

	  return RunmodeLoader;
	})(_baseLoader2['default']);

	exports['default'] = RunmodeLoader;
	module.exports = exports['default'];

/***/ }
/******/ ]);