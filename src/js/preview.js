'use strict';

import '../css/preview.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import throttle from 'lodash/function/throttle';
import fetch from 'isomorphic-fetch';
import ImageLoader from './image-loader';

let Box = global.Box || {};

const PREFETCH_COUNT = 5;
const NAVIGATION_VISIBILITY_CLASS = 'is-box-preview-navigation-visible';
const MOUSEMOVE_THROTTLE = 1500;

@autobind
class Preview {

    /**
     * [constructor]
     * @returns {Box.Preview}
     */
    constructor() {
        if (!Box.Preview) {
            
            this.cache = {};
            this.current = {};

            this.mousemoveHandler = throttle(() => {
                clearTimeout(this.timeoutHandler);
                this.container.classList.add(NAVIGATION_VISIBILITY_CLASS);
                this.timeoutHandler = setTimeout(() => {
                    this.container.classList.remove(NAVIGATION_VISIBILITY_CLASS);
                }, MOUSEMOVE_THROTTLE);
            }, MOUSEMOVE_THROTTLE - 500, true);

            Box.Preview = this;
        }
        return Box.Preview;
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
     * Shows a preview
     * @param {String|Array} files box file id or ids
     * @param {String|HTMLElement} container where to load the preview
     * @param {Object} [options] optional options
     * @return {Promise}
     */
    show(files, container, options = {}) {

        // Get the container dom element if selector was passed in
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        // Prepare the container by adding our viewer wrapper and
        // position the container as relative so that the children
        // can be positioned absolute
        container.innerHTML = '<div class="box-preview"></div>';     
        container.style.position = 'relative';

        // Normalize the input array of ids
        if (Array.isArray(files)) {
            this.files = files;
        } else {
            this.files = [files];
        }

        this.container = container;
        this.options = options;
        this.cache[this.files[0]] = {};

        this.container.addEventListener('mousemove', this.mousemoveHandler);
        this.showNavigation();

        return this.load(this.files[0]);
    }

    /**
     * Shows a preview
     * @return {Promise}
     */
    load(id) {

        // Nuke everything in the box preview wrapper
        this.container.firstElementChild.innerHTML = '';

        let promise = fetch(this.createUrl(id)).then((response) => {
            return response.json();
        }).then((file) => {

            this.cache[id] = file;
            this.current = file;

            let previewer;
            
            switch (file.type) {
                case 'image':
                    previewer = ImageLoader.load(file, this.container, this.options);
                    break;
                case 'video':
                    break;
                case 'audio':
                    break;
                default:
                    throw 'Unsupported viewer';
            }
            
            return previewer; 
        });

        if (this.files.length > 1) {
            promise.then(() => {
                this.prefetch();
            });
        }

        return promise;
    }

    /**
     * Shows a preview
     * @return {void}
     */
    prefetch() {

        if (this.files.length === 1) {
            return;
        }

        let prefetchCount = 0;

        this.files.forEach((id) => {
            if (!this.cache[id] && prefetchCount < PREFETCH_COUNT) {

                prefetchCount++;
                this.cache[id] = {};

                fetch(this.createUrl(id)).then((response) => {
                    return response.json();
                }).then((file) => {

                    this.cache[id] = file;

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
        });        
    }

    /**
     * Shows navigation arrows
     * @return {void}
     */
    showNavigation() {
        let left = document.createElement('div');
        let leftSpan = document.createElement('span');
        left.className = 'box-preview-navigate box-preview-navigate-left';
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
     * Shows the prior preview
     * @return {void}
     */
    navigateLeft() {
        let currentIndex = this.files.indexOf(this.current.id);
        let newIndex = currentIndex === 0 ? 0 : currentIndex - 1;
        if (newIndex !== currentIndex) {
            this.load(this.files[newIndex]);
        }
    }

    /**
     * Shows the next preview
     * @return {void}
     */
    navigateRight() {
        let currentIndex = this.files.indexOf(this.current.id);
        let newIndex = currentIndex === this.files.length - 1 ? this.files.length - 1 : currentIndex + 1;
        if (newIndex !== currentIndex) {
            this.load(this.files[newIndex]);
        }
    }
}

Box.Preview = new Preview();
global.Box = Box;
export default Box.Preview;