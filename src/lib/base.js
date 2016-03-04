import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fullscreen from './fullscreen';
import { createContentUrl } from './util';
import debounce from 'lodash.debounce';

import {
    CLASS_FULLSCREEN,
    CLASS_FULLSCREEN_DISABLED,
    CLASS_BOX_PREVIEW_CONTAINER,
    CLASS_BOX_PREVIEW,
    SELECTOR_BOX_PREVIEW_CONTAINER,
    SELECTOR_BOX_PREVIEW
} from './constants';

const RESIZE_WAIT_TIME_IN_MILLIS = 300;
const OPTIONS = {
    ui: true
};

@autobind
class Base extends EventEmitter {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container
     * @param {Object} [options] some options
     * @returns {Base} Instance of base
     */
    constructor(containerEl, options) {
        super();

        // Save the options
        this.options = Object.assign({}, OPTIONS, options) || OPTIONS;

        // Get the container dom element if selector was passed
        let container = containerEl;
        if (typeof containerEl === 'string') {
            container = document.querySelector(containerEl);
        }

        // Double check if the layout is accurate and if not re-create it.
        // This code should never execute when using the wrapper preview.js
        if (!container.classList.contains(CLASS_BOX_PREVIEW_CONTAINER) || !container.firstElementChild) {
            const wrapper = container.parentElement;
            wrapper.innerHTML = `<div class="${CLASS_BOX_PREVIEW_CONTAINER}" style="display: block;"><div class="${CLASS_BOX_PREVIEW}"></div></div>`;
            container = wrapper.querySelector(SELECTOR_BOX_PREVIEW_CONTAINER);
        }

        // From the perspective of viewers box-preview holds everything
        this.containerEl = container.querySelector(SELECTOR_BOX_PREVIEW);

        // Attach event listeners
        this.addCommonListeners();

        // Timeout for loading the preview
        this.loadTimeout = 15000;
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
     * Sets a timeout for loading.
     *
     * @protected
     * @returns {void}
     */
    load() {
        setTimeout(() => {
            if (!this.isLoaded() && !this.isDestroyed()) {
                this.emit('error');
            }
        }, this.loadTimeout);
    }

    /**
     * Loads content.
     *
     * @protected
     * @returns {Boolean} loaded
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * If preview destroyed
     *
     * @protected
     * @returns {Boolean} destroyed
     */
    isDestroyed() {
        return this.destroyed;
    }

    /**
     * Headers for fetch
     *
     * @protected
     * @param {String} url url to attach param to
     * @returns {Object} fetch headers
     */
    appendAuthParam(url) {
        const id = this.options.file.id;
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
        /* eslint-disable no-param-reassign */
        headers.Authorization = this.options.authorization;
        /* eslint-enable no-param-reassign */
        return headers;
    }

    /**
     * Adds common event listeners.
     *
     * @private
     * @returns {void}
     */
    addCommonListeners() {
        if (fullscreen.isSupported()) {
            // Attach common full screen event listeners
            fullscreen.on('enter', () => {
                this.containerEl.classList.add(CLASS_FULLSCREEN);
                this.emit('enterfullscreen');
            });

            fullscreen.on('exit', () => {
                this.containerEl.classList.remove(CLASS_FULLSCREEN);
                this.emit('exitfullscreen');
            });
        } else {
            this.containerEl.classList.add(CLASS_FULLSCREEN_DISABLED);
        }

        // Add a resize handler for the window
        document.defaultView.addEventListener('resize', this.debouncedResizeHandler());
    }

    /**
     * Enters or exits fullscreen
     * @private
     * @returns {void}
     */
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl, this.vrDevice);
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
