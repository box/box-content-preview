import './preview.scss';
import './polyfill';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import Browser from './browser';
import Logger from './logger';
import loaders from './loaders';
import cache from './cache';
import RepStatus from './rep-status';
import ErrorLoader from './viewers/error/error-loader';
import { get, post, decodeKeydown, openUrlInsideIframe, getHeaders, findScriptLocation } from './util';
import throttle from 'lodash.throttle';
import getTokens from './tokens';
import { getURL, getDownloadURL, checkPermission, checkFeature, checkFileValid } from './file';
import { setup, cleanup, showLoadingIndicator, hideLoadingIndicator, showDownloadButton, showLoadingDownloadButton, showAnnotateButton, showPrintButton, showNavigation } from './ui';
import { CLASS_NAVIGATION_VISIBILITY, PERMISSION_DOWNLOAD, PERMISSION_ANNOTATE, PERMISSION_PREVIEW, API } from './constants';

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
     * @returns {Preview} Preview instance
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
     * @returns {void}
     */
    destroy() {
        // Stop polling for rep-status
        if (this.repStatus) {
            this.repStatus.destroy();
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
     * @param {string|Object} file Box File ID or well-formed file object
     * @param {Object} options Preview options
     * @returns {void}
     */
    show(file, options) {
        // Save a reference to the options to be used later
        this.previewOptions = Object.assign({}, options);

        // load the preview
        this.load(file);
    }

    /**
     * Destroys and hides the preview.
     *
     * @returns {void}
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
     * @param {array} [collection] Updated collection of file IDs
     * @returns {void}
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
     * @param {array|Object} [fileMetadata] Array or single file metadata to cache
     * @returns {void}
     */
    updateFileCache(fileMetadata = []) {
        let files = fileMetadata;
        if (!Array.isArray(files)) {
            files = [fileMetadata];
        }

        files.forEach((file) => {
            if (checkFileValid(file)) {
                cache.set(file.id, file);
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
     * @returns {Object|undefined} Current viewer
     */
    getCurrentViewer() {
        return this.viewer;
    }

    /**
     * Returns the current file being previewed.
     *
     * @returns {Object|null} Current file
     */
    getCurrentFile() {
        return this.file;
    }

    /**
     * Returns the current file being previewed.
     *
     * @returns {Object|null} Current collection
     */
    getCurrentCollection() {
        return this.collection;
    }

    /**
     * Returns the list of viewers that Preview supports.
     *
     * @returns {array} List of supported viewers
     */
    getViewers() {
        let viewers = [];
        this.loaders.forEach((loader) => {
            viewers = viewers.concat(loader.getViewers());
        });
        return viewers;
    }

    /**
     * Prefetches the viewers. If specific viewer names are passed in, only
     * prefetch assets for those viewers. Otherwise, prefetch assets for
     * all viewers.
     *
     * @param {array} [viewerNames] Names of specific viewers to prefetch assets for
     * @returns {void}
     */
    prefetchViewers(viewerNames = []) {
        let viewers = this.getViewers();

        // Filter down to specified viewers
        if (viewerNames.length) {
            viewers = viewers.filter((viewer) => {
                return viewerNames.indexOf(viewer.CONSTRUCTOR) !== -1;
            });
        }

        const loader = this.loaders[0]; // use any loader
        viewers.forEach((viewer) => {
            loader.prefetchAssets(viewer, this.location);
        });
    }

    /**
     * Disables one or more viewers.
     *
     * @param {string|Array} viewers destroys the container contents
     * @returns {void}
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
     * @param {string|Array} viewers destroys the container contents
     * @returns {void}
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
     * Resizes the preview.
     *
     * @returns {void}
     */
    resize() {
        if (this.viewer && typeof this.viewer.resize === 'function') {
            this.viewer.resize();
        }
    }

    /**
     * Prints the file being previewed if the viewer supports printing.
     *
     * @returns {void}
     */
    print() {
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && checkFeature(this.viewer, 'print')) {
            this.viewer.print();
        }
    }

    /**
     * Downloads the file being previewed.
     *
     * @returns {void}
     */
    download() {
        if (checkPermission(this.file, PERMISSION_DOWNLOAD)) {
            get(getDownloadURL(this.file.id, this.options.api), this.getRequestHeaders())
            .then((data) => {
                openUrlInsideIframe(data.download_url);
            });
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Initial method for loading a preview.
     *
     * @param {string|Object} file File ID or well-formed file object to preview
     * @returns {void}
     * @private
     */
    load(file) {
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
     * @param {Object} tokenMap Map of file ID to access token
     * @returns {void}
     * @private
     */
    loadPreviewWithTokens(tokenMap) {
        // Parse the preview options supplied by show()
        this.parseOptions(this.previewOptions, tokenMap);

        // Setup the shell and loading UI
        this.container = setup(this.options, this.keydownHandler, this.navigateLeft, this.navigateRight, this.getGlobalMousemoveHandler());
        showLoadingIndicator();

        // Show download button while preview is loading
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload) {
            showLoadingDownloadButton(this.download);
        }

        // Update navigation
        showNavigation(this.file.id, this.collection);

        // Cache the file
        cache.set(this.file.id, this.file);

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
     * @param {Object} previewOptions Options specified by show()
     * @param {Object} token Map of file ID to access token
     * @returns {void}
     * @private
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

        // Save the location of preview for viewers
        this.options.location = Object.assign({}, this.location);

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

        // Save the files to iterate through
        this.collection = options.collection || [];

        // Save the reference to any additional custom options for viewers
        this.options.viewers = options.viewers || {};

        // Prefix any user created loaders before our default ones
        this.loaders = (options.loaders || []).concat(loaders);

        // Iterate over all the viewer options and disable any viewer
        // that has an option disabled set to true
        this.disableViewers(Object.keys(this.options.viewers).filter((viewer) => !!this.options.viewers[viewer].disabled));
    }

    /**
     * Loads a preview from the cache.
     *
     * @returns {void}
     * @private
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
     * @returns {void}
     * @private
     */
    loadFromServer() {
        get(getURL(this.file.id, this.options.api), this.getRequestHeaders())
        .then(this.handleLoadResponse)
        .catch(this.triggerFetchError);
    }

    /**
     * Loads the preview from server response.
     *
     * @param {Object} file File object
     * @returns {void}
     * @private
     */
    handleLoadResponse(file) {
        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        try {
            // Save reference to the file and update logger
            this.file = file;
            this.logger.setFile(file);

            // Get existing cache before updating it to latest version
            const cached = cache.get(file.id);
            cache.set(file.id, file);

            // Finally re-load the viewer if cached file sha1 doesn't match loaded file sha1
            if (!cached || !cached.file_version || cached.file_version.sha1 !== file.file_version.sha1) {
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
     * @returns {void}
     * @private
     */
    loadViewer() {
        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        // Before loading a new preview check if a prior preview was showing.
        // If it was showing make sure to destroy it to do any cleanup.
        this.destroy();

        // Check if preview permissions exist
        if (!checkPermission(this.file, PERMISSION_PREVIEW)) {
            throw new Error(__('error_permissions'));
        }

        // Determine the asset loader to use
        const loader = this.getLoader(this.file);

        // Determine the viewer to use
        const viewer = loader.determineViewer(this.file, Object.keys(this.disabledViewers));

        // Log the type of file
        this.logger.setType(viewer.CONSTRUCTOR);

        // Determine the representation to use
        const representation = loader.determineRepresentation(this.file, viewer);

        // Load all the static assets
        const promiseToLoadStaticAssets = loader.load(viewer, this.options.location);
        promiseToLoadStaticAssets.catch((err) => {
            this.triggerError((err instanceof Error) ? err : new Error(__('error_refresh')));
        });

        // Load the representation assets
        this.repStatus = new RepStatus(representation, this.getRequestHeaders(), this.logger, viewer.REQUIRED_REPRESENTATIONS);
        const promiseToGetRepresentationStatusSuccess = loader.determineRepresentationStatus(this.repStatus);
        promiseToGetRepresentationStatusSuccess.catch((err) => {
            this.triggerError((err instanceof Error) ? err : new Error(__('error_reupload')));
        });

        // Proceed only when both static and representation assets have been loaded
        Promise.all([promiseToLoadStaticAssets, promiseToGetRepresentationStatusSuccess]).then(() => {
            // Instantiate the viewer
            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, Object.assign({}, this.options, {
                file: this.file,
                viewerName: viewer.CONSTRUCTOR // name of the viewer, cannot rely on constructor.name
            }));

            // Once the viewer instance has been created, emit it so that clients can attach their events.
            // Viewer object will still be sent along the load event also.
            this.emit('viewer', this.viewer);

            // Add listeners for viewer events
            this.attachViewerListeners();

            // Load the representation into the viewer
            this.viewer.load(representation.links.content.url);
        }).catch((err) => {
            this.triggerError((err instanceof Error) ? err : new Error(__('error_refresh')));
        });
    }

    /**
     * Attach event listeners for viewer.
     *
     * @returns {void}
     * @private
     */
    attachViewerListeners() {
        // Node requires listener attached to 'error'
        this.viewer.addListener('error', this.triggerError);
        this.viewer.addListener('viewerevent', (data) => {
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
     * Final tasks to finish loading a viewer.
     *
     * @param {Object} [data] Load event data
     * @returns {void}
     * @private
     */
    finishLoading(data = {}) {
        // Show or hide annotate/print/download buttons
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload && !Browser.isMobile()) {
            showDownloadButton(this.download);

            if (checkFeature(this.viewer, 'print')) {
                showPrintButton(this.print);
            }
        }

        if (checkPermission(this.file, PERMISSION_ANNOTATE) && !Browser.isMobile()) {
            if (checkFeature(this.viewer, 'isAnnotatable', 'point')) {
                showAnnotateButton(this.viewer.getPointModeClickHandler());
            }
        }

        // Once the viewer loads, hide the loading indicator
        hideLoadingIndicator();

        // Bump up preview count
        this.count.success += 1;

        // Finally emit the viewer instance back with a load event
        this.emit('load', {
            viewer: this.viewer,
            metrics: this.logger.done(this.count),
            file: this.file
        });

        // If there wasn't an error, use Events API to log a preview
        if (typeof data.error !== 'string') {
            this.logPreviewEvent(this.file.id, this.options);
        }

        // Hookup for phantom JS health check
        if (typeof window.callPhantom === 'function') {
            window.callPhantom(1);
        }

        // Prefetch other files
        this.prefetch();
    }

    /**
     * Logs 'preview' event via the Events API. This is used for logging that a
     * preview happened for access stats, unlike the Logger, which logs preview
     * errors and performance metrics.
     *
     * @param {string} fileID File ID to log preview event for
     * @param {Object} options File options, e.g. token, shared link
     * @returns {void}
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
     * @returns {void}
     * @private
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
     * Generic error handler. Shows the error viewer with the specified error
     * message.
     *
     * @param {Error} reason error
     * @returns {void}
     * @private
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

        const viewer = ErrorLoader.determineViewer();
        ErrorLoader.load(viewer, this.options.location).then(() => {
            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, Object.assign({}, this.options, {
                file: this.file
            }));

            this.viewer.load('', displayMessage);
            hideLoadingIndicator();

            // Add listeners for viewer events
            this.attachViewerListeners();

            // Show the download button
            if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload) {
                showDownloadButton(this.download);
            }

            // Bump up preview count
            this.count.error += 1;

            this.emit('error', {
                error: logMessage,
                metrics: this.logger.done(this.count),
                file: this.file
            });

            // Hookup for phantom JS health check
            if (typeof window.callPhantom === 'function') {
                window.callPhantom(0);
            }
        });
    }

    /**
     * Builds a list of required XHR headers.
     *
     * @param {string} [token] auth token
     * @returns {Object} Headers
     * @private
     */
    getRequestHeaders(token) {
        const hints = Browser.canPlayDash() ? '|dash|filmstrip|mp4' : '|mp4';
        const headers = {
            'X-Rep-Hints': `3d|pdf|png?dimensions=2048x2048|jpg?dimensions=2048x2048|mp3${hints}`
        };
        return getHeaders(headers, token || this.options.token, this.options.sharedLink, this.options.sharedLinkPassword);
    }

    /**
     * Prefetches file information and content for the next few files to
     * improve preview performance for those files.
     *
     * @returns {void}
     * @private
     */
    prefetch() {
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
                    cache.set(file.id, file);
                    this.prefetchedCollection.push(file.id);

                    // Prefetch content
                    this.prefetchContent(file, token);
                })
                .catch(() => {
                    /* eslint-disable no-console */
                    console.log(`Error prefetching file ID ${id}`);
                    /* eslint-enable no-console */
                });
            });
        })
        .catch(() => {
            /* eslint-disable no-console */
            console.log('Error prefetching files');
            /* eslint-enable no-console */
        });
    }

    /**
     * Prefetches a file's content if possible so the browser can cache the
     * content and significantly improve preview load time.
     *
     * @param {Object} file File metadata
     * @param {string} token Access token to fetch content with
     * @returns {Promise} Promise that resolves when content is prefetched
     * @private
     */
    prefetchContent(file, token) {
        const loader = this.getLoader(file);
        if (loader && typeof loader.prefetch === 'function') {
            return loader.prefetch(file, token, this.location, this.options.sharedLink, this.options.sharedLinkPassword);
        }

        return Promise.reject();
    }

    /**
     * Mousemove handler for navigation.
     *
     * @returns {Function} Throttled mousemove handler
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
     * @param {number} index Index of file to preview
     * @returns {void}
     * @private
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
     * @returns {void}
     * @private
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
     * @returns {void}
     * @private
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
     * @param {Object} file File to preview
     * @returns {Object} Loader to use
     * @private
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
     * @param {Event} event keydown event
     * @returns {void}
     * @private
     */
    keydownHandler(event) {
        const target = event.target;

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

// Export a singleton instance for preview.
Box.Preview = new Preview();
global.Box = Box;
global.Preview = Preview;
export default Box.Preview;
