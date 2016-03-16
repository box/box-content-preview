import './preview.scss';
import './polyfill';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fetch from 'isomorphic-fetch';
import Browser from './browser';
import Logger from './logger';
import loaders from './loaders';
import cache from './cache';
import RepStatus from './rep-status';
import ErrorLoader from './error/error-loader';
import { decodeKeydown, insertTemplate, openUrlInsideIframe } from './util';
import throttle from 'lodash.throttle';
import shellTemplate from 'raw!./shell.html';

import {
    CLASS_NAVIGATION_VISIBILITY,
    CLASS_HIDDEN,
    CLASS_PREVIEW_LOADED,
    CLASS_BOX_PREVIEW_HEADER,
    SELECTOR_BOX_PREVIEW_CONTAINER,
    SELECTOR_BOX_PREVIEW,
    SELECTOR_NAVIGATION_LEFT,
    SELECTOR_NAVIGATION_RIGHT,
    SELECTOR_BOX_PREVIEW_BTN_PRINT,
    SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD,
    COLOR_HEADER_LIGHT,
    COLOR_HEADER_DARK,
    COLOR_HEADER_BTN_LIGHT,
    COLOR_HEADER_BTN_DARK
} from './constants';

const PREFETCH_COUNT = 3;
const MOUSEMOVE_THROTTLE = 1500;
const RETRY_TIMEOUT = 500;
const RETRY_COUNT = 5;
const PERMISSIONS_ERROR = 'Missing permissions to preview';
const API = 'https://api.box.com';
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

        // Determine the location of preview.js since all
        // other files are relative to it.
        this.determinePreviewLocation();

        // Call preload of loaders
        this.preloadLoaders();

        // Throttled mousemove for navigation visibility
        this.throttledMousemoveHandler = throttle(() => {
            clearTimeout(this.timeoutHandler);
            if (this.container) {
                this.container.classList.add(CLASS_NAVIGATION_VISIBILITY);
            }
            this.timeoutHandler = setTimeout(() => {
                if (this.container) {
                    this.container.classList.remove(CLASS_NAVIGATION_VISIBILITY);
                }
            }, MOUSEMOVE_THROTTLE);
        }, MOUSEMOVE_THROTTLE - 500, true);
    }

    /**
     * All preview assets are relative to preview.js. Here we create a location
     * object that mimics the window location object and points to where
     * preview.js is loaded from, by the browser.
     * @returns {void}
     */
    determinePreviewLocation() {
        const scriptSrc = document.querySelector('script[src*="preview.js"]').src;

        if (!scriptSrc) {
            throw new Error('Missing or malformed preview library inclusion');
        }

        const anchor = document.createElement('a');
        anchor.href = scriptSrc;

        const pathname = anchor.pathname;
        const pathFragments = pathname.split('/');
        const fragmentLength = pathFragments.length;
        const fileName = pathFragments[fragmentLength - 1];
        const locale = pathFragments[fragmentLength - 2];
        const version = pathFragments[fragmentLength - 3];
        const baseURI = anchor.href.replace(fileName, '');
        const staticBaseURI = baseURI.replace(`${locale}/`, '');

        this.location = {
            origin: anchor.origin,
            host: anchor.host,
            hostname: anchor.hostname,
            search: anchor.search,
            protocol: anchor.protocol,
            port: anchor.port,
            href: anchor.href,
            pathname,
            locale,
            version,
            baseURI,
            staticBaseURI
        };
    }

    /**
     * Returns the box file content api url
     *
     * @private
     * @param {String} id box file id
     * @returns {String} API url
     */
    createUrl(id) {
        return `${this.options.api}/2.0/files/${id}?fields=permissions,parent,shared_link,sha1,file_version,name,size,extension,representations`;
    }

    /**
     * Parses the preview options
     *
     * @private
     * @param {Object} token auth token map
     * @returns {void}
     */
    parseOptions(token) {
        // Grab the options from saved preview options
        const options = Object.assign({}, this.previewOptions);

        // Reset all options
        this.options = {};

        // Authorization header with tokens
        this.options.token = token[this.file.id];

        // Save handle to the token fetcher as viewers might need it
        this.options.tokenFetcher = this.fetchTokens;

        // Authorization header with tokens
        this.options.authorization = `Bearer ${this.options.token}`;

        // Save the location of preview for viewers
        this.options.location = Object.assign({}, this.location);

        // Save the reference to the api endpoint
        this.options.api = options.api ? options.api.replace(/\/$/, '') : API;

        // Show or hide the header
        this.options.header = options.header || 'light';

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
     * Grab the token from the saved preview options to parse it.
     * The token can either be a simple string or a function that returns
     * a promise which resolves to a key value map where key is the file
     * id and value is the token. The function accepts either a simple id
     * or an array of file ids
     *
     * @private
     * @param {String|Array} [id] box file ids
     * @returns {void}
     */
    fetchTokens(id) {
        // By defaut we fetch the current file id token
        let ids = [this.file.id];

        // If instead id(s) were passed in, we fetch those
        // This will be the use case for prefetch and viewers
        // Normalize to an array so that we always deal with ids
        if (id && Array.isArray(id)) {
            ids = id;
        } else if (id) {
            ids = [id];
        }

        // Grab the auth token or token generator
        const token = this.previewOptions.token;

        // Create an error to throw if needed
        const error = new Error('Missing Auth Token!');

        // Auth token should be available
        if (!token) {
            throw error;
        }

        // Helper function to create token map used below
        const tokenMapCreator = (authToken) => {
            const tokenMap = {};
            ids.forEach((fileId) => {
                tokenMap[fileId] = authToken; // all files use the same token
            });
            return tokenMap;
        };

        return new Promise((resolve) => {
            if (typeof token === 'function') {
                // Token may be a function that returns a promise
                token(ids).then((tokens) => {
                    // Resolved tokens can either be a map of { id: token }
                    // or it can just be a single string token that applies
                    // to all the files irrespective of the id.
                    if (typeof tokens === 'string') {
                        // String token which is the same for all files
                        resolve(tokenMapCreator(tokens));
                    } else {
                        // Iterate over all the requested file ids
                        // and make sure we got them back otherwise
                        // throw and error about missing tokens
                        ids.forEach((fileId) => {
                            if (!tokens[fileId]) {
                                throw error;
                            }
                        });
                        resolve(tokens);
                    }
                });
            } else {
                // Token may just be a string, create a map
                // from id to token to normalize. In this case
                // the value is going to be the same for all files
                resolve(tokenMapCreator(token));
            }
        });
    }

    /**
     * Caches the preview header template with theme
     *
     * @private
     * @returns {void}
     */
    setupTheme() {
        if (this.shellTemplate) {
            return;
        }

        // Theme the header
        if (this.options.header === 'dark') {
            this.shellTemplate = shellTemplate.replace(/\{COLOR_HEADER\}/g, COLOR_HEADER_DARK).replace(/\{COLOR_HEADER_BTN\}/g, COLOR_HEADER_BTN_LIGHT);
        } else {
            this.shellTemplate = shellTemplate.replace(/\{COLOR_HEADER\}/g, COLOR_HEADER_LIGHT).replace(/\{COLOR_HEADER_BTN\}/g, COLOR_HEADER_BTN_DARK);
        }
    }

    /**
     * Initializes the container for preview.
     *
     * @private
     * @returns {void}
     */
    setup() {
        // box-preview-container's parent
        let container = this.previewOptions.container;

        if (typeof container === 'string') {
            // Get the container dom element if a selector was passed instead.
            container = document.querySelector(container);
        } else if (!container) {
            // Create the container if nothing was passed.
            container = document.body;
        }

        // Clear the content
        container.innerHTML = '';

        // Theme the shell
        this.setupTheme();

        // Create the preview with absolute positioning inside a relative positioned container
        // <box-preview-container>
        //      <box-preview-header>
        //      <box-preview>
        //      <navigation>
        // </box-preview-container>
        insertTemplate(container, this.shellTemplate);

        // Save a handle to the container for future references.
        this.container = container.querySelector(SELECTOR_BOX_PREVIEW_CONTAINER);

        // Save a handle to the preview content
        this.contentContainer = this.container.querySelector(SELECTOR_BOX_PREVIEW);

        // Add the header if needed
        if (this.options.header !== 'none') {
            this.container.firstElementChild.className = CLASS_BOX_PREVIEW_HEADER;
        }

        // Show navigation if needed
        this.showNavigation();

        // Attach keyboard events
        document.addEventListener('keydown', this.keydownHandler);
    }

    /**
     * Loads the preview for a file.
     *
     * @param {String|Object} file File to preview
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
            this.retryCount++;
        } else {
            this.retryCount = 0;
        }

        // Fetch tokens before doing anything
        this.fetchTokens()
        .then(this.fetchTokensResponse)
        .catch(this.triggerFetchError);
    }

    /**
     * Loads the preview for a file.
     *
     * @param {String|Object} file File to preview
     * @private
     * @returns {void}
     */
    fetchTokensResponse(tokens) {
        // Parse the preview options
        this.parseOptions(tokens);

        // Setup the UI before anything else.
        this.setup();

        // Cache the file
        cache.set(this.file.id, this.file);

        // Normalize files array by putting current file inside it
        // if it was is empty. If its not empty, then it is assumed
        // that current file is already inside files array.
        if (this.collection.length === 0) {
            this.collection = [this.file];
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

        // Refresh from server too
        this.loadFromServer();
    }

    /**
     * Loads a preview from the server.
     *
     * @private
     * @param {String} id File id to preview
     * @returns {void}
     */
    loadFromServer() {
        fetch(this.createUrl(this.file.id), {
            headers: this.getRequestHeaders()
        })
        .then((response) => response.json())
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

        // Try catch here to catch any viewer errors
        // The caller function tries to catch all network specific errors
        try {
            if (file.type !== 'file') {
                throw new Error('Not a Box File');
            }

            // Save reference to the file and update logger
            this.file = file;
            this.logger.setFile(file);

            // Get exiting cache before updating it to latest version
            const cached = cache.get(file.id);

            // Cache the new file object
            cache.set(file.id, file);

            // Finally load the viewer if file sha mismatches
            // @TODO add watermark check also here
            if (!cached || !cached.file_version || cached.file_version.sha1 !== file.file_version.sha1) {
                this.logger.setCacheStale();
                this.loadViewer();
            }
        } catch (err) {
            this.triggerError(err);
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

        if (this.container && this.contentContainer) {
            this.contentContainer.classList.remove(CLASS_PREVIEW_LOADED);
        }

        // Check if preview permissions exist
        if (!this.file.permissions.can_preview) {
            throw new Error(PERMISSIONS_ERROR);
        }

        // Determine the asset loader to use
        const loader = this.getLoader(this.file);

        // Log the type of file
        this.logger.setType(loader.getType());

        // Determine the viewer to use
        const viewer = loader.determineViewer(this.file);

        // Determine the representation to use
        const representation = loader.determineRepresentation(this.file, viewer);

        // Load the representation assets
        const promiseToGetRepresentationStatusSuccess = loader.determineRepresentationStatus(new RepStatus(representation, this.getRequestHeaders(), this.logger, viewer.REQUIRED_REPRESENTATIONS));

        // Load all the static assets
        const promiseToLoadStaticAssets = loader.load(viewer, this.options.location);

        // Proceed only when both static and representation assets have been loaded
        Promise.all([promiseToLoadStaticAssets, promiseToGetRepresentationStatusSuccess]).then(() => {
            // Instantiate the viewer
            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, Object.assign({}, this.options, {
                file: this.file
            }));

            // Add listeners for viewer load / error event
            this.attachViewerListeners();

            // Load the representation into the viewer
            this.viewer.load(representation.links.content.url);
        }).catch(this.triggerError);
    }

    /**
     * Loads a viewer.
     *
     * @private
     * @returns {Promise} Promise to load a viewer
     */
    attachViewerListeners() {
        // Add listeners for viewer load / error event
        this.viewer.addListener('error', this.triggerError);

        // Reload event is fired when entire preview needs to be reloaded
        this.viewer.addListener('reload', () => {
            this.show(this.file.id, this.previewOptions);
        });

        // Load event is fired when preview loads
        this.viewer.addListener('load', () => {
            // Show or hide print/download button
            this.showPrintButton();
            this.showDownloadButton();

            // Once the viewer loads, hide the loading indicator
            if (this.contentContainer) {
                this.contentContainer.classList.add(CLASS_PREVIEW_LOADED);
            }

            // Bump up preview count
            this.count.success++;

            // Finally emit the viewer instance back with a load event
            this.emit('load', {
                viewer: this.viewer,
                metrics: this.logger.done(this.count),
                file: this.file
            });

            // Prefetch other files
            this.prefetch();
        });
    }

    /**
     * Triggers an error due to fetch.
     *
     * @private
     * @param {String|null|undefined|Error} reason error
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
            this.triggerError('Failed to fetch file data due to network error');
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

        const reason = (err ? err.message : err) || 'This file is either not previewable or not supported';
        const viewer = ErrorLoader.determineViewer();

        ErrorLoader.load(viewer, this.options.location).then(() => {
            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, this.options);
            this.viewer.load('', reason);
            this.contentContainer.classList.add(CLASS_PREVIEW_LOADED);

            // Bump up preview count
            this.count.error++;

            this.emit('load', {
                error: reason,
                metrics: this.logger.done(this.count),
                file: this.file
            });
        });
    }

    /**
     * Builds a list of required XHR headers.
     *
     * @private
     * @param {String} [token] auth token
     * @returns {Object} Headers
     */
    getRequestHeaders(token) {
        const authToken = token || this.options.token;
        const hints = Browser.canPlayDash() ? '|dash|filmstrip|mp4' : '|mp4';
        const headers = {
            Authorization: `Bearer ${authToken}`,
            'X-Rep-Hints': `3d|pdf|png?dimensions=2048x2048|jpg?dimensions=2048x2048|mp3${hints}`
        };

        if (this.options.sharedLink) {
            headers.BoxApi = `shared_link=${this.options.sharedLink}`;
        }

        return headers;
    }

    /**
     * Shows the print button if the viewers implement print
     *
     * @private
     * @returns {void}
     */
    showPrintButton() {
        if (this.viewer && typeof this.viewer.print === 'function') {
            this.printButton = this.container.querySelector(SELECTOR_BOX_PREVIEW_BTN_PRINT);
            this.printButton.classList.remove(CLASS_HIDDEN);
            this.printButton.addEventListener('click', this.print);
        }
    }

    /**
     * Shows the print button if the viewers implement print
     *
     * @private
     * @returns {void}
     */
    showDownloadButton() {
        if (this.file && this.file.permissions.can_download) {
            this.downloadButton = this.container.querySelector(SELECTOR_BOX_PREVIEW_BTN_DOWNLOAD);
            this.downloadButton.classList.remove(CLASS_HIDDEN);
            this.downloadButton.addEventListener('click', this.download);
        }
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
        this.fetchTokens(filesToPrefetch)
        .then((tokens) => {
            // Some files may already be prefetched, filter them out
            const filesNeedingPrefetch = filesToPrefetch.filter((id) => {
                const cached = cache.get(id);
                return !cached || !cached.representations; // @TODO need better check
            });

            // Iterate over all the files needed prefetch
            filesNeedingPrefetch.forEach((id) => {
                // Cache an empty file object to prevent further prefetches
                cache.set(id, {
                    id,
                    representations: {}
                });

                // Pre-fetch the file information
                fetch(this.createUrl(id), {
                    headers: this.getRequestHeaders(tokens[id])
                })
                .then((response) => response.json())
                .then(this.handlePrefetchResponse)
                .catch(() => {});
            });
        })
        .catch(() => {});
    }

    /**
     * Prefetches a file and preview assets
     *
     * @private
     * @param {Object} file box file
     * @returns {void}
     */
    handlePrefetchResponse(file) {
        // Don't bother with non-files
        if (file.type === 'file') {
            // Save the returned file
            cache.set(file.id, file);

            // Pre-fetch content if applicable so that the
            // Browser caches the content
            const loader = this.getLoader(file);
            if (loader && typeof loader.prefetch === 'function') {
                loader.prefetch(file, this.options);
            }
        }
    }

    /**
     * Shows navigation arrows if there is a need
     *
     * @private
     * @returns {void}
     */
    showNavigation() {
        // Before showing or updating navigation do some cleanup
        // that may be needed if the collection changes

        const leftNavigation = this.container.querySelector(SELECTOR_NAVIGATION_LEFT);
        const rightNavigation = this.container.querySelector(SELECTOR_NAVIGATION_RIGHT);

        // Hide the arrows by default
        leftNavigation.classList.add(CLASS_HIDDEN);
        rightNavigation.classList.add(CLASS_HIDDEN);

        leftNavigation.removeEventListener('click', this.navigateLeft);
        rightNavigation.removeEventListener('click', this.navigateRight);
        this.contentContainer.removeEventListener('mousemove', this.throttledMousemoveHandler);

        // Don't show navigation when there is no need
        if (this.collection.length < 2) {
            return;
        }

        leftNavigation.addEventListener('click', this.navigateLeft);
        rightNavigation.addEventListener('click', this.navigateRight);
        this.contentContainer.addEventListener('mousemove', this.throttledMousemoveHandler);

        // Selectively show or hide the navigation arrows
        const index = this.collection.indexOf(this.file.id);

        if (index > 0) {
            leftNavigation.classList.remove(CLASS_HIDDEN);
        }

        if (index < this.collection.length - 1) {
            rightNavigation.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Shows the preview at an index
     *
     * @private
     * @param {Number} index index of preview
     * @returns {void}
     */
    navigateToIndex(index) {
        const file = this.collection[index];
        this.emit('navigate', file);
        this.count.navigation++;
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
     * Initializes the loaders which may have
     * an optional init method.
     *
     * @private
     * @returns {void}
     */
    preloadLoaders() {
        this.loaders.forEach((loader) => {
            if (loader.enabled && typeof loader.preload === 'function') {
                loader.preload(this.options);
            }
        });
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
     * @param {String|Object} file box file object or id
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

        if (this.contentContainer) {
            this.contentContainer.removeEventListener('mousemove', this.throttledMousemoveHandler);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        // Nuke the file
        this.file = undefined;

        // Remove keyboard events
        document.removeEventListener('keydown', this.keydownHandler);
    }

    /**
     * Updates files to navigate between
     *
     * @public
     * @returns {void}
     */
    updateCollection(collection = []) {
        this.collection = Array.isArray(collection) ? collection : [];
        this.showNavigation();
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
     * Disables a viewer
     *
     * @public
     * @param {String|Array} viewers destroys the container contents
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
     * Disables a viewer
     *
     * @public
     * @param {String|Array} viewers destroys the container contents
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
     * Prints
     *
     * @public
     * @returns {void}
     */
    print() {
        if (this.viewer && typeof this.viewer.print === 'function') {
            this.viewer.print();
        } else {
            throw new Error('Unsupported operation!');
        }
    }

    /**
     * Downloads
     *
     * @public
     * @returns {void}
     */
    download() {
        if (this.file && this.file.permissions && this.file.permissions.can_download) {
            fetch(`${this.options.api}/2.0/files/${this.file.id}?fields=download_url`, {
                headers: this.getRequestHeaders()
            })
            .then((response) => response.json())
            .then((data) => {
                openUrlInsideIframe(data.download_url);
            });
        } else {
            throw new Error('Unsupported operation!');
        }
    }
}

// Create a singleton instance for preview.
Box.Preview = new Preview();
global.Box = Box;
global.Preview = Preview;
export default Box.Preview;
