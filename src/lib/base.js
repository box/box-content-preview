import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fullscreen from './fullscreen';
import { createContentUrl, getHeaders } from './util';
import debounce from 'lodash.debounce';
import Browser from './browser';

import {
    CLASS_FULLSCREEN,
    CLASS_BOX_PREVIEW_CONTAINER,
    CLASS_BOX_PREVIEW,
    CLASS_BOX_PREVIEW_MOBILE,
    SELECTOR_BOX_PREVIEW_CONTAINER,
    SELECTOR_BOX_PREVIEW
} from './constants';

const LOAD_TIMEOUT_MS = 15000; // 15s
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
        this.loadTimeout = LOAD_TIMEOUT_MS;

        // For mobile browsers add mobile class just in case viewers need it
        if (Browser.isMobile()) {
            this.containerEl.classList.add(CLASS_BOX_PREVIEW_MOBILE);
        }
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
        return createContentUrl(url, this.options.token, this.options.sharedLink, this.options.sharedLinkPassword);
    }

    /**
     * Headers for fetch
     *
     * @protected
     * @param {Object} [headers] optional existing headers
     * @returns {Object} fetch headers
     */
    appendAuthHeader(headers = {}) {
        return getHeaders(headers, this.options.token, this.options.sharedLink, this.options.sharedLinkPassword);
    }

    /**
     * Adds common event listeners.
     *
     * @private
     * @returns {void}
     */
    addCommonListeners() {
        // Attach common full screen event listeners
        fullscreen.addListener('enter', () => {
            this.containerEl.classList.add(CLASS_FULLSCREEN);
            this.resize();
        });
        fullscreen.addListener('exit', () => {
            this.containerEl.classList.remove(CLASS_FULLSCREEN);
            this.resize();
        });

        // Add a resize handler for the window
        document.defaultView.addEventListener('resize', this.debouncedResizeHandler());
    }

    /**
     * Enters or exits fullscreen
     * @protected
     * @returns {void}
     */
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl);
    }

    /**
     * Resizing logic
     *
     * @protected
     * @returns {void}
     */
    resize() {
        this.emit('resize');
    }

    /**
     * Function to tell preview if navigation arrows
     * should be shown and won't intefere with viewer
     *
     * @protected
     * @returns {Boolean} true
     */
    allowNavigationArrows() {
        return true;
    }

    /**
     * Destroys the viewer
     *
     * @protected
     * @returns {void}
     */
    destroy() {
        fullscreen.removeAllListeners();
        document.defaultView.removeEventListener('resize', this.resizeHandler);
        this.removeAllListeners();
        this.containerEl.innerHTML = '';
        this.destroyed = true;
    }

    /**
     * Emits a generic viewer event
     *
     * @protected
     * @returns {void}
     */
    emit(event, data) {
        super.emit(event, data);
        super.emit('viewerevent', {
            event,
            data,
            viewerName: this.options.viewerName,
            fileId: this.options.file.id
        });
    }
}

export default Base;
