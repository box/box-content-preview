import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import debounce from 'lodash.debounce';
import fullscreen from '../fullscreen';
import { createContentUrl, getHeaders } from '../util';
import Browser from '../browser';
import {
    CLASS_FULLSCREEN,
    CLASS_BOX_PREVIEW_CONTAINER,
    CLASS_BOX_PREVIEW,
    CLASS_BOX_PREVIEW_MOBILE,
    SELECTOR_BOX_PREVIEW_CONTAINER,
    SELECTOR_BOX_PREVIEW
} from '../constants';

const LOAD_TIMEOUT_MS = 180000; // 3m
const RESIZE_WAIT_TIME_IN_MILLIS = 300;

@autobind
class Base extends EventEmitter {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container
     * @param {Object} [options] some options
     * @returns {Base} Instance of base
     */
    constructor(containerEl, options) {
        super();

        // Save the options
        this.options = options;

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

        // From the perspective of viewers bp holds everything
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
     *
     * @protected
     * @returns {void}
     */
    load() {
        this.resetLoadTimeout();
    }

    /**
     * Sets a timeout for loading.
     *
     * @protected
     * @returns {void}
     */
    resetLoadTimeout() {
        clearTimeout(this.loadTimeoutId);
        this.loadTimeoutId = setTimeout(() => {
            if (document.hidden) {
                this.resetLoadTimeout();
                return;
            }
            if (!this.isLoaded() && !this.isDestroyed()) {
                this.emit('error', new Error(__('error_refresh')));
            }
        }, this.loadTimeout);
    }

    /**
     * Loads content.
     *
     * @protected
     * @returns {boolean} loaded
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * If preview destroyed
     *
     * @protected
     * @returns {boolean} destroyed
     */
    isDestroyed() {
        return this.destroyed;
    }

    /**
     * Headers for fetch
     *
     * @protected
     * @param {string} url url to attach param to
     * @returns {string} url with appended auth params
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
        this.emit('resize', {
            width: document.documentElement.clientWidth,
            height: document.documentElement.clientHeight
        });
    }

    /**
     * Function to tell preview if navigation arrows
     * should be shown and won't intefere with viewer
     *
     * @protected
     * @returns {boolean} true
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
        this.emit('destroy');
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
     * @param {string} event Event name
     * @param {Object} data Event data
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

    /**
     * Handles the beginning of a pinch to zoom event on mobile.
     * Although W3 strongly discourages the prevention of pinch to zoom,
     * we still meet the WCAG's requirement of a 200% zoom on text.
     *
     * @returns {void}
     * @private
     */
    mobileZoomStartHandler(event) {
        if (Browser.isIOS()) {
            this._scaling = true;
            event.preventDefault();
            event.stopPropagation();
        } else if (event.touches.length === 2) {
            this._pinchScale = {
                initial: {
                    0: [event.touches[0].clientX, event.touches[0].clientY],
                    1: [event.touches[1].clientX, event.touches[1].clientY]
                },
                end: {}
            };
            this._scaling = true;
            event.preventDefault();
            event.stopPropagation();
        } else {
            this._scaling = false;
            this._pinchScale = undefined;
        }
    }

    /**
     * Handles updates to the pinch in order to determine whether the user
     * was pinching in or out. Used only by non iOS browsers
     *
     * @returns {void}
     * @private
     */
    mobileZoomChangeHandler(event) {
        if (event.touches.length !== 2 || !this._scaling) {
            return;
        }
        this._pinchScale.end = {
            0: [event.touches[0].clientX, event.touches[0].clientY],
            1: [event.touches[1].clientX, event.touches[1].clientY]
        };
    }

    /**
     * Zooms the document in or out depending on the scale of the pinch
     *
     * @returns {void}
     * @private
     */
    mobileZoomEndHandler(event) {
        if (this._scaling) {
            let zoomScale = 0;
            if (Browser.isIOS()) {
                zoomScale = event.scale - 1; // normalize to keep scale values consistant between browser events
            } else {
                // calculating the distances between the initial and ending pinch positions
                const initialDistance = Math.sqrt(
                    ((this._pinchScale.initial[0][0] - this._pinchScale.initial[1][0]) * (this._pinchScale.initial[0][0] - this._pinchScale.initial[1][0])) +
                    ((this._pinchScale.initial[0][1] - this._pinchScale.initial[1][1]) * (this._pinchScale.initial[0][1] - this._pinchScale.initial[1][1])));
                const finalDistance = Math.sqrt(
                    ((this._pinchScale.end[0][0] - this._pinchScale.end[1][0]) * (this._pinchScale.end[0][0] - this._pinchScale.end[1][0])) +
                    ((this._pinchScale.end[0][1] - this._pinchScale.end[1][1]) * (this._pinchScale.end[0][1] - this._pinchScale.end[1][1])));
                zoomScale = finalDistance - initialDistance;
            }

            if (zoomScale > 0) {
                this.zoomIn();
            } else if (zoomScale < 0) {
                this.zoomOut();
            }

            this._scaling = false;
            this._pinchScale = undefined;
        }
    }

    /**
     * Retrieves the value of a viewer option.
     *
     * @returns {object} Value of a viewer option
     */
    getViewerOption(option) {
        const viewers = this.options.viewers;
        const viewerName = this.options.viewerName;

        if (viewers && viewers[viewerName]) {
            return viewers[viewerName][option];
        }

        return null;
    }
}

export default Base;
