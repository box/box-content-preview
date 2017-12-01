/* eslint-disable import/first */
import './polyfill';
import EventEmitter from 'events';
import throttle from 'lodash.throttle';
import cloneDeep from 'lodash.clonedeep';
/* eslint-enable import/first */
import Browser from './Browser';
import FileMetrics from './FileMetrics';
import Logger from './logging/Logger';
import loaderList from './loaders';
import Cache from './Cache';
import PreviewErrorViewer from './viewers/error/PreviewErrorViewer';
import PreviewUI from './PreviewUI';
import getTokens from './tokens';
import {
    get,
    post,
    decodeKeydown,
    openUrlInsideIframe,
    getHeaders,
    findScriptLocation,
    appendQueryParams
} from './util';
import { getURL, getDownloadURL, checkPermission, checkFeature, checkFileValid, cacheFile, uncacheFile } from './file';
import {
    API_HOST,
    APP_HOST,
    CLASS_NAVIGATION_VISIBILITY,
    EVENT_LOG,
    FILE_EXT_ERROR_MAP,
    PERMISSION_DOWNLOAD,
    PERMISSION_PREVIEW,
    PREVIEW_SCRIPT_NAME,
    X_REP_HINT_BASE,
    X_REP_HINT_DOC_THUMBNAIL,
    X_REP_HINT_IMAGE,
    X_REP_HINT_VIDEO_DASH,
    X_REP_HINT_VIDEO_MP4
} from './constants';
import {
    METRIC_FILE_PREVIEW_SUCCESS,
    METRIC_FILE_PREVIEW_FAIL,
    METRIC_CONTROL,
    METRIC_CONTROL_ACTIONS
} from './logging/metricsConstants';
import { LOG_CODES } from './logging/logConstants';
import './Preview.scss';

const DEFAULT_DISABLED_VIEWERS = ['Office']; // viewers disabled by default
const PREFETCH_COUNT = 4; // number of files to prefetch
const MOUSEMOVE_THROTTLE = 1500; // for showing or hiding the navigation icons
const RETRY_TIMEOUT = 500; // retry network request interval for a file
const RETRY_COUNT = 5; // number of times to retry network request for a file
const KEYDOWN_EXCEPTIONS = ['INPUT', 'SELECT', 'TEXTAREA']; // Ignore keydown events on these elements
const LOG_RETRY_TIMEOUT = 500; // retry interval for logging preview event
const LOG_RETRY_COUNT = 3; // number of times to retry logging preview event

// All preview assets are relative to preview.js. Here we create a location
// object that mimics the window location object and points to where
// preview.js is loaded from by the browser. This needs to be done statically
// outside the class so that location is found while this script is executing
// and not when preview is instantiated, which is too late.
const PREVIEW_LOCATION = findScriptLocation(PREVIEW_SCRIPT_NAME, document.currentScript);

class Preview extends EventEmitter {
    /** @property {boolean} - Whether preview is open */
    open = false;

    /** @property {Object} - Analytics that span across preview sessions */
    count = {
        success: 0, // Counts how many previews have happened overall
        error: 0, // Counts how many errors have happened overall
        navigation: 0 // Counts how many previews have happened by prev next navigation
    };

    /** @property {Object} - Current file being previewed */
    file = {};

    /** @property {Object} - User-specified preview options */
    previewOptions = {};

    /** @property {Object} - Parsed & computed preview options */
    options = {};

    /** @property {Object} - Map of disabled viewer names */
    disabledViewers = {};

    /** @property {string} - Access token */
    token = '';

    /** @property {Object} - Current viewer instance */
    viewer;

    /** @property {string[]} - List of file IDs to preview */
    collection = [];

    /** @property {AssetLoader[]} - List of asset loaders */
    loaders = loaderList;

    /** @property {FileMetrics} - File metrics tracker instance */
    fileMetrics;

    /** @property {number} - Number of times a particular preview has been retried */
    retryCount = 0;

    /** @property {number} - Number of times a particular logging call cas been retried */
    logRetryCount = 0;

    /** @property {number} - Reference to preview retry timeout */
    retryTimeout;

    /** @property {HTMLElement} - Preview DOM container */
    container;

    /** @property {Function} - Throttled mousemove handler */
    throttledMousemoveHandler;

    /** @property {Cache} - Preview's cache instance */
    cache;

    /** @property {PreviewUI} - Preview's UI instance */
    ui;

    /** @property {Logger} - Preview's Logger instance */
    logger;

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @return {Preview} Preview instance
     */
    constructor() {
        super();

        DEFAULT_DISABLED_VIEWERS.forEach((viewerName) => {
            this.disabledViewers[viewerName] = 1;
        });

        // All preview assets are relative to preview.js. Here we create a location
        // object that mimics the window location object and points to where
        // preview.js is loaded from by the browser.
        this.location = PREVIEW_LOCATION;

        this.cache = new Cache();
        this.ui = new PreviewUI();
        this.browserInfo = Browser.getBrowserInfo();
        this.logger = new Logger({
            locale: this.location.locale
        });

        // Bind context for callbacks
        this.print = this.print.bind(this);
        this.handleTokenResponse = this.handleTokenResponse.bind(this);
        this.handleFileInfoResponse = this.handleFileInfoResponse.bind(this);
        this.handleFetchError = this.handleFetchError.bind(this);
        this.handleViewerEvents = this.handleViewerEvents.bind(this);
        this.triggerError = this.triggerError.bind(this);
        this.throttledMousemoveHandler = this.getGlobalMousemoveHandler().bind(this);
        this.navigateLeft = this.navigateLeft.bind(this);
        this.navigateRight = this.navigateRight.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        this.uiNavigateLeft = this.uiNavigateLeft.bind(this);
        this.uiNavigateRight = this.uiNavigateRight.bind(this);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        // Destroy viewer
        if (this.viewer && typeof this.viewer.destroy === 'function') {
            this.viewer.destroy();
        }

        this.viewer = undefined;
    }

    /**
     * Primary function for showing a preview of a file.
     *
     * @public
     * @param {string|Object} fileIdOrFile - Box File ID or well-formed Box File object
     * @param {string|Function} token - Access token string or generator function
     * @param {Object} [options] - Optional preview options
     * @return {void}
     */
    show(fileIdOrFile, token, options = {}) {
        // Save a reference to the options to be re-used later.
        // Token should either be a function or a string.
        // Token can also be null or undefined for offline use case.
        // But it cannot be a random object.
        if (token === null || typeof token !== 'object') {
            this.previewOptions = Object.assign({}, options, { token });
        } else {
            throw new Error('Bad access token!');
        }

        // Update the optional file navigation collection and caches
        // if proper valid file objects were passed in.
        this.updateCollection(options.collection);

        // Load the preview
        this.load(fileIdOrFile);
    }

    /**
     * Destroys and hides the preview.
     *
     * @public
     * @return {void}
     */
    hide() {
        // Indicate preview is closed
        this.open = false;

        // Destroy the viewer and cleanup preview
        this.destroy();

        // Clean the UI
        this.ui.cleanup();

        // Nuke the file
        this.file = undefined;

        // Clear logger from logging out of date file info
        this.logger.setFile(null);
        this.logger.setContentType(null);
    }

    /**
     * Updates files to navigate between. Collection can be of files
     * or file ids or a mix. We normalize here to file ids for easier
     * indexing and cache only the well-formed file objects if provided.
     *
     * @public
     * @param {string[]} [collection] - Updated collection of file or file IDs
     * @return {void}
     */
    updateCollection(collection) {
        const fileOrIds = Array.isArray(collection) ? collection : [];
        const files = [];
        const fileIds = [];

        fileOrIds.forEach((fileOrId) => {
            if (fileOrId && typeof fileOrId === 'string') {
                // String id found in the collection
                fileIds.push(fileOrId);
            } else if (fileOrId && typeof fileOrId === 'object' && typeof fileOrId.id === 'string') {
                // Possible well-formed file object found in the collection
                fileIds.push(fileOrId.id);
                files.push(fileOrId);
            } else {
                throw new Error('Bad collection provided!');
            }
        });

        // Update the cache with possibly well-formed file objects.
        this.updateFileCache(files);

        // Collection always uses string ids for easier indexing.
        this.collection = fileIds;

        // Since update collection is a public method, it can be
        // called anytime to update navigation. If we are showing
        // a preview already show or hide the navigation arrows.
        if (this.file) {
            this.ui.showNavigation(this.file.id, this.collection);
        }
    }

    /**
     * Updates the file cache with the provided file metadata. Can be used to
     * improve performance if file metadata can be fetched at some point before
     * a file is previewed. Note that we only do simple validation that the
     * expected properties exist before caching.
     *
     * @public
     * @param {Object[]|Object} [fileMetadata] - Array or single file metadata to cache
     * @return {void}
     */
    updateFileCache(fileMetadata = []) {
        let files = fileMetadata;
        if (!Array.isArray(files)) {
            files = [fileMetadata];
        }

        files.forEach((file) => {
            if (file.watermark_info && file.watermark_info.is_watermarked) {
                return;
            }

            if (checkFileValid(file)) {
                cacheFile(this.cache, file);
            } else {
                this.logger.error('[Preview SDK] Tried to cache invalid file: ', file);
            }
        });
    }

    /**
     * Returns the current viewer.
     *
     * @public
     * @return {Object|undefined} Current viewer
     */
    getCurrentViewer() {
        return this.viewer;
    }

    /**
     * Returns the current file being previewed.
     *
     * @public
     * @return {Object|null} Current file
     */
    getCurrentFile() {
        return this.file;
    }

    /**
     * Returns the current collection of files that preview is aware of.
     *
     * @public
     * @return {Object|null} Current collection
     */
    getCurrentCollection() {
        return this.collection;
    }

    /**
     * Returns the list of viewers that Preview supports.
     *
     * @public
     * @return {string[]} List of supported viewers
     */
    getViewers() {
        let viewers = [];
        this.loaders.forEach((loader) => {
            viewers = viewers.concat(loader.getViewers());
        });
        return viewers;
    }

    /**
     * Disables one or more viewers.
     *
     * @public
     * @param {string|string[]} viewers - destroys the container contents
     * @return {void}
     */
    disableViewers(viewers) {
        if (Array.isArray(viewers)) {
            viewers.forEach((viewer) => {
                this.disabledViewers[viewer] = 1;
            });
        } else if (viewers) {
            this.disabledViewers[viewers] = 1;
        }
    }

    /**
     * Enables one or more viewers.
     *
     * @public
     * @param {string|string[]} viewers - destroys the container contents
     * @return {void}
     */
    enableViewers(viewers) {
        if (Array.isArray(viewers)) {
            viewers.forEach((viewer) => {
                delete this.disabledViewers[viewer];
            });
        } else if (viewers) {
            delete this.disabledViewers[viewers];
        }
    }

    /**
     * Disables keyboard shortcuts / hotkeys for Preview.
     *
     * @public
     * @return {void}
     */
    disableHotkeys() {
        this.options.useHotkeys = false;
    }

    /**
     * Enables keyboard shortcuts / hotkeys for Preview.
     *
     * @public
     * @return {void}
     */
    enableHotkeys() {
        this.options.useHotkeys = true;
    }

    /**
     * Resizes the preview.
     *
     * @public
     * @return {void}
     */
    resize() {
        if (this.viewer && typeof this.viewer.resize === 'function') {
            this.viewer.resize();
        }
    }

    /**
     * Prints the file being previewed if the viewer supports printing.
     *
     * @public
     * @return {void}
     */
    print() {
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && checkFeature(this.viewer, 'print')) {
            this.viewer.print();
        }
    }

    /**
     * Downloads the file being previewed.
     *
     * @public
     * @return {void}
     */
    download() {
        const { apiHost, queryParams } = this.options;

        if (checkPermission(this.file, PERMISSION_DOWNLOAD)) {
            // Append optional query params
            const downloadUrl = appendQueryParams(getDownloadURL(this.file.id, apiHost), queryParams);
            get(downloadUrl, this.getRequestHeaders()).then((data) => {
                openUrlInsideIframe(data.download_url);
            });
        }
    }

    /**
     * Updates the token Preview uses. Passed in parameter can either be a
     * string token or token generation function. See tokens.js.
     *
     * @public
     * @param {string|Function} tokenOrTokenFunc - Either an access token or token
     * generator function
     * @param {boolean} [reloadPreview] - Whether or not to reload the current
     * preview with the updated token, defaults to true
     * @return {void}
     */
    updateToken(tokenOrTokenFunc, reloadPreview = true) {
        this.previewOptions.token = tokenOrTokenFunc;

        if (reloadPreview) {
            this.load(this.file.id);
        }
    }

    /**
     * Prefetches a file's viewer assets and content if possible so the browser
     * can cache the content and significantly improve preview load time. If
     * preload is true, we don't prefetch the file's actual content and instead
     * prefetch a lightweight representation, aka preload, of the file so that
     * can be shown while the full preview is loading. For example, a document's
     * preload representation is a jpg of the first page.
     *
     * Note that for prefetching to work, the same authentication params (token,
     * shared link, shared link password) must be used when prefetching and
     * when the actual view happens.
     *
     * @public
     * @param {Object} options - Prefetch options
     * @param {string} options.fileId - Box File ID
     * @param {string} options.token - Access token
     * @param {string} options.sharedLink - Shared link
     * @param {string} options.sharedLinkPassword - Shared link password
     * @param {boolean} options.preload - Is this prefetch for a preload
     * @param {string} token - Access token
     * @return {void}
     */
    prefetch({ fileId, token, sharedLink = '', sharedLinkPassword = '', preload = false }) {
        let file;
        let loader;
        let viewer;

        // Determining the viewer could throw an error
        try {
            file = this.cache.get(fileId);
            loader = file ? this.getLoader(file) : null;
            viewer = loader ? loader.determineViewer(file) : null;
            if (!viewer) {
                return;
            }
        } catch (err) {
            this.logger.error(`Error prefetching file ID ${fileId} - ${err}`);
            return;
        }

        const options = {
            viewer,
            file,
            token,
            // Viewers may ignore this representation when prefetching a preload
            representation: loader.determineRepresentation(file, viewer)
        };

        // If we are prefetching for preload, shared link and password are not set on
        // the global this.options for the viewers to use, so we must explicitly pass
        // them in
        if (preload) {
            options.sharedLink = sharedLink;
            options.sharedLinkPassword = sharedLinkPassword;
        }

        const viewerInstance = new viewer.CONSTRUCTOR(this.createViewerOptions(options));
        if (typeof viewerInstance.prefetch === 'function') {
            viewerInstance.prefetch({
                assets: true,
                // Prefetch preload if explicitly requested or if viewer has 'preload' option set
                preload: preload || viewerInstance.getViewerOption('preload'),
                // Don't prefetch file's representation content if this is for preload
                content: !preload
            });
        }
    }

    /**
     * Prefetches static viewer assets for the specified viewers.
     *
     * @public
     * @param {string[]} [viewerNames] - Names of viewers to prefetch, defaults to none
     * @return {void}
     */
    prefetchViewers(viewerNames = []) {
        this.getViewers()
            .filter((viewer) => viewerNames.indexOf(viewer.NAME) !== -1)
            .forEach((viewer) => {
                const viewerInstance = new viewer.CONSTRUCTOR(
                    this.createViewerOptions({
                        viewer
                    })
                );

                if (typeof viewerInstance.prefetch === 'function') {
                    viewerInstance.prefetch({
                        assets: true,
                        preload: false,
                        content: false
                    });
                }
            });
    }

    /**
     * Setup additional configuration for the logger.
     *
     * @param {Object} config - Configures log level and network layer.
     * @param {LOG_LEVELS|string} [config.logLevel] - Level to set for writing to the browser console.
     * @param {boolean} [config.savingEnabled] - If true, allows saving of logs to a backend.
     * @param {string} [config.logURL] - Full url to save logs to. Can instead use appHost with logEndpoint (see below)
     * @param {string} [config.appHost] - Base URL to save logs to. Is combined with logEndpoint (below)
     * @param {string} [config.logEndpoint] - URL Tail to save logs to. Combined with appHost (above)
     * @param {Object} [config.auth] - Authorization object containing a header named <header>, with value: <value>
     * @param {string} [config.locale] - User's locale
     * @param {Object} [config.allowedLogs] - Logs that are allowed to be saved to the backend.
     * @return {void}
     */
    setupLogger(config = {}) {
        const { logLevel } = config;
        if (logLevel) {
            this.logger.setLogLevel(logLevel);
        }

        this.logger.setupBackend(config);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Initial method for loading a preview.
     *
     * @private
     * @param {string|Object} fileIdOrFile - Box File ID or well-formed Box File object
     * @return {void}
     */
    load(fileIdOrFile) {
        // Clean up any existing previews before loading
        this.destroy();

        // Indicate preview is open
        this.open = true;

        // Init performance logging
        this.fileMetrics = new FileMetrics(this.location.locale, this.browserInfo);

        // Clear any existing retry timeouts
        clearTimeout(this.retryTimeout);

        // Save reference to the currently shown file, if any
        const currentFileId = this.file ? this.file.id : undefined;

        // Check if file ID or well-formed file object was passed in
        if (typeof fileIdOrFile === 'string') {
            // Use cached file data if available, otherwise create empty file object
            this.file = this.cache.get(fileIdOrFile) || { id: fileIdOrFile };
        } else if (checkFileValid(fileIdOrFile)) {
            // Use well-formed file object if available
            this.file = fileIdOrFile;
        } else if (!!fileIdOrFile && typeof fileIdOrFile.id === 'string') {
            // File is not a well-formed file object but has an id
            this.file = { id: fileIdOrFile.id };
        } else {
            throw new Error(
                'File is not a well-formed Box File object. See FILE_FIELDS in file.js for a list of required fields.'
            );
        }

        // Set logger to use up to date file info
        this.logger.setFile(this.file);

        // Retry up to RETRY_COUNT if we are reloading same file
        if (this.file.id === currentFileId) {
            this.retryCount += 1;
        } else {
            this.retryCount = 0;
        }

        // Fetch access tokens before proceeding
        getTokens(this.file.id, this.previewOptions.token)
            .then(this.handleTokenResponse)
            .catch(this.handleFetchError);
    }

    /**
     * Loads preview for the current file given access tokens.
     *
     * @private
     * @param {Object} tokenMap - Map of file ID to access token
     * @return {void}
     */
    handleTokenResponse(tokenMap) {
        // If this is a retry, short-circuit and load from server
        if (this.retryCount > 0) {
            this.loadFromServer();
            return;
        }

        // Parse the preview options supplied by show()
        this.parseOptions(this.previewOptions, tokenMap);

        // Setup the shell
        this.container = this.ui.setup(
            this.options,
            this.keydownHandler,
            this.uiNavigateLeft,
            this.uiNavigateRight,
            this.throttledMousemoveHandler
        );

        // Setup loading UI and progress bar
        this.ui.showLoadingIndicator();
        this.ui.startProgressBar();

        // Update navigation
        this.ui.showNavigation(this.file.id, this.collection);

        if (checkFileValid(this.file)) {
            // Save file in cache. This also adds the 'ORIGINAL' representation.
            cacheFile(this.cache, this.file);
            this.loadFromCache();
        } else {
            // Cache miss, fetch from the server.
            this.loadFromServer();
        }
    }

    /**
     * Parses preview options.
     *
     * @private
     * @param {Object} previewOptions - Options specified by show()
     * @param {Object} tokenMap - Map of file ID to access token
     * @return {void}
     */
    parseOptions(previewOptions, tokenMap) {
        const options = Object.assign({}, previewOptions);

        // Reset all options
        this.options = {};

        // Container for preview
        this.options.container = options.container;

        // Authorization token
        this.options.token = tokenMap[this.file.id];

        // Shared link URL
        this.options.sharedLink = options.sharedLink;

        // Shared link password
        this.options.sharedLinkPassword = options.sharedLinkPassword;

        // Save reference to API host
        this.options.apiHost = options.apiHost ? options.apiHost.replace(/\/$/, '') : API_HOST;

        // Save reference to the app host
        this.options.appHost = options.appHost ? options.appHost.replace(/\/$/, '') : APP_HOST;

        // Show or hide the header
        this.options.header = options.header || 'light';

        // Custom logo URL
        this.options.logoUrl = options.logoUrl || '';

        // Whether download button should be shown
        this.options.showDownload = !!options.showDownload;

        // Whether annotations and annotation controls should be shown
        this.options.showAnnotations = !!options.showAnnotations;

        // Enable or disable hotkeys
        this.options.useHotkeys = options.useHotkeys !== false;

        // Custom Box3D application definition
        this.options.box3dApplication = options.box3dApplication;

        // Save the reference to any additional custom options for viewers
        this.options.viewers = options.viewers || {};

        // Skip load from server and any server updates
        this.options.skipServerUpdate = !!options.skipServerUpdate;

        // Optional additional query params to append to requests
        this.options.queryParams = options.queryParams || {};

        // Prefix any user created loaders before our default ones
        this.loaders = (options.loaders || []).concat(loaderList);

        // Disable or enable viewers based on viewer options
        Object.keys(this.options.viewers).forEach((viewerName) => {
            const isDisabled = this.options.viewers[viewerName].disabled;

            // Explicitly check for booleans, disabled:false will override any default disabling
            if (isDisabled === true) {
                this.disableViewers(viewerName);
            } else if (isDisabled === false) {
                this.enableViewers(viewerName);
            }
        });
    }

    /**
     * Creates combined options to give to the viewer
     *
     * @private
     * @param {Object} moreOptions - Options specified by show()
     * @return {Object} combined options
     */
    createViewerOptions(moreOptions) {
        return cloneDeep(
            Object.assign({}, this.options, moreOptions, { location: this.location, cache: this.cache, ui: this.ui })
        );
    }

    /**
     * Loads a preview from the cache.
     *
     * @private
     * @return {void}
     */
    loadFromCache() {
        // Add details to the file metrics tracker
        this.fileMetrics.setCached();

        // Finally load the viewer
        this.loadViewer();

        // Also refresh from server to update cache
        if (!this.options.skipServerUpdate) {
            this.loadFromServer();
        }
    }

    /**
     * Loads a preview from the server.
     *
     * @private
     * @return {void}
     */
    loadFromServer() {
        const { apiHost, queryParams } = this.options;

        const fileInfoUrl = appendQueryParams(getURL(this.file.id, apiHost), queryParams);
        get(fileInfoUrl, this.getRequestHeaders())
            .then(this.handleFileInfoResponse)
            .catch(this.handleFetchError);
    }

    /**
     * Loads the preview from server response.
     *
     * @private
     * @param {Object} file - File object
     * @return {void}
     */
    handleFileInfoResponse(file) {
        // If preview is closed or response comes back for an incorrect file, don't do anything
        if (!this.open || (this.file && this.file.id !== file.id)) {
            return;
        }

        try {
            // Save reference to the file and update file metrics tracker
            this.file = file;
            this.logger.setFile(file);
            this.fileMetrics.setFile(file);

            // Keep reference to previously cached file version
            const cachedFile = this.cache.get(file.id);

            // Explicitly uncache watermarked files, otherwise update cache
            const isWatermarked = file.watermark_info && file.watermark_info.is_watermarked;
            if (isWatermarked) {
                uncacheFile(this.cache, file);
            } else {
                cacheFile(this.cache, file);
            }

            // Should load/reload viewer if:
            // - File isn't cached
            // - Cached file isn't valid
            // - Cached file is stale
            // - File is watermarked
            const shouldLoadViewer =
                !cachedFile ||
                !checkFileValid(cachedFile) ||
                cachedFile.file_version.sha1 !== file.file_version.sha1 ||
                isWatermarked;

            if (shouldLoadViewer) {
                this.fileMetrics.setCacheStale();
                this.loadViewer();
            }
        } catch (err) {
            this.triggerError(err instanceof Error ? err : new Error(__('error_refresh')));
        }
    }

    /**
     * Determines a viewer to use, prepare static assets and representations
     * needed by the viewer, and finally load that viewer.
     *
     * @private
     * @return {void}
     */
    loadViewer() {
        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        // Check if preview permissions exist
        if (!checkPermission(this.file, PERMISSION_PREVIEW)) {
            throw new Error(__('error_permissions'));
        }

        // Show download button if download permissions exist, options allow, and browser has ability
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload && Browser.canDownload()) {
            this.ui.showLoadingDownloadButton(this.download);
        }

        // Determine the asset loader to use
        const loader = this.getLoader(this.file);

        // If no loader then throw an unsupported error
        // If file type specific error message, throw the generic one
        if (!loader) {
            throw new Error(FILE_EXT_ERROR_MAP[this.file.extension] || __('error_default'));
        }

        // Determine the viewer to use
        const viewer = loader.determineViewer(this.file, Object.keys(this.disabledViewers));

        // Store the type of file
        this.fileMetrics.setType(viewer.NAME);
        this.logger.setContentType(viewer.NAME);

        // Determine the representation to use
        const representation = loader.determineRepresentation(this.file, viewer);

        // Instantiate the viewer
        const viewerOptions = this.createViewerOptions({
            viewer,
            representation,
            container: this.container,
            file: this.file
        });
        viewerOptions.fileMetrics = this.fileMetrics; // Don't clone the file metrics tracker since it needs to track metrics
        this.viewer = new viewer.CONSTRUCTOR(viewerOptions);

        // Add listeners for viewer events
        this.attachViewerListeners();

        // Load the representation into the viewer
        this.viewer.load();

        // Once the viewer instance has been created, emit it so that clients can attach their events.
        // Viewer object will still be sent along the load event also.
        this.emit('viewer', this.viewer);

        // Reset retry count after successful load so we don't go into the retry short circuit when the same file
        // previewed again
        this.retryCount = 0;
    }

    /**
     * Attach event listeners for viewer.
     *
     * @private
     * @return {void}
     */
    attachViewerListeners() {
        // Node requires listener attached to 'error'
        this.viewer.addListener('error', this.triggerError);
        this.viewer.addListener('viewerevent', this.handleViewerEvents);
    }

    /**
     * Handles log events and delegates to the Logger instance.
     *
     * @param {LOG_CODES} event - Log event that occurred.
     * @param {Object} data - Log event data.
     * @return {void}
     */
    handlLogEvent(event, data) {
        switch (event) {
            case LOG_CODES.warning:
                this.logger.warn(...data);
                break;
            case LOG_CODES.error:
                this.logger.error(...data);
                break;
            case LOG_CODES.metric:
                this.logger.metric(data.code, data.value);
                break;
            case LOG_CODES.info:
            default:
                this.logger.info(...data);
        }
    }

    /**
     * Handle events emitted by the viewer
     *
     * @private
     * @param {Object} [data] - Viewer event data
     * @return {void}
     */
    handleViewerEvents(data) {
        /* istanbul ignore next */
        switch (data.event) {
            case 'download':
                this.download();
                break;
            case 'reload':
                this.show(this.file.id, this.previewOptions);
                break;
            case 'load':
                this.finishLoading(data.data);
                break;
            case 'progressstart':
                this.ui.startProgressBar();
                break;
            case 'progressend':
                this.ui.finishProgressBar();
                break;
            case 'notificationshow':
                this.ui.showNotification(data.data);
                break;
            case 'notificationhide':
                this.ui.hideNotification();
                break;
            case 'mediaendautoplay':
                this.navigateRight();
                break;
            case EVENT_LOG:
                this.handlLogEvent(data.event, data.data);
                break;
            default:
                // This includes 'notification', 'preload' and others
                this.emit(data.event, data.data);
                this.emit('viewerevent', data);
        }
    }

    /**
     * Wrapper around emit to prevent errors from affecting the client.
     *
     * @private
     * @param {string} eventName - event name to emit
     * @param {Object} [data] - event name to emit
     * @return {void}
     */
    emit(eventName, data) {
        try {
            super.emit(eventName, data);
        } catch (e) {
            this.logger.error(e);
        }
    }

    /**
     * Finish loading a viewer - display the appropriate control buttons, re-emit the 'load' event, log
     * the preview, and prefetch the next few files.
     *
     * @private
     * @param {Object} [data] - Load event data
     * @return {void}
     */
    finishLoading(data = {}) {
        // Show or hide print/download buttons
        // canDownload is not supported by all of our browsers, so for now we need to check isMobile
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload && Browser.canDownload()) {
            this.ui.showDownloadButton(this.download);

            if (checkFeature(this.viewer, 'print') && !Browser.isMobile()) {
                this.ui.showPrintButton(this.print);
            }
        }

        const { error } = data;
        if (error) {
            // Bump up preview count
            this.count.error += 1;

            const metrics = this.fileMetrics.done(this.count);

            // 'load' with { error } signifies a preview error
            this.emit('load', {
                error,
                metrics,
                file: this.file
            });

            this.logger.metric(METRIC_FILE_PREVIEW_FAIL, metrics);

            // Hookup for phantom JS health check
            if (typeof window.callPhantom === 'function') {
                window.callPhantom(0);
            }
        } else {
            // Bump up preview count
            this.count.success += 1;

            const metrics = this.fileMetrics.done(this.count);

            // Finally emit the viewer instance back with a load event
            this.emit('load', {
                viewer: this.viewer,
                metrics,
                file: this.file
            });

            // Track in interal logger
            this.logger.metric(METRIC_FILE_PREVIEW_SUCCESS, metrics);

            // If there wasn't an error, use Events API to log a preview
            this.logPreviewEvent(this.file.id, this.options);

            // Hookup for phantom JS health check
            if (typeof window.callPhantom === 'function') {
                window.callPhantom(1);
            }
        }

        // Finish the progress bar unless instructed not to
        if (data.endProgress !== false) {
            this.ui.finishProgressBar();
        }

        // Programmtically focus on the viewer after it loads
        if (this.viewer && this.viewer.containerEl) {
            this.viewer.containerEl.focus();
        }

        // Hide the loading indicator
        this.ui.hideLoadingIndicator();

        // Prefetch next few files
        this.prefetchNextFiles();
    }

    /**
     * Logs 'preview' event via the Events API. This is used for logging that a
     * preview happened for access stats, unlike the Logger, which logs preview
     * errors and performance metrics.
     *
     * @private
     * @param {string} fileId - File ID to log preview event for
     * @param {Object} options - File options, e.g. token, shared link
     * @return {void}
     */
    logPreviewEvent(fileId, options) {
        this.logRetryCount = this.logRetryCount || 0;

        const { apiHost, token, sharedLink, sharedLinkPassword } = options;
        const headers = getHeaders({}, token, sharedLink, sharedLinkPassword);

        post(`${apiHost}/2.0/events`, headers, {
            event_type: 'preview',
            source: {
                type: 'file',
                id: fileId
            }
        })
            .then(() => {
                // Reset retry count after successfully logging
                this.logRetryCount = 0;
            })
            .catch(() => {
                // Don't retry more than the retry limit
                this.logRetryCount += 1;
                if (this.logRetryCount > LOG_RETRY_COUNT) {
                    this.logRetryCount = 0;
                    return;
                }

                clearTimeout(this.logRetryTimeout);
                this.logRetryTimeout = setTimeout(() => {
                    this.logPreviewEvent(fileId, options);
                }, LOG_RETRY_TIMEOUT * this.logRetryCount);
            });
    }

    /**
     * Triggers an error due to fetch.
     *
     * @private
     * @param {Object} err Error object
     * @return {void}
     */
    handleFetchError(err) {
        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        // Nuke the cache
        this.cache.unset(this.file.id);

        // Check if hit the retry limit
        if (this.retryCount > RETRY_COUNT) {
            let errorMessage = __('error_refresh');
            if (err.response && err.response.status === 429) {
                errorMessage = __('error_rate_limit');
            }

            this.triggerError(new Error(errorMessage));
            return;
        }

        clearTimeout(this.retryTimeout);
        this.retryTimeout = setTimeout(() => {
            this.load(this.file.id);
        }, RETRY_TIMEOUT * this.retryCount);
    }

    /**
     * Instantiate the error viewer
     *
     * @private
     * @return {PreviewError} PreviewError instance
     */
    getErrorViewer() {
        return new PreviewErrorViewer(
            this.createViewerOptions({
                viewer: { NAME: 'Error' },
                container: this.container,
                file: this.file
            })
        );
    }

    /**
     * Generic error handler. Shows the error viewer with the specified error
     * message.
     *
     * @private
     * @param {Error} err - Error
     * @return {void}
     */
    triggerError(err) {
        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        // Mark as error being processed which should prevent viewer loading
        this.open = false;

        // Nuke the cache
        this.cache.unset(this.file.id);

        // Destroy anything still showing
        this.destroy();

        // Instantiate the error viewer
        this.viewer = this.getErrorViewer();

        // Add listeners for viewer events
        this.attachViewerListeners();

        // Load the error viewer
        this.viewer.load(err);
    }

    /**
     * Builds a list of required XHR headers.
     *
     * @private
     * @param {string} [token] - Access token
     * @return {Object} Headers
     */
    getRequestHeaders(token) {
        const videoHint =
            Browser.canPlayDash() && !this.disabledViewers.Dash ? X_REP_HINT_VIDEO_DASH : X_REP_HINT_VIDEO_MP4;
        const headers = {
            'X-Rep-Hints': `${X_REP_HINT_BASE}${X_REP_HINT_DOC_THUMBNAIL}${X_REP_HINT_IMAGE}${videoHint}`
        };

        return getHeaders(
            headers,
            token || this.options.token,
            this.options.sharedLink,
            this.options.sharedLinkPassword
        );
    }

    /**
     * Prefetches file information and content for the next few files to
     * improve preview performance for those files.
     *
     * @private
     * @return {void}
     */
    prefetchNextFiles() {
        const { apiHost, queryParams, skipServerUpdate } = this.options;

        // Don't bother prefetching when there aren't more files or we need to skip server update
        if (this.collection.length < 2 || skipServerUpdate) {
            return;
        }

        // Maintain collection of files we have already prefetched
        this.prefetchedCollection = this.prefetchedCollection || [];

        // Prefetch the next PREFETCH_COUNT files excluding ones we've already prefetched
        const currentIndex = this.collection.indexOf(this.file.id);
        const filesToPrefetch = this.collection
            .slice(currentIndex + 1, currentIndex + PREFETCH_COUNT + 1)
            .filter((fileId) => this.prefetchedCollection.indexOf(fileId) === -1);

        // Check if we need to prefetch anything
        if (filesToPrefetch.length === 0) {
            return;
        }

        // Get access tokens for all files we should be prefetching
        getTokens(filesToPrefetch, this.previewOptions.token)
            .then((tokenMap) => {
                filesToPrefetch.forEach((id) => {
                    const token = tokenMap[id];

                    // Append optional query params
                    const fileInfoUrl = appendQueryParams(getURL(id, apiHost), queryParams);

                    // Prefetch and cache file information and content
                    get(fileInfoUrl, this.getRequestHeaders(token))
                        .then((file) => {
                            // Cache file info
                            cacheFile(this.cache, file);
                            this.prefetchedCollection.push(file.id);

                            // Prefetch assets and content for file
                            this.prefetch({
                                fileId: file.id,
                                token
                            });
                        })
                        .catch((err) => {
                            this.logger.error(`Error prefetching file ID ${id} - ${err}`);
                        });
                });
            })
            .catch(() => {
                this.logger.error('Error prefetching files');
            });
    }

    /**
     * Mousemove handler for navigation.
     *
     * @private
     * @return {Function} Throttled mousemove handler
     */
    getGlobalMousemoveHandler() {
        return throttle(
            () => {
                clearTimeout(this.timeoutHandler);

                if (!this.container) {
                    return;
                }

                // If a viewer is showing then we are previewing
                const isPreviewing = !!this.viewer;

                // Always assume that navigation arrows will be hidden
                this.container.classList.remove(CLASS_NAVIGATION_VISIBILITY);

                // Only show it if either we aren't previewing or if we are then the viewer
                // is not blocking the show. If we are previewing then the viewer may choose
                // to not allow navigation arrows. This is mostly useful for videos since the
                // navigation arrows may interfere with the settings menu inside video player.
                if (!isPreviewing || this.viewer.allowNavigationArrows()) {
                    this.container.classList.add(CLASS_NAVIGATION_VISIBILITY);
                }

                this.timeoutHandler = setTimeout(() => {
                    if (this.container) {
                        this.container.classList.remove(CLASS_NAVIGATION_VISIBILITY);
                    }
                }, MOUSEMOVE_THROTTLE);
            },
            MOUSEMOVE_THROTTLE - 500,
            true
        );
    }

    /**
     * Shows a preview of a file at the specified index in the current collection.
     *
     * @private
     * @param {number} index - Index of file to preview
     * @return {void}
     */
    navigateToIndex(index) {
        const fileId = this.collection[index];
        this.emit('navigate', fileId);
        this.count.navigation += 1;
        this.load(fileId);
    }

    /**
     * Shows a preview of the previous file.
     *
     * @private
     * @return {void}
     */
    navigateLeft() {
        const currentIndex = this.collection.indexOf(this.file.id);
        const newIndex = currentIndex === 0 ? 0 : currentIndex - 1;
        if (newIndex !== currentIndex) {
            this.navigateToIndex(newIndex);
        }
    }

    /**
     * Shows a preview of the next file.
     *
     * @private
     * @return {void}
     */
    navigateRight() {
        const currentIndex = this.collection.indexOf(this.file.id);
        const newIndex = currentIndex === this.collection.length - 1 ? this.collection.length - 1 : currentIndex + 1;
        if (newIndex !== currentIndex) {
            this.navigateToIndex(newIndex);
        }
    }

    /**
     * Determines the appropriate viewer loader to use based on file information.
     *
     * @private
     * @param {Object} file - Box file to preview
     * @return {Object|null} Matching loader
     */
    getLoader(file) {
        return this.loaders.find((loader) => loader.canLoad(file, Object.keys(this.disabledViewers)));
    }

    /**
     * Navigate right via the UI.
     *
     * @private
     * @return {void}
     */
    uiNavigateRight() {
        this.logger.metric(METRIC_CONTROL, METRIC_CONTROL_ACTIONS.navigate_prev_button);
        this.navigateRight();
    }

    /**
     * Navigate left via the UI.
     *
     * @private
     * @return {void}
     */
    uiNavigateLeft() {
        this.logger.metric(METRIC_CONTROL, METRIC_CONTROL_ACTIONS.navigate_next_button);
        this.navigateRight();
    }

    /**
     * Global keydown handler for preview.
     *
     *
     * @private
     * @param {Event} event - keydown event
     * @return {void}
     */
    keydownHandler(event) {
        const { target } = event;

        // If keyboard shortcuts / hotkeys are disabled, ignore
        if (!this.options.useHotkeys) {
            return;
        }

        // Ignore key events when we are inside certain fields
        if (
            !target ||
            KEYDOWN_EXCEPTIONS.indexOf(target.nodeName) > -1 ||
            (target.nodeName === 'DIV' && !!target.getAttribute('contenteditable'))
        ) {
            return;
        }

        let consumed = false;
        const key = decodeKeydown(event);

        if (!key) {
            return;
        }

        if (this.viewer && typeof this.viewer.onKeydown === 'function') {
            consumed = !!this.viewer.onKeydown(key);
        }

        if (!consumed) {
            switch (key) {
                case 'ArrowLeft':
                    this.logger.metric(METRIC_CONTROL, METRIC_CONTROL_ACTIONS.navigate_prev_key);
                    this.navigateLeft();
                    consumed = true;
                    break;
                case 'ArrowRight':
                    this.logger.metric(METRIC_CONTROL, METRIC_CONTROL_ACTIONS.navigate_next_key);
                    this.navigateRight();
                    consumed = true;
                    break;
                default:
                // no-op
            }
        }

        if (consumed) {
            event.preventDefault();
            event.stopPropagation();
        }
    }
}

global.Box = global.Box || {};
global.Box.Preview = Preview;
export default Preview;
