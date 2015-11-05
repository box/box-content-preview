'use strict';

import '../css/preview.css';
import autobind from 'autobind-decorator';
import throttle from 'lodash/function/throttle';
//import fetch from 'isomorphic-fetch';
import Browser from './browser';
import loaders from './loaders';

const PREFETCH_COUNT = 5;
const CLASS_NAVIGATION_VISIBILITY = 'box-preview-is-navigation-visible';
const CLASS_HIDDEN = 'box-preview-is-hidden';
const MOUSEMOVE_THROTTLE = 1500;
const CRAWLER = '<div class="box-preview-crawler-wrapper"><div class="box-preview-crawler"><div></div><div></div><div></div></div></div>'

let Box = global.Box || {};
let Promise = global.Promise;
let location = global.location;

@autobind
class Preview {

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     * @returns {Preview}
     */
    constructor() {
        // Preview cache, stores a bunch of file data
        this.cache = {};

        // Current file being previewed
        this.file = {};
    }

    /**
     * Returns the box file content api url
     * 
     * @param {id} file box file id
     * @private
     * @returns {String}
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

        // If we are showing navigation, create arrows and attach
        // mouse move handler to show or hide them.
        if (hasNavigation) {
            this.showNavigation();
            this.container.addEventListener('mousemove', throttle(() => {
                clearTimeout(this.timeoutHandler);
                this.container.classList.add(CLASS_NAVIGATION_VISIBILITY);
                this.timeoutHandler = setTimeout(() => {
                    this.container.classList.remove(CLASS_NAVIGATION_VISIBILITY);
                }, MOUSEMOVE_THROTTLE);
            }, MOUSEMOVE_THROTTLE - 500, true));
        }
    }

    /**
     * Loads the preview for a file.
     * 
     * @param {String} id File to preview
     * @private
     * @returns {Promise}
     */
    load(id) {

        let promise;

        // Nuke everything in the box-preview wrapper to prepare for this preview.
        this.container.firstElementChild.innerHTML = '';

        // Check the cache before making a network request.
        let cached = this.cache[id];

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
     * @returns {Promise}
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
                this.cache[file.id] = file;
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
     * @returns {Promise}
     */
    loadFromServer(id) {
        return fetch(this.createUrl(id), {
            headers: this.getRequestHeaders()
        })
        .then((response) => response.json())
        .then((file) => {
            if (file.type === 'file') {
                this.cache[id] = file;
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
     * @returns {Promise}
     */
    loadViewer() {
        let loader = this.getLoader(this.file);
        if (loader && typeof loader.load === 'function') {
            return loader.load(this.file, this.container, this.options);
        }
    }

    /**
     * Builds a list of required XHR headers.
     * 
     * @private
     * @returns {Object}
     */
    getRequestHeaders() {
        let headers = {  
            'Authorization': 'Bearer ' + this.options.token,
            'X-Rep-Hints': 'original|pdf|png?dimensions=2048x2048|jpg?dimensions=2048x2048' + (Browser.canPlayDash() ? '|dash|filmstrip' : '|mp4')
        }

        if (this.options.sharedLink) {
            headers.BoxApi = 'shared_link=' + sharedLink;
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
            if (this.cache[nextId]) {
                continue;
            }

            // Create an empty object to prevent further prefetches
            this.cache[nextId] = {};

            // Pre-fetch the file information
            fetch(this.createUrl(nextId), {
                headers: this.getRequestHeaders()
            })
            .then((response) => response.json())
            .then((file) => {
                // Don't bother with non-files
                if (file.type === 'file') {
                    // Save the returned file
                    this.cache[nextId] = file;

                    // Pre-fetch content if applicable so that the
                    // Browser caches the content
                    let loader = this.getLoader(file)
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
     * @returns {Object}
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
     * @param {Array[String]} files ids of files
     * @return {void}
     */
    parseOptions(file, options) {
        // Use all the passed in options
        this.options = options;

        // API host should be available
        if (!options.api) {
            throw 'Missing API Host!';
        }

        // Auth token should be available
        if (!options.token) {
            throw 'Missing Auth Token!';
        }

        // All preview assets are relative to preview.js
        // preview.js is loaded by the browser, just query for it and replace
        // preview.js with whatever asset needs to be fetched.
        this.options.asset = document.querySelector('script[src*="preview.js"]').src.replace('preview.js', '{{asset_name}}');

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
    

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Primary function to show a preview.
     * 
     * @param {String|Object} file box file object or id
     * @param {Array[String]} files ids of files
     * @param {Object} options
     * @public
     * @returns {Promise}
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
            this.file = this.cache[file] = {
                id: file
            }
        } else {
            // File object was passed in
            this.file = this.cache[file.id] = file;
        }
        
        // Setup the UI. Navigation is only shown if we are prevewing a collection
        // and if the client has not prevented us from showing the navigation.
        this.setup(options.container, this.files.length > 1 && this.options.navigation !== false);

        // Finally load the 1st preview
        return this.load(typeof file === 'string' ? file : file.id);
    }

    /**
     * Sets the authorization token that may have expired.
     * 
     * @public
     * @returns {void}
     */
    setAuthorizationToken(token) {
        this.options.token = token;
    }
}

// Create a singleton instance for preview.
Box.Preview = new Preview();
global.Box = Box;
export default Box.Preview;