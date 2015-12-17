'use strict';

import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fullscreen from './fullscreen';
import debounce from 'lodash/function/debounce';
import { createContentUrl } from './util';

const CLASS_FULLSCREEN = 'box-preview-is-fullscreen';
const RESIZE_WAIT_TIME_IN_MILLIS = 300;
const OPTIONS = {
    ui: true
};

let document = global.document;

@autobind
class Base extends EventEmitter {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container
     * @param {object} [options] some options
     * @returns {Base} Instance of base
     */
    constructor(container, options) {
        super();

        this.options = Object.assign({}, OPTIONS, options) || OPTIONS;
        this.currentRotationAngle = 0;

        // Get the container dom element if selector was passed
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        // Double check if the layout is accurate and if not create it.
        // This code should never execute when using the wrapper preview.js
        if (!container.firstElementChild || !container.firstElementChild.classList.contains('box-preview')) {
            container.innerHTML = '<div class="box-preview"></div>';

            // Make its position relative so that the childen can be positioned absolute
            container.style.position = 'relative';
        }

        // Save handles to the container and make its position relative
        // so that the childen can be positioned absolute
        this.containerEl = container.firstElementChild;

        // Attach event listeners
        this.addCommonListeners();

        // Timeout for loading the preview
        this.loadTimeout = 10000;
    }

    /**
     * Resize handler
     * @private
     * @returns {Function} debounced resize handler
     */
    debouncedResizeHandler() {
        if (!this.resizeHandler) {
            this.resizeHandler = debounce(() => {
                this.resize();
                this.emit('resize');
            }, RESIZE_WAIT_TIME_IN_MILLIS);
        }
        return this.resizeHandler;
    }

    /**
     * Loads content.
     *
     * @protected
     * @returns {Promise} Promise to load image
     */
    load() {
        setTimeout(() => {
            if (!this.loaded && !this.destroyed) {
                this.emit('error');
            }
        }, this.loadTimeout);
    }

    /**
     * Headers for fetch
     *
     * @protected
     * @param {String} url url to attach param to
     * @returns {Object} fetch headers
     */
    appendAuthParam(url) {
        return createContentUrl(url, this.options.token);
    }

    /**
     * Headers for fetch
     *
     * @protected
     * @param {Object} [headers] optional existing headers
     * @returns {Object} fetch headers
     */
    appendAuthHeader(headers = {}) {
        headers.Authorization = 'Bearer ' + this.options.token;
        return headers;
    }

    /**
     * Adds common event listeners.
     *
     * @private
     * @returns {void}
     */
    addCommonListeners() {
        // Attach common full screen event listeners
        fullscreen.on('enter', () => {
            this.containerEl.classList.add(CLASS_FULLSCREEN);
            this.emit('enterfullscreen');
        });

        fullscreen.on('exit', () => {
            this.containerEl.classList.remove(CLASS_FULLSCREEN);
            this.emit('exitfullscreen');
        });

        // Add a resize handler for the window
        document.defaultView.addEventListener('resize', this.debouncedResizeHandler());
    }

    /**
     * Enters or exits fullscreen
     * @private
     * @returns {void}
     */
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl);
    }

    /**
     * Resizing logic
     *
     * @private
     * @returns {void}
     */
    resize() {
        // overriden
    }

    /**
     * Destroys the viewer
     *
     * @private
     * @returns {void}
     */
    destroy() {
        fullscreen.removeAllListeners();
        document.defaultView.removeEventListener('resize', this.resizeHandler);
        this.removeAllListeners();
        this.containerEl.innerHTML = '';
        this.destroyed = true;
    }
}

export default Base;
