'use strict';

import '../css/preview.css';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import throttle from 'lodash/function/throttle';
import fetch from 'isomorphic-fetch';
import Browser from './browser';
import loaders from './loaders';

const PREFETCH_COUNT = 5;
const CLASS_NAVIGATION_VISIBILITY = 'box-preview-is-navigation-visible';
const CLASS_HIDDEN = 'box-preview-is-hidden';
const MOUSEMOVE_THROTTLE = 1500;

let Box = global.Box || {};
let location = global.location;

@autobind
class Preview {

    /**
     * [constructor]
     * @returns {Preview}
     */
    constructor() {
        // Preview cache, stores bunch of file data
        this.cache = {};

        // Current file being shown
        this.file = {};
    }

    /**
     * Returns the box file content api url
     * @param {id} file box file id
     * @returns {String}
     */
    createUrl(id) {
        return this.options.host + '/api/2.0/files/' + id + '?fields=permissions,parent,shared_link,sha1,file_version,name,size,extension,download_url,representations';
    }

    /**
     * Initializes the container for preview.
     * @param {String|HTMLElement} container where to load the preview
     * @param {Boolean} hasNavigation If we allow navigation.
     * @returns {void}
     */
    setup(container, hasNavigation = false) {

        // Get the container dom element if a selector was passed instead.
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        // Save a handle to the container for future references.
        this.container = container;

        // Prepare the container by adding our viewer wrapper.
        this.container.innerHTML = '<div class="box-preview"></div>';     
        
        // Position the container as relative so that the children
        // can be positioned absolute, this includes the viewer wrapper
        // as well as the left and right navigation arrows.
        this.container.style.position = 'relative';

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
     * Shows a preview
     * @param {String|Object} file box file object or id
     * @param {Array[String]} files ids of files
     * @param {String|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @returns {Promise}
     */
    show(file, files, container, options = {}) {

        // Normalize by putting file inside files array if the latter
        // is empty. If its not empty, then it is assumed that file is
        // already inside files array.
        if (files.length > 1) {
            this.files = files;
        } else {
            this.files = typeof file === 'string' ? [file] : [file.id];
        }

        // Optional options
        this.options = options;
        this.options.host = options.host || location.origin;

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
        this.setup(container, this.files.length > 1 && this.options.navigation !== false);

        // Finally load the 1st preview
        return this.load(typeof file === 'string' ? file : file.id);
    }

    /**
     * loads the preview for a file
     * @param {String} id File to preview
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
     * @param {Object} file File to preview
     * @param {Boolean} [checkStaleness] Check for cache staleness
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
     * @param {String} id File id to preview
     * @returns {Promise}
     */
    loadFromServer(id) {
        return fetch(this.createUrl(id), {
            headers: this.getRequestHeaders()
        })
        .then((response) => response.json())
        .then((file) => {
            this.cache[id] = file;
            this.file = file;
            return this.loadViewer(); 
        });
    }

    /**
     * Loads a viewer.
     * @returns {Promise}
     */
    loadViewer() {
        return this.getLoader(this.file).load(this.file, this.container, this.options);
    }

    getAuthorizationToken() {
        return this.options.authToken;
    }

    setAuthorizationToken(authToken) {
        this.options.authToken = authToken;
    }

    getRequestHeaders() {
        return {  
            'Authorization': 'Bearer ' + this.getAuthorizationToken(),
            'X-Rep-Hints': 'crocodoc|png?dimensions=2048x2048|jpg?dimensions=2048x2048' + (Browser.canPlayDash() ? '|dash|filmstrip' : '|mp4')
        }
    }

    /**
     * Shows a preview
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

                // Save the returned file
                this.cache[nextId] = file;

                // Pre-fetch content if applicable so that the
                // Browser caches the content
                let loader = this.getLoader(file)
                if (typeof loader.prefetch === 'function') {
                    loader.prefetch(file, this.options);
                }
            });
        }        
    }

    /**
     * Determines a loader
     * @param {Object} file File to preview
     * @returns {Object}
     */
    getLoader(file) {
        
        let loader = loaders.find((loader) => {
            return loader.canLoad(file);
        });

        if (loader) {
            return loader;
        }

        throw 'Unkown loader';
    }

    /**
     * Shows navigation arrows
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
}

Box.Preview = new Preview();
global.Box = Box;
export default Box.Preview;