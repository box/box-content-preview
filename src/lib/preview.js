/* eslint-disable import/first */
import './polyfill';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import throttle from 'lodash.throttle';
import cloneDeep from 'lodash.clonedeep';
/* eslint-enable import/first */
import Browser from './browser';
import Logger from './logger';
import loaders from './loaders';
import cache from './cache';
import ProgressBar from './progress-bar';
import PreviewError from './viewers/error/error';
import { get, post, decodeKeydown, openUrlInsideIframe, getHeaders, findScriptLocation } from './util';
import getTokens from './tokens';
import { getURL, getDownloadURL, checkPermission, checkFeature, checkFileValid, cacheFile } from './file';
import { setup, cleanup, showLoadingIndicator, hideLoadingIndicator, showDownloadButton, showLoadingDownloadButton, showAnnotateButton, showPrintButton, showNavigation } from './ui';
import {
    API,
    CLASS_NAVIGATION_VISIBILITY,
    PERMISSION_DOWNLOAD,
    PERMISSION_ANNOTATE,
    PERMISSION_PREVIEW
} from './constants';
import './preview.scss';

const DEFAULT_DISABLED_VIEWERS = ['Office']; // viewers disabled by default
const PREFETCH_COUNT = 4; // number of files to prefetch
const MOUSEMOVE_THROTTLE = 1500; // for showing or hiding the navigation icons
const RETRY_TIMEOUT = 500; // retry network request interval for a file
const RETRY_COUNT = 5; // number of times to retry network request for a file
const KEYDOWN_EXCEPTIONS = ['INPUT', 'SELECT', 'TEXTAREA']; // Ignore keydown events on these elements
const LOG_RETRY_TIMEOUT = 500; // retry interval for logging preview event
const LOG_RETRY_COUNT = 3; // number of times to retry logging preview event

const Box = global.Box || {};

@autobind
class Preview extends EventEmitter {

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

        // State of preview
        this.open = false;

        // Some analytics that span across preview sessions
        this.count = {
            success: 0,     // Counts how many previews have happened overall
            error: 0,       // Counts how many errors have happened overall
            navigation: 0   // Counts how many previews have happened by prev next navigation
        };

        // Current file being previewed
        this.file = {};

        // Options
        this.options = {};

        // Disabled viewers
        this.disabledViewers = {};
        DEFAULT_DISABLED_VIEWERS.forEach((viewerName) => {
            this.disabledViewers[viewerName] = 1;
        });

        // Auth token
        this.token = '';

        // Default list of loaders for viewers
        this.loaders = loaders;

        // All preview assets are relative to preview.js. Here we create a location
        // object that mimics the window location object and points to where
        // preview.js is loaded from by the browser.
        this.location = findScriptLocation('preview.js', document.currentScript);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        // Cleanup progress bar
        if (this.progressBar) {
            this.progressBar.destroy();
        }

        // Destroy viewer
        if (this.viewer && typeof this.viewer.destroy === 'function') {
            this.viewer.destroy();
        }

        this.viewer = undefined;
    }

    /**
     * Primary function for showing a preview of a file.
     *
     * @param {String|Object} file - Box File ID or well-formed file object
     * @param {String|Function} token - auth token string or generator function
     * @param {Object} [options] - Optional preview options
     * @return {void}
     */
    show(file, token, options = {}) {
        // Save a reference to the options to be used later
        if (typeof token === 'string' || typeof token === 'function') {
            this.previewOptions = Object.assign({}, options, { token });
        } else if (token) {
            // @TODO Remove this use case after a few releases and webapp upgrade
            this.previewOptions = Object.assign({}, token || {});
        } else {
            throw new Error('Missing Auth Token!');
        }

        // load the preview
        this.load(file);
    }

    /**
     * Destroys and hides the preview.
     *
     * @return {void}
     */
    hide() {
        // Indicate preview is closed
        this.open = false;

        // Destroy the viewer and cleanup preview
        this.destroy();

        // Clean the UI
        cleanup();

        // Nuke the file
        this.file = undefined;
    }

    /**
     * Updates files to navigate between.
     *
     * @param {string[]} [collection] - Updated collection of file IDs
     * @return {void}
     */
    updateCollection(collection = []) {
        this.collection = Array.isArray(collection) ? collection : [];
        // Also update the original collection that was saved from the initial show
        this.previewOptions.collection = this.collection;
        if (this.file) {
            showNavigation(this.file.id, this.collection);
        }
    }

    /**
     * Updates the file cache with the provided file metadata. Can be used to
     * improve performance if file metadata can be fetched at some point before
     * a file is previewed. Note that we only do simple validation that the
     * expected properties exist before caching.
     *
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
                cacheFile(file);
            } else {
                /* eslint-disable no-console */
                console.error('[Preview SDK] Tried to cache invalid file: ', file);
                /* eslint-enable no-console */
            }
        });
    }

    /**
     * Returns the current viewer.
     *
     * @return {Object|undefined} Current viewer
     */
    getCurrentViewer() {
        return this.viewer;
    }

    /**
     * Returns the current file being previewed.
     *
     * @return {Object|null} Current file
     */
    getCurrentFile() {
        return this.file;
    }

    /**
     * Returns the current file being previewed.
     *
     * @return {Object|null} Current collection
     */
    getCurrentCollection() {
        return this.collection;
    }

    /**
     * Returns the list of viewers that Preview supports.
     *
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
     * @return {void}
     */
    disableHotkeys() {
        this.options.useHotkeys = false;
    }

    /**
     * Enables keyboard shortcuts / hotkeys for Preview.
     *
     * @return {void}
     */
    enableHotkeys() {
        this.options.useHotkeys = true;
    }

    /**
     * Resizes the preview.
     *
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
     * @return {void}
     */
    download() {
        if (checkPermission(this.file, PERMISSION_DOWNLOAD)) {
            get(getDownloadURL(this.file.id, this.options.api), this.getRequestHeaders())
            .then((data) => {
                openUrlInsideIframe(data.download_url);
            });
        }
    }

    /**
     * Updates the token Preview uses. Passed in parameter can either be a
     * string token or token generation function. See tokens.js.
     *
     * @param {string|function} tokenOrTokenFunc - Either an access token or token
     * generator function
     * @param {boolean} [reloadPreview] - Whether or not to reload the current
     * preview with the updated token, defaults to true
     * @return {void}
     */
    updateToken(tokenOrTokenFunc, reloadPreview = true) {
        this.previewOptions.token = tokenOrTokenFunc;

        if (reloadPreview) {
            this.load(this.file);
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
     * @param {Object} options - Prefetch options
     * @param {string} options.fileID - Box File ID
     * @param {string} options.token - Access token
     * @param {string} options.sharedLink - Shared link
     * @param {string} options.sharedLinkPassword - Shared link password
     * @param {boolean} options.preload - Is this prefetch for a preload
     * @param {string} token - Access token
     * @return {void}
     */
    prefetch({
        fileID,
        token,
        sharedLink = '',
        sharedLinkPassword = '',
        preload = false
    }) {
        const file = cache.get(fileID);
        const loader = file ? this.getLoader(file) : null;
        const viewer = loader ? loader.determineViewer(file) : null;
        if (!viewer) {
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
                preload: true, // always prefetch preload content since it is lightweight
                content: !preload // don't prefetch file's representation content if this is for preload
            });
        }
    }

    /**
     * Prefetches static viewer assets for the specified viewers.
     *
     * @param {string[]} [viewerNames] - Names of viewers to prefetch, defaults to none
     * @return {void}
     */
    prefetchViewers(viewerNames = []) {
        this.getViewers()
            .filter((viewer) => viewerNames.indexOf(viewer.NAME) !== -1)
            .forEach((viewer) => {
                const viewerInstance = new viewer.CONSTRUCTOR(this.createViewerOptions({
                    viewer
                }));

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
     * DELETE ME AFTER WEBAPP UPDATE
     */
    prefetchPreload(fileID, token, sharedLink) {
        this.prefetch({
            fileID,
            token,
            sharedLink,
            preload: true
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Initial method for loading a preview.
     *
     * @private
     * @param {string|Object} file - File ID or well-formed file object to preview
     * @return {void}
     */
    load(file) {
        // Clean up any existing previews before loading
        this.destroy();

        // Indicate preview is open
        this.open = true;

        // Init performance logging
        this.logger = new Logger(this.location.locale);

        // Clear any existing retry timeouts
        clearTimeout(this.retryTimeout);

        // Save reference to the currently shown file, if any
        const current = this.file ? this.file.id : undefined;

        // Check if a file id was passed in or a well formed file object
        // Cache the file in the files array so that we don't prefetch it.
        // If we don't have the file data, we create an empty file object.
        // If we have the file data, we just use that.
        if (typeof file === 'string') {
            // String file id was passed in, check if its in the cache
            this.file = cache.get(file) || { id: file };
        } else {
            // File object was passed in, treat it like cached
            this.file = file;
        }

        // If we are trying to load the same file again, only try 5 times
        // Don't want to try to load the file multiple times in
        if (this.file.id === current) {
            this.retryCount += 1;
        } else {
            this.retryCount = 0;
        }

        // Fetch access tokens before doing anything
        getTokens(this.file.id, this.previewOptions.token)
        .then(this.loadPreviewWithTokens)
        .catch(this.triggerFetchError);
    }

    /**
     * Loads preview for the current file given access tokens.
     *
     * @private
     * @param {Object} tokenMap - Map of file ID to access token
     * @return {void}
     */
    loadPreviewWithTokens(tokenMap) {
        // If this is a retry, short-circuit and load from server
        if (this.retryCount > 0) {
            this.loadFromServer();
            return;
        }

        // Parse the preview options supplied by show()
        this.parseOptions(this.previewOptions, tokenMap);

        // Setup the shell
        this.container = setup(
            this.options,
            this.keydownHandler,
            this.navigateLeft,
            this.navigateRight,
            this.getGlobalMousemoveHandler()
        );

        // Setup loading UI and progress bar
        showLoadingIndicator();
        this.startProgressBar();

        // Update navigation
        showNavigation(this.file.id, this.collection);

        // Cache the file
        cacheFile(this.file);

        // Normalize files array by putting current file inside it
        // if it was is empty. If its not empty, then it is assumed
        // that current file is already inside files array.
        if (this.collection.length === 0) {
            this.collection = [this.file.id];
        }

        if (checkFileValid(this.file)) {
            // Cache hit, use that.
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
     * @param {Object} token - Map of file ID to access token
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

        // Save the reference to the api endpoint
        this.options.api = options.api ? options.api.replace(/\/$/, '') : API;

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

        // Enable preload (quick preview shown during loading)
        this.options.preload = !!options.preload;

        // Save the files to iterate through
        this.collection = options.collection || [];

        // Save the reference to any additional custom options for viewers
        this.options.viewers = options.viewers || {};

        // Prefix any user created loaders before our default ones
        this.loaders = (options.loaders || []).concat(loaders);

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
        return cloneDeep(Object.assign({ location: this.location }, this.options, moreOptions));
    }

    /**
     * Loads a preview from the cache.
     *
     * @private
     * @return {void}
     */
    loadFromCache() {
        // Add details to the logger
        this.logger.setCached();

        // Finally load the viewer
        this.loadViewer();

        // Also refresh from server to update cache
        this.loadFromServer();
    }

    /**
     * Loads a preview from the server.
     *
     * @private
     * @return {void}
     */
    loadFromServer() {
        get(getURL(this.file.id, this.options.api), this.getRequestHeaders())
        .then(this.handleLoadResponse)
        .catch(this.triggerFetchError);
    }

    /**
     * Loads the preview from server response.
     *
     * @private
     * @param {Object} file - File object
     * @return {void}
     */
    handleLoadResponse(file) {
        // If preview is closed or response comes back for an incorrect file, don't do anything
        if (!this.open || (this.file && this.file.id !== file.id)) {
            return;
        }

        try {
            // Save reference to the file and update logger
            this.file = file;
            this.logger.setFile(file);

            // Keep reference to previously cached file version
            const cached = cache.get(file.id);

            // Check if cache is stale or if updated file info is watermarked
            const isWatermarked = file.watermark_info && file.watermark_info.is_watermarked;
            const isStale = !cached || !cached.file_version || cached.file_version.sha1 !== file.file_version.sha1;

            // Don't cache watermarked files, update cache otherwise
            if (isWatermarked) {
                cache.unset(file.id);
            } else {
                cacheFile(file);
            }

            // Reload if needed
            if (isStale || isWatermarked) {
                this.logger.setCacheStale();
                this.loadViewer();
            }
        } catch (err) {
            this.triggerError((err instanceof Error) ? err : new Error(__('error_refresh')));
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

        // Show download button if download permissions exist and preview options allow
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload) {
            showLoadingDownloadButton(this.download);
        }

        // Determine the asset loader to use
        const loader = this.getLoader(this.file);

        // If no loader then throw an unsupported error
        if (!loader) {
            throw new Error();
        }

        // Determine the viewer to use
        const viewer = loader.determineViewer(this.file, Object.keys(this.disabledViewers));

        // Determine the representation to use
        const representation = loader.determineRepresentation(this.file, viewer);

        // Instantiate the viewer
        this.viewer = new viewer.CONSTRUCTOR(this.createViewerOptions({
            viewer,
            representation,
            container: this.container,
            file: this.file,
            logger: this.logger
        }));

        // Log the type of file
        this.logger.setType(this.viewer.NAME);

        // Add listeners for viewer events
        this.attachViewerListeners();

        // Load the representation into the viewer
        this.viewer.load();

        // Once the viewer instance has been created, emit it so that clients can attach their events.
        // Viewer object will still be sent along the load event also.
        this.emit('viewer', this.viewer);
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
        this.viewer.addListener('viewerevent', (data) => {
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
                case 'progressend':
                    this.finishProgressBar();
                    break;
                case 'notification':
                    this.emit('notification', data.data);
                    break;
                default:
                    this.emit(data.event, data.data);
                    this.emit('viewerevent', data);
            }
        });
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
        // Show or hide annotate/print/download buttons
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload && !Browser.isMobile()) {
            showDownloadButton(this.download);

            if (checkFeature(this.viewer, 'print')) {
                showPrintButton(this.print);
            }
        }

        if (checkPermission(this.file, PERMISSION_ANNOTATE) && !Browser.isMobile() && checkFeature(this.viewer, 'isAnnotatable', 'point')) {
            showAnnotateButton(this.viewer.getPointModeClickHandler());
        }

        const { error } = data;
        if (error) {
            // Bump up preview count
            this.count.error += 1;

            // 'load' with { error } signifies a preview error
            this.emit('load', {
                error,
                metrics: this.logger.done(this.count),
                file: this.file
            });

            // Hookup for phantom JS health check
            if (typeof window.callPhantom === 'function') {
                window.callPhantom(0);
            }
        } else {
            // Bump up preview count
            this.count.success += 1;

            // Finally emit the viewer instance back with a load event
            this.emit('load', {
                viewer: this.viewer,
                metrics: this.logger.done(this.count),
                file: this.file
            });

            // If there wasn't an error, use Events API to log a preview
            this.logPreviewEvent(this.file.id, this.options);

            // Hookup for phantom JS health check
            if (typeof window.callPhantom === 'function') {
                window.callPhantom(1);
            }
        }

        // Finish the progress bar unless instructed not to
        if (data.endProgress !== false) {
            this.finishProgressBar();
        }

        // Programmtically focus on the viewer after it loads
        if (this.viewer && this.viewer.containerEl) {
            this.viewer.containerEl.focus();
        }

        // Hide the loading indicator
        hideLoadingIndicator();

        // Prefetch next few files
        this.prefetchNextFiles();
    }

    /**
     * Logs 'preview' event via the Events API. This is used for logging that a
     * preview happened for access stats, unlike the Logger, which logs preview
     * errors and performance metrics.
     *
     * @param {string} fileID - File ID to log preview event for
     * @param {Object} options - File options, e.g. token, shared link
     * @return {void}
     * @private
     */
    logPreviewEvent(fileID, options) {
        this.logRetryCount = this.logRetryCount || 0;

        const { api, token, sharedLink, sharedLinkPassword } = options;
        const headers = getHeaders({}, token, sharedLink, sharedLinkPassword);

        post(`${api}/2.0/events`, headers, {
            event_type: 'preview',
            source: {
                type: 'file',
                id: fileID
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
                this.logPreviewEvent(fileID, options);
            }, LOG_RETRY_TIMEOUT * this.logRetryCount);
        });
    }

    /**
     * Triggers an error due to fetch.
     *
     * @private
     * @return {void}
     */
    triggerFetchError() {
        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        // Nuke the cache
        cache.unset(this.file.id);

        // Check if hit the retry limit
        if (this.retryCount > RETRY_COUNT) {
            this.triggerError(new Error(__('error_refresh')));
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
        return new PreviewError(this.createViewerOptions({
            viewer: { NAME: 'Error' },
            container: this.container,
            file: this.file
        }));
    }

    /**
     * Generic error handler. Shows the error viewer with the specified error
     * message.
     *
     * @private
     * @param {Error} reason - Error
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
        cache.unset(this.file.id);

        // Destroy anything still showing
        this.destroy();

        // Figure out what error message to log and what error message to display
        const logMessage = err instanceof Error ? err.message : __('error_default');
        const displayMessage = err && err.displayMessage ? err.displayMessage : logMessage;

        // Instantiate the error viewer
        this.viewer = this.getErrorViewer();

        // Add listeners for viewer events
        this.attachViewerListeners();

        // Load the error viewer
        this.viewer.load(displayMessage);
    }

    /**
     * Builds a list of required XHR headers.
     *
     * @private
     * @param {string} [token] - Auth token
     * @return {Object} Headers
     */
    getRequestHeaders(token) {
        const videoHints = Browser.canPlayDash() ? '[dash,mp4][filmstrip]' : '[mp4]';
        const headers = {
            'X-Rep-Hints': '[3d][pdf][text][jpg?dimensions=2048x2048,jpg?dimensions=1024x1024,' +
                `png?dimensions=2048x2048,png?dimensions=1024x1024][mp3]${videoHints}`
        };
        return getHeaders(headers, token || this.options.token, this.options.sharedLink, this.options.sharedLinkPassword);
    }

    /**
     * Prefetches file information and content for the next few files to
     * improve preview performance for those files.
     *
     * @private
     * @return {void}
     */
    prefetchNextFiles() {
        // Don't bother prefetching when there aren't more files
        if (this.collection.length < 2) {
            return;
        }

        // Maintain collection of files we have already prefetched
        this.prefetchedCollection = this.prefetchedCollection || [];

        // Prefetch the next PREFETCH_COUNT files excluding ones we've already prefetched
        const currentIndex = this.collection.indexOf(this.file.id);
        const filesToPrefetch = this.collection.slice(currentIndex + 1, currentIndex + PREFETCH_COUNT + 1)
            .filter((fileID) => this.prefetchedCollection.indexOf(fileID) === -1);

        // Check if we need to prefetch anything
        if (filesToPrefetch.length === 0) {
            return;
        }

        // Get access tokens for all files we should be prefetching
        getTokens(filesToPrefetch, this.previewOptions.token)
        .then((tokenMap) => {
            filesToPrefetch.forEach((id) => {
                const token = tokenMap[id];

                // Prefetch and cache file information and content
                get(getURL(id, this.options.api), this.getRequestHeaders(token))
                .then((file) => {
                    // Cache file info
                    cacheFile(file);
                    this.prefetchedCollection.push(file.id);

                    // Prefetch assets and content for file
                    this.prefetch({
                        fileID: file.id,
                        token
                    });
                })
                .catch((err) => {
                    /* eslint-disable no-console */
                    console.error(`Error prefetching file ID ${id} - ${err}`);
                    /* eslint-enable no-console */
                });
            });
        })
        .catch(() => {
            /* eslint-disable no-console */
            console.error('Error prefetching files');
            /* eslint-enable no-console */
        });
    }

    /**
     * Shows and starts a progress bar at the top of the preview.
     *
     * @private
     * @return {void}
     */
    startProgressBar() {
        this.progressBar = new ProgressBar(this.container);
        this.progressBar.start();
    }

    /**
     * Finishes and hides the top progress bar if present.
     *
     * @private
     * @return {void}
     */
    finishProgressBar() {
        if (this.progressBar) {
            this.progressBar.finish();
        }
    }

    /**
     * Mousemove handler for navigation.
     *
     * @return {Function} Throttled mousemove handler
     * @private
     */
    getGlobalMousemoveHandler() {
        if (this.throttledMousemoveHandler) {
            return this.throttledMousemoveHandler;
        }

        this.throttledMousemoveHandler = throttle(() => {
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
        }, MOUSEMOVE_THROTTLE - 500, true);

        return this.throttledMousemoveHandler;
    }

    /**
     * Shows a preview of a file at the specified index in the current collection.
     *
     * @private
     * @param {number} index - Index of file to preview
     * @return {void}
     */
    navigateToIndex(index) {
        const file = this.collection[index];
        this.emit('navigate', file);
        this.count.navigation += 1;
        this.load(file);
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
     * Global keydown handler for preview.
     *
     * @TODO fix multiple preview key issue
     * @TODO fire key event
     *
     * @private
     * @param {Event} event - keydown event
     * @return {void}
     */
    keydownHandler(event) {
        const target = event.target;

        // If keyboard shortcuts / hotkeys are disabled, ignore
        if (!this.options.useHotkeys) {
            return;
        }

        // Ignore key events when we are inside certain fields
        if (!target
            || KEYDOWN_EXCEPTIONS.indexOf(target.nodeName) > -1
            || (target.nodeName === 'DIV' && !!target.getAttribute('contenteditable'))) {
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
}

Box.Preview = new Preview();
global.Box = Box;
export default Preview;
