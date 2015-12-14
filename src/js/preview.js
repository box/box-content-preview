'use strict';

import '../css/preview.css';
import autobind from 'autobind-decorator';
import throttle from 'lodash/function/throttle';
import fetch from 'isomorphic-fetch';
import Browser from './browser';
import loaders from './loaders';
import cache from './cache';

const PREFETCH_COUNT = 3;
const CLASS_NAVIGATION_VISIBILITY = 'box-preview-is-navigation-visible';
const CLASS_HIDDEN = 'box-preview-is-hidden';
const CLASS_PREVIEW_LOADED = 'box-preview-loaded';
const MOUSEMOVE_THROTTLE = 1500;
const CRAWLER = '<div class="box-preview-crawler-wrapper"><div class="box-preview-crawler"><div></div><div></div><div></div></div></div>';

let Box = global.Box || {};

@autobind
class Preview {

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     * @returns {Preview} Returns a preview
     */
    constructor() {
        // Current file being previewed
        this.file = {};

        // Options
        this.options = {};

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
                    this.container.classList.add(CLASS_NAVIGATION_VISIBILITY);
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
        let scriptSrc = document.querySelector('script[src*="preview.js"]').src;
        let anchor = document.createElement('a');

        anchor.href = scriptSrc;
        this.options.location = {
            origin: anchor.origin,
            host: anchor.host,
            hostname: anchor.hostname,
            pathname: anchor.pathname,
            search: anchor.search,
            protocol: anchor.protocol,
            port: anchor.port,
            href: anchor.href,
            hrefTemplate: anchor.href.replace('preview.js', '{{asset_name}}'),
            baseURI: (anchor.origin + anchor.pathname).replace('preview.js', ''),
            staticBaseURI: (anchor.origin + anchor.pathname).replace('preview.js', 'static/')
        };

        anchor = undefined;
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
            if (typeof loader.preload === 'function') {
                loader.preload(this.options);
            }
        });
    }

    /**
     * Returns the box file content api url
     *
     * @param {String} id box file id
     * @private
     * @returns {String} API url
     */
    createUrl(id) {
        return this.options.api + '/2.0/files/' + id + '?fields=permissions,parent,shared_link,sha1,file_version,name,size,extension,download_url,representations';
    }

    /**
     * Initializes the container for preview.
     *
     * @param {String|HTMLElement} container where to load the preview
     * @param {Boolean} hasNavigation If we allow navigation.
     * @private
     * @returns {void}
     */
    setup(container, hasNavigation = false) {

        if (typeof container === 'string') {
            // Get the container dom element if a selector was passed instead.
            container = document.querySelector(container);
        } else if (!container) {
            // Create the container if nothing was passed.
            container = document.body.appendChild(document.createElement('div'));
            container.className = 'box-preview-container';
        }

        // Save a handle to the container for future references.
        this.container = container;

        // Prepare the container by adding our viewer wrapper.
        this.container.innerHTML = '<div class="box-preview"></div>' + CRAWLER;

        // Position the container as absolute so that the children
        // can be positioned absolute, this includes the viewer wrapper
        // as well as the left and right navigation arrows.
        this.container.style.position = 'absolute';
        this.container.style.display = 'block';

        // If we are showing navigation, create arrows and attach
        // mouse move handler to show or hide them.
        if (hasNavigation) {
            this.showNavigation();
            this.container.addEventListener('mousemove', this.throttledMousemoveHandler);
        }
    }

    /**
     * Loads the preview for a file.
     *
     * @param {String} id File to preview
     * @private
     * @returns {Promise} Promise to load a preview
     */
    load(id) {

        let promise;

        // Nuke everything in the box-preview wrapper to prepare for this preview.
        this.container.firstElementChild.innerHTML = '';

        // Check the cache before making a network request.
        let cached = cache.get(id);

        if (cached && cached.id === id && cached.representations) {
            // Cache hit, use that.
            promise = this.loadFromCache(cached);
        } else {
            // Cache miss, fetch from the server.
            promise = this.loadFromServer(id);
        }

        if (this.files.length > 1) {
            promise.then(() => this.prefetch());
        }

        return promise;
    }

    /**
     * Loads a preview from cache.
     *
     * @param {Object} file File to preview
     * @param {Boolean} [checkStaleness] Check for cache staleness
     * @private
     * @returns {Promise} Promise to load a preview from cache
     */
    loadFromCache(file, checkStaleness = true) {
        this.file = file;

        // Even though we are showing a file from cache, still make
        // a server request to check if something changed aka check
        // for cache being stale.
        if (checkStaleness) {
            fetch(this.createUrl(file.id), {
                headers: this.getRequestHeaders()
            })
            .then((response) => response.json())
            .then((file) => {
                cache.set(file.id, file);
                // Reload the preview
            });
        }

        return this.loadViewer();
    }

    /**
     * Loads a preview from the server.
     *
     * @param {String} id File id to preview
     * @private
     * @returns {Promise} Promise to load a preview from server
     */
    loadFromServer(id) {
        return fetch(this.createUrl(id), {
            headers: this.getRequestHeaders()
        })
        .then((response) => response.json())
        .then((file) => {
            if (file.type === 'file') {
                cache.set(id, file);
                this.file = file;
                return this.loadViewer();
            } else {
                return Promise.reject(file.message);
            }
        }).catch((err) => {
            return Promise.reject(err);
        });
    }

    /**
     * Loads a viewer.
     *
     * @private
     * @returns {Promise} Promise to load a viewer
     */
    loadViewer() {

        // Before loading a new preview check if a prior preview was showing.
        // If it was showing make sure to destroy it to do any cleanup.
        this.destroy();

        // Create a deferred promise
        let promise = new Promise((resolve, reject) => {
            this.viewerSuccess = resolve;
            this.viewerError = reject;
        });

        // Determine the asset loader to use
        let loader = this.getLoader(this.file);

        // If the loader does not exist reject right away
        if (!loader) {
            return Promise.reject('Cannot determine loader!');
        }

        // Determine the viewer to use
        let viewer = loader.determineViewer(this.file);

        // Determine the representation to use
        let representation = loader.determineRepresentation(this.file, viewer);

        // Load all the static assets
        let promiseToLoadAssets = loader.load(viewer, this.options.location.hrefTemplate);

        // Load the representation assets
        let promiseToGetRepresentationStatusSuccess = loader.determineRepresentationStatus(representation, this.getRequestHeaders());

        // Proceed only when both static and representation assets have been loaded
        Promise.all([ promiseToLoadAssets, promiseToGetRepresentationStatusSuccess ]).then(() => {

            // Save reference to file to give to the viewer
            this.options.file = this.file;

            // Instantiate the viewer
            this.viewer = new Box.Preview[viewer.CONSTRUCTOR](this.container, this.options);

            // Add listeners for viewer load / error event
            this.viewer.addListener('error', this.triggerError);
            this.viewer.addListener('load', () => {

                // Once the viewer loads, hide the loading indicator
                if (this.container) {
                    this.container.firstElementChild.classList.add(CLASS_PREVIEW_LOADED);
                }

                // Finally resolve with the viewer instance back to the caller
                this.viewerSuccess(this.viewer);
            });

            // Load the representation into the viewer
            this.viewer.load(representation.links.content.url);

        }).catch(this.triggerError);

        return promise;
    }

    /**
     * Triggers error.
     *
     * @private
     * @param {String} reason error
     * @returns {void}
     */
    triggerError(reason) {
        this.destroy();
        this.viewerError(reason || 'Failed to load the viewer in the allotted time.');
    }

    /**
     * Builds a list of required XHR headers.
     *
     * @private
     * @returns {Object} Headers
     */
    getRequestHeaders() {
        let headers = {
            'Authorization': 'Bearer ' + this.options.token,
            'X-Rep-Hints': '3d|pdf|png?dimensions=2048x2048|jpg?dimensions=2048x2048|mp3' + (Browser.canPlayDash() ? '|dash|filmstrip|mp4' : '|mp4')
        };

        if (this.options.sharedLink) {
            headers.BoxApi = 'shared_link=' + this.options.sharedLink;
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

        let currentIndex = this.files.indexOf(this.file.id);
        let count = 0;

        // Starting with the next file, prefetch specific numbers of files.
        for (let i = currentIndex + 1; count < PREFETCH_COUNT && i < this.files.length; i++) {

            count++;

            let nextId = this.files[i];

            // If no file id left to prefetch then exit
            if (!nextId) {
                return;
            }

            // If the file was already prefetched then try the next file
            if (cache.has(nextId)) {
                continue;
            }

            // Create an empty object to prevent further prefetches
            cache.set(nextId, {});

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
                    let loader = this.getLoader(file);
                    if (loader && typeof loader.prefetch === 'function') {
                        loader.prefetch(file, this.options);
                    }
                }
            }).catch((err) => {
                // no-op
            });
        }
    }

    /**
     * Determines a preview loader
     *
     * @param {Object} file File to preview
     * @private
     * @returns {Object} Loader
     */
    getLoader(file) {
        return loaders.find((loader) => {
            return loader.canLoad(file);
        });
    }

    /**
     * Shows navigation arrows
     *
     * @private
     * @returns {void}
     */
    showNavigation() {
        let left = document.createElement('div');
        let leftSpan = document.createElement('span');
        left.className = 'box-preview-navigate box-preview-navigate-left box-preview-is-hidden';
        leftSpan.className = 'box-preview-left-arrow';
        left.appendChild(leftSpan);
        left.addEventListener('click', this.navigateLeft);

        let right = document.createElement('div');
        let rightSpan = document.createElement('span');
        right.className = 'box-preview-navigate box-preview-navigate-right box-preview-is-hidden';
        rightSpan.className = 'box-preview-right-arrow';
        right.appendChild(rightSpan);
        right.addEventListener('click', this.navigateRight);

        this.container.appendChild(left);
        this.container.appendChild(right);
        this.updateNavigation();
    }

    /**
     * Updates navigation arrows
     *
     * @private
     * @returns {void}
     */
    updateNavigation() {
        let currentIndex = this.files.indexOf(this.file.id);
        let left = document.querySelector('.box-preview-navigate-left');
        let right = document.querySelector('.box-preview-navigate-right');

        left.classList.add(CLASS_HIDDEN);
        right.classList.add(CLASS_HIDDEN);

        if (currentIndex > 0) {
            left.classList.remove(CLASS_HIDDEN);
        }

        if (currentIndex < this.files.length - 1) {
            right.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Shows the prior preview
     *
     * @private
     * @returns {void}
     */
    navigateLeft() {
        let currentIndex = this.files.indexOf(this.file.id);
        let newIndex = currentIndex === 0 ? 0 : currentIndex - 1;
        if (newIndex !== currentIndex) {
            this.load(this.files[newIndex]);
            this.updateNavigation();
        }
    }

    /**
     * Shows the next preview
     *
     * @private
     * @returns {void}
     */
    navigateRight() {
        let currentIndex = this.files.indexOf(this.file.id);
        let newIndex = currentIndex === this.files.length - 1 ? this.files.length - 1 : currentIndex + 1;
        if (newIndex !== currentIndex) {
            this.load(this.files[newIndex]);
            this.updateNavigation();
        }
    }

    /**
     * Parses the options
     * @param {String|Object} file box file object or id
     * @param {Object} options options
     * @returns {void}
     */
    parseOptions(file, options) {

        // API host should be available
        if (!options.api) {
            throw 'Missing API Host!';
        }

        // Auth token should be available
        if (!options.token) {
            throw 'Missing Auth Token!';
        }

        // Save the reference to the api endpoint
        this.options.api = options.api;

        // Save the reference to the auth token
        this.updateAuthToken(options.token);

        // Save the reference to any additional custom options
        this.options.viewerOptions = options.viewerOptions;

        // Normalize by putting file inside files array if the latter
        // is empty. If its not empty, then it is assumed that file is
        // already inside files array.
        let files = options.files || [];
        if (files.length > 1) {
            this.files = files;
        } else {
            this.files = typeof file === 'string' ? [file] : [file.id];
        }
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
        this.options.token = token;
    }

    /**
     * Returns the current viewer
     *
     * @public
     * @returns {Object|undefined} current viewer
     */
    getViewer() {
        return this.viewer;
    }

    /**
     * Primary function to show a preview.
     *
     * @param {String|Object} file box file object or id
     * @param {Object} options options
     * @public
     * @returns {Promise} Promise to show a preview
     */
    show(file, options) {

        // Options
        this.parseOptions(file, options);

        // Check if file id was passed in or a well formed file object
        // Cache the file in the files array so that we don't prefetch it.
        // If we don't have the file data, we create an empty object.
        // If we have the file data, we use that.
        if (typeof file === 'string') {
            // String file id was passed in
            this.file = {
                id: file
            };
        } else {
            // File object was passed in
            this.file = file;
        }

        // Cache the file
        cache.set(file.id, this.file);

        // Setup the UI. Navigation is only shown if we are prevewing a collection
        // and if the client has not prevented us from showing the navigation.
        this.setup(options.container, this.files.length > 1 && this.options.navigation !== false);

        // Finally load the 1st preview
        return this.load(typeof file === 'string' ? file : file.id);
    }

    /**
     * Destroys and hides the preview
     *
     * @public
     * @param {Boolean} destroy destroys the container contents
     * @returns {void}
     */
    hide(destroy = false) {
        this.destroy();
        if (this.container) {
            this.container.style.display = 'none';
            this.container.removeEventListener('mousemove', this.throttledMousemoveHandler);
            if (destroy) {
                this.container.innerHTML = '';
            }
        }
    }
}

// Create a singleton instance for preview.
Box.Preview = new Preview();
global.Box = Box;
export default Box.Preview;
