'use strict';

import '../css/preview.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import throttle from 'lodash/function/throttle';
import fetch from 'isomorphic-fetch';
import ImageLoader from './image-loader';

const PREFETCH_COUNT = 5;
const CLASS_NAVIGATION_VISIBILITY = 'is-box-preview-navigation-visible';
const CLASS_HIDDEN = 'is-hidden';
const MOUSEMOVE_THROTTLE = 1500;

let Box = global.Box || {};
let location = global.location;
let singleton = null;

@autobind
class Preview {

    /**
     * [constructor]
     * @returns {Preview}
     */
    constructor() {
        if (!singleton) {
            // Only allow 1 instance of Preview
            singleton = this;

            // Preview cache, stores bunch of file data
            this.cache = {};

            // Current file being shown
            this.file = {};
        }
        return singleton;
    }

    /**
     * Returns the box file content api url
     * @param {id} file box file id
     * @returns {String}
     */
    createUrl(id) {
        return this.options.host + '/filez/' + id + '/preview';
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
     * @param {String|Array} files box file id or ids
     * @param {String|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @returns {Promise}
     */
    show(files, container, options = {}) {

        // Normalize the input array of ids
        if (Array.isArray(files)) {
            this.files = files;
        } else {
            this.files = [files];
        }

        // Optional options
        this.options = options;
        this.options.host = options.host || location.origin;
        
        // Cache the 1st file in the array so that we don't prefetch it.
        // Currently we don't have the file data, so creating an empty object.
        this.cache[this.files[0]] = {};

        // Setup the UI. Navigation is only shown if we are prevewing a collection
        // and if the client has not prevented us from showing the navigation.
        this.setup(container, this.files.length > 1 && this.options.navigation !== false);

        // Finally load the 1st preview
        return this.load(this.files[0]);
    }

    /**
     * Shows a preview suing id.
     * @param {String} id File id to preview
     * @returns {Promise}
     */
    load(id) {

        let promise;

        // Nuke everything in the box-preview wrapper to prepare for this preview.
        this.container.firstElementChild.innerHTML = '';

        // Check the cache before making a network request.
        let cached = this.cache[id];

        if (cached && cached.id === id) {
            // Cache hit, use that.
            promise = this.loadFromCache(cached);
        } else {
            // Cache miss, fetch from the server.
            promise = this.loadFromServer(id);
        }

        if (this.files.length > 1) {
            promise.then(() => {
                this.prefetch();
            });
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
            fetch(this.createUrl(file.id)).then((response) => {
                return response.json();
            }).then((file) => {
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
        return fetch(this.createUrl(id)).then((response) => {
            return response.json();
        }).then((file) => {
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

        let promise;
            
        switch (this.file.type) {
            case 'image':
                promise = ImageLoader.load(this.file, this.container, this.options);
                break;
            case 'video':
                break;
            case 'audio':
                break;
            default:
                throw 'Unsupported viewer';
        }
        
        return promise;
    }

    /**
     * Shows a preview
     * @returns {void}
     */
    prefetch() {

        let currentIndex = this.files.indexOf(this.file.id);
        
        // Starting with the next file, prefetch specific numbers of files.
        for (let i = currentIndex + 1; i < PREFETCH_COUNT; i++) {

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
            fetch(this.createUrl(nextId)).then((response) => {
                return response.json();
            }).then((file) => {

                // Save the returned file
                this.cache[nextId] = file;

                // Pre-fetch content if applicable so that the
                // browser caches the content
                switch (file.type) {
                    case 'image':
                        ImageLoader.prefetch(file, this.options);
                        break;
                    case 'video':
                        break;
                    case 'audio':
                        break;
                }
            });
        }        
    }

    /**
     * Shows navigation arrows
     * @returns {void}
     */
    showNavigation() {
        let left = document.createElement('div');
        let leftSpan = document.createElement('span');
        left.className = 'box-preview-navigate box-preview-navigate-left is-hidden';
        leftSpan.className = 'box-preview-left-arrow';
        left.appendChild(leftSpan);
        left.addEventListener('click', this.navigateLeft);

        let right = document.createElement('div');
        let rightSpan = document.createElement('span');
        right.className = 'box-preview-navigate box-preview-navigate-right';
        rightSpan.className = 'box-preview-right-arrow';
        right.appendChild(rightSpan);
        right.addEventListener('click', this.navigateRight);

        this.container.appendChild(left);
        this.container.appendChild(right);
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