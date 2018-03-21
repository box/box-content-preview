/* eslint-disable import/first */
import './polyfill';
import EventEmitter from 'events';
import cloneDeep from 'lodash/cloneDeep';
import throttle from 'lodash/throttle';
/* eslint-enable import/first */
import Browser from './Browser';
import Logger from './Logger';
import loaderList from './loaders';
import Cache from './Cache';
import PreviewError from './PreviewError';
import PreviewErrorViewer from './viewers/error/PreviewErrorViewer';
import PreviewUI from './PreviewUI';
import getTokens from './tokens';
import Timer from './Timer';
import DownloadReachability from './DownloadReachability';
import {
    get,
    getProp,
    post,
    decodeKeydown,
    getHeaders,
    findScriptLocation,
    appendQueryParams,
    replacePlaceholders,
    stripAuthFromString,
    isValidFileId,
    isBoxWebApp,
    convertWatermarkPref
} from './util';
import {
    getURL,
    getDownloadURL,
    checkPermission,
    checkFeature,
    checkFileValid,
    cacheFile,
    uncacheFile,
    isWatermarked,
    getCachedFile,
    normalizeFileVersion,
    canDownload,
    shouldDownloadWM
} from './file';
import {
    API_HOST,
    APP_HOST,
    CLASS_NAVIGATION_VISIBILITY,
    PERMISSION_PREVIEW,
    PREVIEW_SCRIPT_NAME,
    X_REP_HINT_BASE,
    X_REP_HINT_DOC_THUMBNAIL,
    X_REP_HINT_IMAGE,
    X_REP_HINT_VIDEO_DASH,
    X_REP_HINT_VIDEO_MP4,
    FILE_OPTION_FILE_VERSION_ID
} from './constants';
import { VIEWER_EVENT, ERROR_CODE, PREVIEW_ERROR, PREVIEW_METRIC, LOAD_METRIC } from './events';
import { getClientLogDetails, getISOTime } from './logUtils';
import './Preview.scss';

const DEFAULT_DISABLED_VIEWERS = ['Office']; // viewers disabled by default
const PREFETCH_COUNT = 4; // number of files to prefetch
const MOUSEMOVE_THROTTLE_MS = 1500; // for showing or hiding the navigation icons
const RETRY_COUNT = 3; // number of times to retry network request for a file
const KEYDOWN_EXCEPTIONS = ['INPUT', 'SELECT', 'TEXTAREA']; // Ignore keydown events on these elements
const LOG_RETRY_TIMEOUT_MS = 500; // retry interval for logging preview event
const LOG_RETRY_COUNT = 3; // number of times to retry logging preview event
const MS_IN_S = 1000; // ms in a sec
const SUPPORT_URL = 'https://support.box.com';

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

    /** @property {Logger} - Logger instance */
    logger;

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

        // Bind context for callbacks
        this.download = this.download.bind(this);
        this.print = this.print.bind(this);
        this.handleTokenResponse = this.handleTokenResponse.bind(this);
        this.handleFileInfoResponse = this.handleFileInfoResponse.bind(this);
        this.handleFetchError = this.handleFetchError.bind(this);
        this.handleViewerEvents = this.handleViewerEvents.bind(this);
        this.handleViewerMetrics = this.handleViewerMetrics.bind(this);
        this.triggerError = this.triggerError.bind(this);
        this.throttledMousemoveHandler = this.getGlobalMousemoveHandler().bind(this);
        this.navigateLeft = this.navigateLeft.bind(this);
        this.navigateRight = this.navigateRight.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        // Log all load metrics
        this.emitLoadMetrics();

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
    }

    /**
     * Reloads the current preview. Cleans up existing preview and re-loads from cache.
     * Note that reload() will not do anything if either:
     *   - skipServerUpdate is true (either passed in or defined in preview options) AND cached file is not valid
     *   - skipServerUpdate is false AND there is no cached file ID
     *
     * @public
     * @param {boolean} skipServerUpdate - Whether or not to update file info from server
     * @return {void}
     */
    reload(skipServerUpdate) {
        // If not passed in, default to Preview option for skipping server update
        if (typeof skipServerUpdate === 'undefined') {
            // eslint-disable-next-line
            skipServerUpdate = this.options.skipServerUpdate;
        }

        // Reload preview without fetching updated file info from server
        if (skipServerUpdate) {
            if (!checkFileValid(this.file)) {
                return;
            }

            this.destroy();
            this.setupUI();
            this.loadViewer();

            // Fetch file info from server and reload preview
        } else {
            if (!this.file.id) {
                return;
            }

            this.load(this.file.id);
        }
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
            if (fileOrId && isValidFileId(fileOrId)) {
                // String id found in the collection
                fileIds.push(fileOrId.toString());
            } else if (fileOrId && typeof fileOrId === 'object' && isValidFileId(fileOrId.id)) {
                // Possible well-formed file object found in the collection
                const wellFormedFileObj = Object.assign({}, fileOrId, {
                    id: fileOrId.id.toString()
                });
                fileIds.push(wellFormedFileObj.id);
                files.push(wellFormedFileObj);
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
                const message = '[Preview SDK] Tried to cache invalid file';
                // eslint-disable-next-line
                console.error(`${message}: `, file);

                const err = new PreviewError(ERROR_CODE.INVALID_CACHE_ATTEMPT, message, { file });
                this.emitPreviewError(err);
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
        if (canDownload(this.file, this.options) && checkFeature(this.viewer, 'print')) {
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
        const downloadErrorMsg = __('notification_cannot_download');
        if (!canDownload(this.file, this.options)) {
            this.ui.showNotification(downloadErrorMsg);
            return;
        }

        // Make sure to append any optional query params to requests
        const { apiHost, queryParams } = this.options;

        // If we should download the watermarked representation of the file, generate the representation URL, force
        // the correct content disposition, and download
        if (shouldDownloadWM(this.file, this.options)) {
            const contentUrlTemplate = getProp(this.viewer.getRepresentation(), 'content.url_template');
            if (!contentUrlTemplate) {
                this.ui.showNotification(downloadErrorMsg);
                return;
            }

            const downloadUrl = appendQueryParams(
                this.viewer.createContentUrlWithAuthParams(contentUrlTemplate, this.viewer.options.viewer.ASSET),
                queryParams
            );

            DownloadReachability.downloadWithReachabilityCheck(downloadUrl);

            // Otherwise, get the content download URL of the original file and download
        } else {
            const getDownloadUrl = appendQueryParams(getDownloadURL(this.file.id, apiHost), queryParams);
            get(getDownloadUrl, this.getRequestHeaders()).then((data) => {
                const downloadUrl = appendQueryParams(data.download_url, queryParams);
                DownloadReachability.downloadWithReachabilityCheck(downloadUrl);
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
     * @param {boolean} [reload] - Whether or not to reload the current preview
     * with the updated token, defaults to true
     * @return {void}
     */
    updateToken(tokenOrTokenFunc, reload = true) {
        this.previewOptions.token = tokenOrTokenFunc;

        if (reload) {
            this.reload(false); // Fetch file info from server and reload preview with updated token
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
     * @param {string} options.fileId - Box file ID (do not also pass a file version ID)
     * @param {string} options.fileVersionId - Box file version ID (do not also pass a file ID)
     * @param {string} options.token - Access token
     * @param {string} options.sharedLink - Shared link
     * @param {string} options.sharedLinkPassword - Shared link password
     * @param {boolean} options.preload - Is this prefetch for a preload
     * @param {string} token - Access token
     * @return {void}
     */
    prefetch({ fileId, fileVersionId, token, sharedLink = '', sharedLinkPassword = '', preload = false }) {
        let file;
        let loader;
        let viewer;

        // Determining the viewer could throw an error
        try {
            file = getCachedFile(this.cache, { fileId, fileVersionId });
            loader = file ? this.getLoader(file) : null;
            viewer = loader ? loader.determineViewer(file) : null;
            if (!viewer) {
                return;
            }
        } catch (err) {
            const message = `Error prefetching file ID ${fileId} - ${err}`;
            // eslint-disable-next-line
            console.error(message);

            const error = new PreviewError(ERROR_CODE.PREFETCH_FILE, message, {}, err.message);
            this.emitPreviewError(error);

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
                preload: preload || !!viewerInstance.getViewerOption('preload'),
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
        this.logger = new Logger(this.location.locale, this.browserInfo);

        // Clear any existing retry timeouts
        clearTimeout(this.retryTimeout);

        // Save reference to the currently shown file ID and file version ID, if any
        const currentFileId = this.file ? this.file.id : undefined;
        const currentFileVersionId = this.file && this.file.file_version ? this.file.file_version.id : undefined;

        // Save reference to file version we want to load, if any
        const fileVersionId = this.getFileOption(fileIdOrFile, FILE_OPTION_FILE_VERSION_ID) || '';

        // Check what was passed to preview.show()—string file ID or some file object
        if (typeof fileIdOrFile === 'string' || typeof fileIdOrFile === 'number') {
            const fileId = fileIdOrFile.toString();

            // If we want to load by file version ID, use that as key for cache
            const cacheKey = fileVersionId ? { fileVersionId } : { fileId };

            // If file info is not cached, create a 'bare' file object that we populate with data from the server later
            const bareFile = { id: fileId };
            if (fileVersionId) {
                bareFile.file_version = {
                    id: fileVersionId
                };
            }

            this.file = getCachedFile(this.cache, cacheKey) || bareFile;

            // Use well-formed file object if available
        } else if (checkFileValid(fileIdOrFile)) {
            this.file = fileIdOrFile;

            // File is not a well-formed file object but has a file ID and/or file version ID (e.g. Content Explorer)
        } else if (fileIdOrFile && typeof fileIdOrFile.id === 'string') {
            /* eslint-disable camelcase */
            const { id, file_version } = fileIdOrFile;

            this.file = { id };
            if (file_version) {
                this.file.file_version = {
                    id: file_version.id
                };
            }
            /* eslint-enable camelcase */
        } else {
            throw new PreviewError(
                ERROR_CODE.BAD_INPUT,
                __('error_generic'),
                {},
                'File is not a well-formed Box File object. See FILE_FIELDS in file.js for a list of required fields.'
            );
        }

        // Retry up to RETRY_COUNT if we are reloading same file. If load is called during a preview when file version
        // ID has been specified, count as a retry only if the current file verison ID matches that specified file
        // version ID
        if (fileVersionId) {
            if (fileVersionId === currentFileVersionId) {
                this.retryCount += 1;
            } else {
                this.retryCount = 0;
            }

            // Otherwise, count this as a retry if the file ID we are trying to load matches the current file ID
        } else if (this.file.id === currentFileId) {
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

        this.setupUI();

        // Load from cache if the current file is valid, otherwise load file info from server
        if (checkFileValid(this.file)) {
            this.loadFromCache();
        } else {
            this.loadFromServer();
        }
    }

    /**
     * Sets up preview shell and navigation and starts progress.
     *
     * @private
     * @return {void}
     */
    setupUI() {
        // Setup the shell
        this.container = this.ui.setup(
            this.options,
            this.keydownHandler,
            this.navigateLeft,
            this.navigateRight,
            this.throttledMousemoveHandler
        );

        // Set up the notification
        this.ui.setupNotification();

        // Update navigation
        this.ui.showNavigation(this.file.id, this.collection);

        // Setup loading UI and progress bar
        this.ui.showLoadingIndicator();
        this.ui.startProgressBar();
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

        // Custom BoxAnnotations definition
        this.options.boxAnnotations = options.boxAnnotations;

        // Save the reference to any additional custom options for viewers
        this.options.viewers = options.viewers || {};

        // Skip load from server and any server updates
        this.options.skipServerUpdate = !!options.skipServerUpdate;

        // Optional additional query params to append to requests
        this.options.queryParams = options.queryParams || {};

        // Option to patch AMD module definitions while Preview loads the third party dependencies it expects in the
        // browser global scope. Definitions will be re-enabled on the 'assetsloaded' event
        this.options.fixDependencies = !!options.fixDependencies || !!options.pauseRequireJS;

        // Option to disable 'preview' event log. Use this if you are using Preview in a way that does not constitute
        // a full preview, e.g. a content feed. Enabling this option skips the client-side log to the Events API
        // (access stats will not be incremented), but content access is still logged server-side for audit purposes
        this.options.disableEventLog = !!options.disableEventLog;

        // Sets how previews of watermarked files behave.
        // 'all' - Forces watermarked previews of supported file types regardless of collaboration or permission level,
        //         except for `Uploader`, which cannot preview.
        // 'any' - The default watermarking behavior in the Box Web Application. If the file type supports
        //         watermarking, all users except for those collaborated as an `Uploader` will see a watermarked
        //         preview. If the file type cannot be watermarked, users will see a non-watermarked preview if they
        //         are at least a `Viewer-Uploader` and no preview otherwise.
        // 'none' - Forces non-watermarked previews. If the file type cannot be watermarked or the user is not at least
        //          a `Viewer-Uploader`, no preview is shown.
        this.options.previewWMPref = options.previewWMPref || 'any';

        // Whether the download of a watermarked file should be watermarked. This option does not affect non-watermarked
        // files. If true, users will be able to download watermarked versions of supported file types as long as they
        // have preview permissions (any collaboration role except for `Uploader`).
        this.options.downloadWM = !!options.downloadWM;

        // Options that are applicable to certain file ids
        this.options.fileOptions = options.fileOptions || {};

        // BFMVP-7637
        // Force viewer to use the Original representation instead of the other performant representations
        // till Box fixes them to render correctly
        this.options.useOriginalRepresentation = options.useOriginalRepresentation || false;

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
        // Log cache hit
        this.logger.setCached();

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
        const { apiHost, previewWMPref, queryParams } = this.options;
        const params = Object.assign(
            {
                watermark_preference: convertWatermarkPref(previewWMPref)
            },
            queryParams
        );

        const fileVersionId = this.getFileOption(this.file.id, FILE_OPTION_FILE_VERSION_ID) || '';

        const tag = Timer.createTag(this.file.id, LOAD_METRIC.fileInfoTime);
        Timer.start(tag);

        const fileInfoUrl = appendQueryParams(getURL(this.file.id, fileVersionId, apiHost), params);
        get(fileInfoUrl, this.getRequestHeaders())
            .then(this.handleFileInfoResponse)
            .catch(this.handleFetchError);
    }

    /**
     * Loads the preview from server response.
     *
     * @private
     * @param {Object} response - File object response from API
     * @return {void}
     */
    handleFileInfoResponse(response) {
        let file = response;

        // Stop timer for file info time event.
        const tag = Timer.createTag(this.file.id, LOAD_METRIC.fileInfoTime);
        Timer.stop(tag);

        // If we are previewing a file version, normalize response to a well-formed file object
        if (this.getFileOption(this.file.id, FILE_OPTION_FILE_VERSION_ID)) {
            file = normalizeFileVersion(response, this.file.id);
        }

        // If preview is closed or response comes back for an incorrect file, don't do anything
        const responseFileVersionId = file.file_version.id;
        if (
            !this.open ||
            (this.file && this.file.file_version && this.file.file_version.id !== responseFileVersionId)
        ) {
            return;
        }

        try {
            // Set current file to file data from server and update file in logger
            this.file = file;
            this.logger.setFile(file);

            // If file is not downloadable, trigger an error
            if (file.is_download_available === false) {
                const details = isBoxWebApp()
                    ? {
                        linkText: __('link_contact_us'),
                        linkUrl: SUPPORT_URL
                    }
                    : {};
                const error = new PreviewError(ERROR_CODE.NOT_DOWNLOADABLE, __('error_not_downloadable'), details);
                throw error;
            }

            // Keep reference to previously cached file version
            const cachedFile = getCachedFile(this.cache, { fileVersionId: responseFileVersionId });

            // Explicitly uncache watermarked files, otherwise update cache
            const isFileWatermarked = isWatermarked(file);
            if (isFileWatermarked) {
                uncacheFile(this.cache, file);
            } else {
                cacheFile(this.cache, file);
            }

            // Should load viewer for first time if:
            //   - File isn't cached OR
            //   - Cached file doesn't have a valid structure
            if (!cachedFile || !checkFileValid(cachedFile)) {
                this.loadViewer();

                // Otherwise re-load viewer if:
                //   - Cached file is stale
                //   - File is newly watermarked
            } else if (cachedFile.file_version.sha1 !== file.file_version.sha1 || isFileWatermarked) {
                this.logger.setCacheStale(); // Log that cache is stale
                this.reload(true); // Reload viewer without fetching updated file info from server
            }
        } catch (err) {
            const error =
                err instanceof PreviewError
                    ? err
                    : new PreviewError(ERROR_CODE.LOAD_VIEWER, __('error_refresh'), {}, err.message);

            this.triggerError(error);
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
            throw new PreviewError(ERROR_CODE.PERMISSIONS_PREVIEW, __('error_permissions'));
        }

        // Show loading download button if user can download
        if (canDownload(this.file, this.options)) {
            this.ui.showLoadingDownloadButton(this.download);
        }

        // Determine the asset loader to use
        const loader = this.getLoader(this.file);

        // If no loader, then check to see if any of our viewers support this file type.
        // If they do, we know the account can't preview this file type. If they can't we know this file type is unsupported.
        if (!loader) {
            const isFileTypeSupported = this.getViewers().find((viewer) => {
                return viewer.EXT.indexOf(this.file.extension) > -1;
            });

            const code = isFileTypeSupported ? ERROR_CODE.ACCOUNT : ERROR_CODE.UNSUPPORTED_FILE_TYPE;
            const message = isFileTypeSupported
                ? __('error_account')
                : replacePlaceholders(__('error_unsupported'), [(this.file.extension || '').toUpperCase()]);

            throw new PreviewError(code, message);
        }

        // Determine the viewer to use
        const viewer = loader.determineViewer(this.file, Object.keys(this.disabledViewers));

        // Log the type of file
        this.logger.setType(viewer.NAME);

        // Determine the representation to use
        const representation = loader.determineRepresentation(this.file, viewer, this.options.useOriginalRepresentation);

        // Instantiate the viewer
        const viewerOptions = this.createViewerOptions({
            viewer,
            representation,
            container: this.container,
            file: this.file
        });
        viewerOptions.logger = this.logger; // Don't clone the logger since it needs to track metrics
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
        this.viewer.addListener(VIEWER_EVENT.default, this.handleViewerEvents);
        this.viewer.addListener(VIEWER_EVENT.metric, this.handleViewerMetrics);
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
            case VIEWER_EVENT.download:
                this.download();
                break;
            case VIEWER_EVENT.reload:
                this.reload(); // Reload preview and fetch updated file info depending on `skipServerUpdate` option
                break;
            case VIEWER_EVENT.load:
                this.finishLoading(data.data);
                break;
            case VIEWER_EVENT.progressStart:
                this.ui.startProgressBar();
                break;
            case VIEWER_EVENT.progressEnd:
                this.ui.finishProgressBar();
                break;
            case VIEWER_EVENT.notificationShow:
                this.ui.showNotification(data.data);
                break;
            case VIEWER_EVENT.notificationHide:
                this.ui.hideNotification();
                break;
            case VIEWER_EVENT.mediaEndAutoplay:
                this.navigateRight();
                break;
            case VIEWER_EVENT.error:
                // Do nothing since 'error' event was already caught, and will be emitted
                // as a 'preview_error' event
                break;
            default:
                // This includes 'notification', 'preload' and others
                this.emit(data.event, data.data);
                this.emit(VIEWER_EVENT.default, data);
        }
    }

    /**
     * Handle metrics emitted by the viewer
     *
     * @private
     * @param {Object} [data] - Viewer metric data
     * @return {void}
     */
    handleViewerMetrics(data) {
        const formattedEvent = {
            event_name: data.event,
            value: data.data,
            ...this.createLogEvent()
        };

        this.emit(PREVIEW_METRIC, formattedEvent);
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
        if (this.file && this.file.id) {
            const tag = Timer.createTag(this.file.id, LOAD_METRIC.fullDocumentLoadTime);
            Timer.stop(tag);
        }

        // Log now that loading is finished
        this.emitLoadMetrics();

        // Show download and print buttons if user can download
        if (canDownload(this.file, this.options)) {
            this.ui.showDownloadButton(this.download);

            if (checkFeature(this.viewer, 'print')) {
                this.ui.showPrintButton(this.print);
            }
        }

        const { error } = data;
        if (error) {
            // Bump up preview count
            this.count.error += 1;

            // 'load' with { error } signifies a preview error
            this.emit(VIEWER_EVENT.load, {
                error,
                metrics: this.logger.done(this.count),
                file: this.file
            });

            // Explicit preview failure
            this.handleViewerMetrics({
                event: 'failure'
            });

            // Hookup for phantom JS health check
            if (typeof window.callPhantom === 'function') {
                window.callPhantom(0);
            }
        } else {
            // Bump up preview count
            this.count.success += 1;

            // Finally emit the viewer instance back with a load event
            this.emit(VIEWER_EVENT.load, {
                viewer: this.viewer,
                metrics: this.logger.done(this.count),
                file: this.file
            });

            // Explicit preview success
            this.handleViewerMetrics({
                event: 'success'
            });

            // If there wasn't an error and event logging is not disabled, use Events API to log a preview
            if (!this.options.disableEventLog) {
                this.logPreviewEvent(this.file.id, this.options);
            }

            // Hookup for phantom JS health check
            if (typeof window.callPhantom === 'function') {
                window.callPhantom(1);
            }
        }

        // Finish the progress bar unless instructed not to
        if (data.endProgress !== false) {
            this.ui.finishProgressBar();
        }

        // Programmatically focus on the viewer after it loads
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
                }, LOG_RETRY_TIMEOUT_MS * this.logRetryCount);
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
        uncacheFile(this.cache, this.file);

        // Check if hit the retry limit
        if (this.retryCount > RETRY_COUNT) {
            let errorCode = ERROR_CODE.EXCEEDED_RETRY_LIMIT;
            let errorMessage = __('error_refresh');

            if (err.response && err.response.status === 429) {
                errorCode = ERROR_CODE.RATE_LIMIT;
                errorMessage = __('error_rate_limit');
            }

            const error = new PreviewError(errorCode, errorMessage, { fileId: this.file.id });
            this.triggerError(error);
            return;
        }

        clearTimeout(this.retryTimeout);

        // Respect 'Retry-After' header if present, otherwise retry full jitter
        let timeoutMs = Math.random() * (2 ** this.retryCount * MS_IN_S);
        if (err.headers) {
            const retryAfterS = parseInt(err.headers.get('Retry-After'), 10);
            if (!Number.isNaN(retryAfterS)) {
                timeoutMs = retryAfterS * MS_IN_S;
            }
        }

        this.retryTimeout = setTimeout(() => {
            this.load(this.file.id);
        }, timeoutMs);
    }

    /**
     * Instantiate the error viewer
     *
     * @private
     * @return {PreviewErrorViewer} PreviewErrorViewer instance
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
        // Always log preview errors
        this.emitPreviewError(err);

        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        // Mark as error being processed which should prevent viewer loading
        this.open = false;

        // Nuke the cache
        uncacheFile(this.cache, this.file);

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
     * Create a generic log Object.
     *
     * @private
     * @return {Object} Log details for viewer session and current file.
     */
    createLogEvent() {
        const file = this.file || {};
        const log = {
            timestamp: getISOTime(),
            file_id: getProp(file, 'id', ''),
            file_version_id: getProp(file, 'file_version.id', ''),
            content_type: getProp(this.viewer, 'options.viewer.NAME', ''),
            extension: file.extension || '',
            locale: getProp(this.location, 'locale', ''),
            ...getClientLogDetails()
        };

        return log;
    }

    /**
     * Message, to any listeners of Preview, that an error has occurred.
     *
     * @private
     * @param {PreviewError} error - The error that occurred.
     * @return {void}
     */
    emitPreviewError(error) {
        const sanitizedError = error;

        // If we haven't supplied a code, then it was thrown by the browser
        sanitizedError.code = error.code || ERROR_CODE.BROWSER_GENERIC;

        // Strip auth from messages
        const { displayMessage, message } = sanitizedError;
        sanitizedError.displayMessage = stripAuthFromString(displayMessage);
        sanitizedError.message = stripAuthFromString(message);

        const errorLog = {
            error: sanitizedError,
            ...this.createLogEvent()
        };

        this.emit(PREVIEW_ERROR, errorLog);
    }

    /**
     * Load metrics behave slightly different than other metrics, in that they have
     * higher level properties that do not fit into the general purpose "value" and "event_name".
     * A value of 0 means that the load milestone was never reached.
     *
     * @private
     * @return {void}
     */
    emitLoadMetrics() {
        if (!this.file || !this.file.id) {
            Timer.reset();
            return;
        }

        // Do nothing if there is nothing worth logging.
        const infoTag = Timer.createTag(this.file.id, LOAD_METRIC.fileInfoTime);
        const infoTime = Timer.get(infoTag) || {};
        if (!infoTime.elapsed) {
            Timer.reset();
            return;
        }

        const convertTag = Timer.createTag(this.file.id, LOAD_METRIC.convertTime);
        const downloadTag = Timer.createTag(this.file.id, LOAD_METRIC.downloadResponseTime);
        const fullLoadTag = Timer.createTag(this.file.id, LOAD_METRIC.fullDocumentLoadTime);

        const timerList = [
            infoTime,
            Timer.get(convertTag) || {},
            Timer.get(downloadTag) || {},
            Timer.get(fullLoadTag) || {}
        ];
        const times = timerList.map((timer) => parseInt(timer.elapsed, 10) || 0);
        const total = times.reduce((acc, current) => acc + current);

        const event = {
            event_name: LOAD_METRIC.previewLoadEvent,
            value: total, // Sum of all available load times.
            [LOAD_METRIC.fileInfoTime]: times[0],
            [LOAD_METRIC.convertTime]: times[1],
            [LOAD_METRIC.downloadResponseTime]: times[2],
            [LOAD_METRIC.fullDocumentLoadTime]: times[3],
            ...this.createLogEvent()
        };

        this.emit(PREVIEW_METRIC, event);

        Timer.reset();
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
        const { apiHost, previewWMPref, queryParams, skipServerUpdate } = this.options;
        const params = Object.assign(
            {
                watermark_preference: convertWatermarkPref(previewWMPref)
            },
            queryParams
        );

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
                filesToPrefetch.forEach((fileId) => {
                    const token = tokenMap[fileId];

                    // Append optional query params
                    const fileVersionId = this.getFileOption(fileId, FILE_OPTION_FILE_VERSION_ID) || '';
                    const fileInfoUrl = appendQueryParams(getURL(fileId, fileVersionId, apiHost), params);

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
                            const message = `Error prefetching file ID ${fileId} - ${err}`;
                            // eslint-disable-next-line
                            console.error(message);

                            const error = new PreviewError(ERROR_CODE.PREFETCH_FILE, message, { fileId }, err.message);
                            this.emitPreviewError(error);
                        });
                });
            })
            .catch((err) => {
                const message = `Error prefetching files - ${err}`;
                // eslint-disable-next-line
                console.error(message);

                const error = new PreviewError(
                    ERROR_CODE.PREFETCH_FILE,
                    message,
                    {
                        fileIds: filesToPrefetch
                    },
                    err.message
                );
                this.emitPreviewError(error);
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
                }, MOUSEMOVE_THROTTLE_MS);
            },
            MOUSEMOVE_THROTTLE_MS - 500,
            true
        );
    }

    /**
     * Shows a preview of a file at the specified index in the current collection.
     *
     * @public
     * @param {number} index - Index of file to preview
     * @return {void}
     */
    navigateToIndex(index) {
        if (!Array.isArray(this.collection) || this.collection.length < 2) {
            return;
        }

        const fileId = this.collection[index];
        this.emit('navigate', fileId);
        this.count.navigation += 1;
        this.load(fileId);
    }

    /**
     * Shows a preview of the previous file.
     *
     * @public
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
     * @public
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
     * Global keydown handler for preview.
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
                    this.navigateLeft();
                    consumed = true;
                    break;
                case 'ArrowRight':
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

    /**
     * Helper to get specific file option for a file.
     *
     * @param {string|Object} fileIdOrFile - File ID or file object to get file version ID for
     * @param {string} optionName - Name of option, e.g. fileVersionId
     * @return {Object|undefined} Specific file option
     */
    getFileOption(fileIdOrFile, optionName) {
        const fileId = typeof fileIdOrFile === 'string' ? fileIdOrFile : fileIdOrFile.id;
        return getProp(this.previewOptions, `fileOptions.${fileId}.${optionName}`);
    }
}

global.Box = global.Box || {};
global.Box.Preview = Preview;
export default Preview;
