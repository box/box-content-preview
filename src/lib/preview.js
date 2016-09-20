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
import { getURL, getDownloadURL, checkPermission, checkFeature } from './file';
import { setup, cleanup, showLoadingIndicator, hideLoadingIndicator, showDownloadButton, showLoadingDownloadButton, showAnnotateButton, showPrintButton, showNavigation } from './ui';
import { CLASS_NAVIGATION_VISIBILITY, PERMISSION_DOWNLOAD, PERMISSION_ANNOTATE, PERMISSION_PREVIEW, API } from './constants';

const PREFETCH_COUNT = 20; // number of files to prefetch
const MOUSEMOVE_THROTTLE = 1500; // for showing or hiding the navigation icons
const RETRY_TIMEOUT = 500; // retry network request interval for a file
const RETRY_COUNT = 5; // number of times to retry network request for a file

const Box = global.Box || {};

@autobind
class Preview extends EventEmitter {

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     * @returns {Preview} Returns a preview
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
     * Parses the preview options
     *
     * @private
     * @param {Object} token auth token map
     * @returns {void}
     */
    parseOptions(tokens) {
        // Grab the options from saved preview options
        const options = Object.assign({}, this.previewOptions);

        // Reset all options
        this.options = {};

        // Container for preview
        this.options.container = options.container;

        // Authorization token
        this.options.token = tokens[this.file.id];

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
     * Loads the preview for a file.
     *
     * @param {string|Object} file File to preview
     * @private
     * @returns {void}
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

        // Fetch tokens before doing anything
        getTokens(this.file.id, this.previewOptions.token)
        .then(this.fetchTokensResponse)
        .catch(this.triggerFetchError);
    }

    /**
     * Loads the preview for a file.
     *
     * @param {string|Object} file File to preview
     * @private
     * @returns {void}
     */
    fetchTokensResponse(tokens) {
        // Parse the preview options
        this.parseOptions(tokens);

        // Setup the UI before anything else.
        this.container = setup(this.options, this.keydownHandler, this.navigateLeft, this.navigateRight, this.getGlobalMousemoveHandler());

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

        if (this.file.representations && Array.isArray(this.file.representations.entries)) { // @TODO we need a better check to validate file object
            // Cache hit, use that.
            this.loadFromCache();
        } else {
            // Cache miss, fetch from the server.
            this.loadFromServer();
        }
    }

    /**
     * Loads a preview from cache.
     *
     * @private
     * @returns {void}
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
     * @param {string} id File id to preview
     * @returns {void}
     */
    loadFromServer() {
        get(getURL(this.file.id, this.options.api), this.getRequestHeaders())
        .then(this.handleLoadResponse)
        .catch(this.triggerFetchError);
    }

    /**
     * Loads the file from server response
     *
     * @private
     * @param {Object} file File object
     * @returns {void}
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
            this.triggerError((err instanceof Error) ? err : new Error(__('error_viewer_load')));
        }
    }

    /**
     * Loads a viewer.
     *
     * @private
     * @returns {void}
     */
    loadViewer() {
        // If preview is closed don't do anything
        if (!this.open) {
            return;
        }

        // Before loading a new preview check if a prior preview was showing.
        // If it was showing make sure to destroy it to do any cleanup.
        this.destroy();

        showLoadingIndicator();

        // Setup download button during load
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload) {
            showLoadingDownloadButton(this.download);
        }

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
            this.triggerError((err instanceof Error) ? err : new Error(__('error_static_assets_load')));
        });

        // Load the representation assets
        const promiseToGetRepresentationStatusSuccess = loader.determineRepresentationStatus(new RepStatus(representation, this.getRequestHeaders(), this.logger, viewer.REQUIRED_REPRESENTATIONS));
        promiseToGetRepresentationStatusSuccess.catch((err) => {
            this.triggerError((err instanceof Error) ? err : new Error(__('error_representation_load')));
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
            this.triggerError((err instanceof Error) ? err : new Error(__('error_viewer_load')));
        });
    }

    /**
     * Loads a viewer.
     *
     * @private
     * @returns {void}
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
     * @private
     * @param {Object} [data] Load event data
     * @returns {void}
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
            this.logPreviewEvent();
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
     * @returns {void}
     * @private
     */
    logPreviewEvent() {
        const { api, token, sharedLink, sharedLinkPassword } = this.options;
        const headers = getHeaders({}, token, sharedLink, sharedLinkPassword);

        post(`${api}/2.0/events`, headers, {
            event_type: 'preview',
            source: {
                type: 'file',
                id: this.file.id
            }
        })
        .catch(() => {});
    }

    /**
     * Triggers an error due to fetch.
     *
     * @private
     * @param {string|null|undefined|Error} reason error
     * @returns {void}
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
            this.triggerError(new Error(__('error_network_fetch')));
            return;
        }

        clearTimeout(this.retryTimeout);
        this.retryTimeout = setTimeout(() => {
            this.load(this.file.id);
        }, RETRY_TIMEOUT * RETRY_COUNT);
    }

    /**
     * Triggers an error.
     *
     * @private
     * @param {Error} reason error
     * @returns {void}
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

        const reason = err instanceof Error ? err.message : __('error_default');
        const viewer = ErrorLoader.determineViewer();

        ErrorLoader.load(viewer, this.options.location).then(() => {
            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, Object.assign({}, this.options, {
                file: this.file
            }));

            this.viewer.load('', reason);
            hideLoadingIndicator();

            // Add listeners for viewer events
            this.attachViewerListeners();

            // Show the download button
            if (checkPermission(this.file, PERMISSION_DOWNLOAD) && this.options.showDownload) {
                showDownloadButton(this.download);
            }

            // Bump up preview count
            this.count.error += 1;

            this.emit('load', {
                error: reason,
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
     * @private
     * @param {string} [token] auth token
     * @returns {Object} Headers
     */
    getRequestHeaders(token) {
        const hints = Browser.canPlayDash() ? '|dash|filmstrip|mp4' : '|mp4';
        const headers = {
            'X-Rep-Hints': `3d|pdf|png?dimensions=2048x2048|jpg?dimensions=2048x2048|mp3${hints}`
        };
        return getHeaders(headers, token || this.options.token, this.options.sharedLink, this.options.sharedLinkPassword);
    }

    /**
     * Prefetches a file and preview assets
     *
     * @private
     * @returns {void}
     */
    prefetch() {
        // Don't bother prefetching when there aren't more files
        if (this.collection.length < 2) {
            return;
        }

        const currentIndex = this.collection.indexOf(this.file.id);
        const filesToPrefetch = this.collection.slice(currentIndex + 1, currentIndex + PREFETCH_COUNT + 1);

        // Don't bother prefetching when there aren't more files
        if (filesToPrefetch.length === 0) {
            return;
        }

        // Get auth tokens for all files we should be prefetching
        getTokens(filesToPrefetch, this.previewOptions.token)
        .then((tokens) => {
            filesToPrefetch.forEach((id) => {
                const token = tokens[id];
                const cached = cache.get(id);

                if (cached && cached.representations) {
                    return;
                }

                // Pre-fetch the file information
                get(getURL(id, this.options.api), this.getRequestHeaders(token))
                .then((file) => {
                    // Save the returned file
                    cache.set(file.id, file);

                    // Pre-fetch content if applicable so that the
                    // Browser caches the content
                    const loader = this.getLoader(file);
                    if (loader && typeof loader.prefetch === 'function') {
                        loader.prefetch(file, token, this.location, this.options.sharedLink, this.options.sharedLinkPassword);
                    }
                })
                .catch(() => {});
            });
        })
        .catch(() => {});
    }

    /**
     * Mouse move handler for navigation
     *
     * @private
     * @returns {Function} throttled mousemove handler
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
     * Shows the preview at an index
     *
     * @private
     * @param {number} index index of preview
     * @returns {void}
     */
    navigateToIndex(index) {
        const file = this.collection[index];
        this.emit('navigate', file);
        this.count.navigation += 1;
        this.load(file);
    }

    /**
     * Shows the prior preview
     *
     * @private
     * @returns {void}
     */
    navigateLeft() {
        const currentIndex = this.collection.indexOf(this.file.id);
        const newIndex = currentIndex === 0 ? 0 : currentIndex - 1;
        if (newIndex !== currentIndex) {
            this.navigateToIndex(newIndex);
        }
    }

    /**
     * Shows the next preview
     *
     * @private
     * @returns {void}
     */
    navigateRight() {
        const currentIndex = this.collection.indexOf(this.file.id);
        const newIndex = currentIndex === this.collection.length - 1 ? this.collection.length - 1 : currentIndex + 1;
        if (newIndex !== currentIndex) {
            this.navigateToIndex(newIndex);
        }
    }

    /**
     * Determines a preview loader
     *
     * @private
     * @param {Object} file File to preview
     * @returns {Object} Loader
     */
    getLoader(file) {
        return this.loaders.find((loader) => loader.canLoad(file, Object.keys(this.disabledViewers)));
    }

    /**
     * Destroys the preview
     *
     * @private
     * @returns {void}
     */
    destroy() {
        if (this.viewer && typeof this.viewer.destroy === 'function') {
            this.viewer.destroy();
        }

        this.viewer = undefined;
    }

    /**
     * Keydown handler
     *
     * @TODO fix multiple preview key issue
     * @TODO fire key event
     *
     * @private
     * @param {Event} event keydown event
     * @returns {void}
     */
    keydownHandler(event) {
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


    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Primary function to show a preview.
     *
     * @public
     * @param {string|Object} file box file object or id
     * @param {Object} options options
     * @returns {void}
     */
    show(file, options) {
        // Save a reference to the options to be used later
        this.previewOptions = Object.assign({}, options);

        // load the preview
        this.load(file);
    }

    /**
     * Destroys and hides the preview
     *
     * @public
     * @returns {void}
     */
    hide() {
        // Indicate preview is closed
        this.open = false;

        // Destroy the viewer
        this.destroy();

        // Clean the UI
        cleanup();

        // Nuke the file
        this.file = undefined;
    }

    /**
     * Updates files to navigate between
     *
     * @public
     * @param {Array} [collection] Updated collection of file IDs
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
     * Returns the current viewer
     *
     * @public
     * @returns {Object|undefined} current viewer
     */
    getCurrentViewer() {
        return this.viewer;
    }

    /**
     * Returns the current file being previewed
     *
     * @public
     * @returns {Object|null} current viewer
     */
    getCurrentFile() {
        return this.file;
    }

    /**
     * Returns the current file being previewed
     *
     * @public
     * @returns {Object|null} current viewer
     */
    getCurrentCollection() {
        return this.collection;
    }

    /**
     * Returns a list of viewers
     *
     * @public
     * @returns {Array} list of supported viewers
     */
    getViewers() {
        let viewers = [];
        this.loaders.forEach((loader) => {
            viewers = viewers.concat(loader.getViewers());
        });
        return viewers;
    }

    /**
     * Prefetches the viewers
     *
     * @public
     * @returns {void}
     */
    prefetchViewers() {
        const viewers = this.getViewers();
        const loader = this.loaders[0]; // use any loader
        viewers.forEach((viewer) => {
            loader.prefetchAssets(viewer, this.location);
        });
    }

    /**
     * Disables one or more viewers
     *
     * @public
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
     * Enables one or more viewers
     *
     * @public
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
     * Resizes the preview
     *
     * @public
     * @returns {void}
     */
    resize() {
        if (this.viewer && typeof this.viewer.resize === 'function') {
            this.viewer.resize();
        }
    }

    /**
     * Prints
     *
     * @public
     * @returns {void}
     */
    print() {
        if (checkPermission(this.file, PERMISSION_DOWNLOAD) && checkFeature(this.viewer, 'print')) {
            this.viewer.print();
        }
    }

    /**
     * Downloads
     *
     * @public
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

    /**
     * Caches the provided file metadata. Can be used to improve performance if
     * file metadata can be fetched at some point before a file is previewed.
     * Note that we do not validate the cache, the file metadata objects must
     * have the properties FIELDS as defined in file.js.
     *
     * @public
     * @param {Array} [files] Array of file metadata to cache
     * @returns {void}
     */
    cacheFiles(files = []) {
        files.forEach((file) => {
            cache.set(file.id, file);
        });
    }
}

// Create a singleton instance for preview.
Box.Preview = new Preview();
global.Box = Box;
global.Preview = Preview;
export default Box.Preview;
