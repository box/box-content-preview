import './preview.scss';
import './polyfill';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fetch from 'isomorphic-fetch';
import Browser from './browser';
import Logger from './logger';
import loaders from './loaders';
import cache from './cache';
import ErrorLoader from './error/error-loader';
import RepStatus from './rep-status';
import { decodeKeydown, insertTemplate } from './util';
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
    COLOR_HEADER_LIGHT,
    COLOR_HEADER_DARK,
    COLOR_HEADER_BTN_LIGHT,
    COLOR_HEADER_BTN_DARK
} from './constants';

const PREFETCH_COUNT = 3;
const MOUSEMOVE_THROTTLE = 1500;
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

        // Current file being previewed
        this.file = {};

        // Options
        this.options = {};

        // Disabled viewers
        this.disabledViewers = {};

        // Auth token
        this.token = '';

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
     * @param {String} id box file id
     * @private
     * @returns {String} API url
     */
    createUrl(id) {
        return `${this.options.api}/2.0/files/${id}?fields=permissions,parent,shared_link,sha1,file_version,name,size,extension,representations`;
    }

    /**
     * Parses the preview options
     *
     * @private
     * @returns {void}
     */
    parseOptions() {
        // Grab the options from saved preview options
        const options = this.previewOptions;

        // Auth token should be available
        if (!options.token) {
            throw new Error('Missing Auth Token!');
        }

        // Reset all options
        this.options = {};

        // Save the location of preview for viewers
        this.options.location = Object.assign({}, this.location);

        // Save the reference to the api endpoint
        this.options.api = options.api ? options.api.replace(/\/$/, '') : API;

        // Save the reference to the auth token
        this.options.token = this.token || options.token;

        // Show or hide the header
        this.options.header = options.header || 'light';

        // Save the files to iterate through
        this.files = options.files || [];

        // Save the reference to any additional custom options for viewers
        this.options.viewers = options.viewers || {};

        // Iterate over all the viewer options and disable any viewer
        // that has an option disabled set to true
        this.disableViewers(Object.keys(this.options.viewers).filter((viewer) => !!this.options.viewers[viewer].disabled));
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

        // If we are showing navigation, create arrows and attach
        // mouse move handler to show or hide them.
        if (this.files.length > 1) {
            this.showNavigation();
        }

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
        // Parse the preview options
        this.parseOptions();

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

        // Cache the file
        cache.set(this.file.id, this.file);

        // Normalize files array by putting current file inside it
        // if it was is empty. If its not empty, then it is assumed
        // that current file is already inside files array.
        if (this.files.length === 0) {
            this.files = [this.file];
        }

        // Setup the UI before anything else.
        this.setup();

        if (this.file.representations) { // @TODO we need a better check to validate file object
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
     * @param {Boolean} [checkStaleness] Check for cache staleness
     * @returns {void}
     */
    loadFromCache(checkStaleness = true) {
        // Add details to the logger
        this.logger.setFile(this.file);
        this.logger.setCached();

        // Even though we are showing a file from cache, still make
        // a server request to check if something changed aka check
        // for cache being stale.
        if (checkStaleness) {
            fetch(this.createUrl(this.file.id), {
                headers: this.getRequestHeaders()
            })
            .then((response) => response.json())
            .then((file) => {
                this.file = file;
                cache.set(file.id, file);
                // @TODO Reload the preview
            }).catch(this.triggerError);
        }

        // Finally load the viewer
        this.loadViewer();
    }

    /**
     * Loads a preview from the server.
     *
     * @param {String} id File id to preview
     * @private
     * @returns {void}
     */
    loadFromServer() {
        fetch(this.createUrl(this.file.id), {
            headers: this.getRequestHeaders()
        })
        .then((response) => response.json())
        .then((file) => {
            if (file.type === 'file') {
                // Save reference to the file and update logger
                this.file = file;
                this.logger.setFile(file);

                // Cache the new file object
                cache.set(file.id, file);

                // Finally load the viewer
                this.loadViewer();
            } else {
                throw new Error(file.message);
            }
        }).catch(this.triggerError);
    }

    /**
     * Loads a viewer.
     *
     * @private
     * @returns {void}
     */
    loadViewer() {
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

        // Load all the static assets
        const promiseToLoadAssets = loader.load(viewer, this.options.location);

        // Status checker
        const repStatus = new RepStatus(this.logger, viewer.REQUIRED_REPRESENTATIONS);

        // Load the representation assets
        const promiseToGetRepresentationStatusSuccess = repStatus.status(representation, this.getRequestHeaders());

        // Proceed only when both static and representation assets have been loaded
        Promise.all([promiseToLoadAssets, promiseToGetRepresentationStatusSuccess]).then(() => {
            // Save reference to file to give to the viewer
            this.options.file = this.file;

            // Instantiate the viewer
            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, this.options);

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
        this.viewer.addListener('reload', this.loadViewer);
        this.viewer.addListener('load', () => {
            // Once the viewer loads, hide the loading indicator
            if (this.contentContainer) {
                this.contentContainer.classList.add(CLASS_PREVIEW_LOADED);
            }

            // Finally emit the viewer instance back with a load event
            this.emit('load', {
                viewer: this.viewer,
                metrics: this.logger.done(),
                file: this.file
            });

            // Prefetch other files
            this.prefetch();
        });
    }

    /**
     * Triggers an error.
     *
     * @private
     * @param {String|null|undefined|Error} reason error
     * @returns {void}
     */
    triggerError(err) {
        // Nuke the cache
        cache.unset(this.file.id);

        let reason;

        // Use a default reason if none was passed in
        if (err instanceof Error) {
            reason = err.message;
        }
        reason = reason || 'An error has occurred while loading the preview';

        const viewer = ErrorLoader.determineViewer();
        ErrorLoader.load(viewer, this.options.location).then(() => {
            // Destroy anything still showing
            this.destroy();

            // Emit error
            this.emit('preview-error', reason);

            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, this.options);
            this.viewer.load('', reason);
            this.contentContainer.classList.add(CLASS_PREVIEW_LOADED);
        });
    }

    /**
     * Builds a list of required XHR headers.
     *
     * @private
     * @returns {Object} Headers
     */
    getRequestHeaders() {
        const hints = Browser.canPlayDash() ? '|dash|filmstrip|mp4' : '|mp4';
        const headers = {
            Authorization: `Bearer ${this.options.token}`,
            'X-Rep-Hints': `3d|pdf|png?dimensions=2048x2048|jpg?dimensions=2048x2048|mp3${hints}`
        };

        if (this.options.sharedLink) {
            headers.BoxApi = `shared_link=${this.options.sharedLink}`;
        }

        return headers;
    }

    /**
     * Prefetches a file and preview assets
     *
     * @private
     * @returns {void}
     */
    prefetch() {
        // Don't bother prefetching when there aren't more files
        if (this.files.length < 2) {
            return;
        }

        const currentIndex = this.files.indexOf(this.file.id);
        let count = 0;

        // Starting with the next file, prefetch specific numbers of files.
        for (let i = currentIndex + 1; count < PREFETCH_COUNT && i < this.files.length; i++) {
            count++;

            let nextId = this.files[i];

            // Check if the list was an id or file object
            if (typeof nextId === 'object') {
                nextId = nextId.id;
            }

            // If no file id then exit
            if (!nextId) {
                return;
            }

            // If the file was already prefetched then try the next file
            const cached = cache.get(nextId);
            if (cached && cached.representations) { // @TODO need better check
                continue;
            }

            // Create an empty object to prevent further prefetches
            cache.set(nextId, {
                id: nextId,
                representations: {}
            });

            // Pre-fetch the file information
            fetch(this.createUrl(nextId), {
                headers: this.getRequestHeaders()
            })
            .then((response) => response.json())
            .then((file) => {
                // Don't bother with non-files
                if (file.type === 'file') {
                    // Save the returned file
                    cache.set(nextId, file);

                    // Pre-fetch content if applicable so that the
                    // Browser caches the content
                    const loader = this.getLoader(file);
                    if (loader && typeof loader.prefetch === 'function') {
                        loader.prefetch(file, this.options);
                    }
                }
            }).catch(() => {
                // no-op
            });
        }
    }

    /**
     * Shows navigation arrows
     *
     * @private
     * @returns {void}
     */
    showNavigation() {
        this.leftNavigation = this.container.querySelector(SELECTOR_NAVIGATION_LEFT);
        this.rightNavigation = this.container.querySelector(SELECTOR_NAVIGATION_RIGHT);
        this.leftNavigation.addEventListener('click', this.navigateLeft);
        this.rightNavigation.addEventListener('click', this.navigateRight);
        this.contentContainer.addEventListener('mousemove', this.throttledMousemoveHandler);

        const index = this.files.indexOf(this.file.id);

        if (index > 0) {
            this.leftNavigation.classList.remove(CLASS_HIDDEN);
        }

        if (index < this.files.length - 1) {
            this.rightNavigation.classList.remove(CLASS_HIDDEN);
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
        const file = this.files[index];
        this.emit('navigation', file);
        this.load(file);
    }

    /**
     * Shows the prior preview
     *
     * @private
     * @returns {void}
     */
    navigateLeft() {
        const currentIndex = this.files.indexOf(this.file.id);
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
        const currentIndex = this.files.indexOf(this.file.id);
        const newIndex = currentIndex === this.files.length - 1 ? this.files.length - 1 : currentIndex + 1;
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
        loaders.forEach((loader) => {
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
        return loaders.find((loader) => loader.canLoad(file, Object.keys(this.disabledViewers)));
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
     * Sets the authorization token that may have expired.
     *
     * @public
     * @param {String} token auth token
     * @returns {void}
     */
    updateAuthToken(token) {
        this.token = token;
    }

    /**
     * Primary function to show a preview.
     *
     * @public
     * @param {String|Object} file box file object or id
     * @param {Object} options options
     * @returns {void}
     */
    show(file, options) {
        // Init performance logging
        this.logger = new Logger(this.location.locale);

        // Save a reference to the options to be used later
        this.previewOptions = options;

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
        // Destroy the viewer
        this.destroy();

        if (this.contentContainer) {
            this.contentContainer.removeEventListener('mousemove', this.throttledMousemoveHandler);
        }

        if (this.container) {
            this.container.innerHTML = '';
        }

        // Remove keyboard events
        document.removeEventListener('keydown', this.keydownHandler);
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
     * Returns a list of viewers
     *
     * @public
     * @returns {Array} list of supported viewers
     */
    getViewers() {
        let viewers = [];
        loaders.forEach((loader) => {
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
}

// Create a singleton instance for preview.
Box.Preview = new Preview();
global.Box = Box;
global.Preview = Preview;
export default Box.Preview;
