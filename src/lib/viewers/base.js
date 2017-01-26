import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import debounce from 'lodash.debounce';
import fullscreen from '../fullscreen';
import {
    appendAuthParams,
    getHeaders,
    createContentUrl,
    loadStylesheets,
    loadScripts,
    prefetchAssets,
    createAssetUrlCreator
} from '../util';
import Browser from '../browser';
import {
    CLASS_FULLSCREEN,
    CLASS_BOX_PREVIEW_MOBILE,
    SELECTOR_BOX_PREVIEW
} from '../constants';

const LOAD_TIMEOUT_MS = 180000; // 3m
const RESIZE_WAIT_TIME_IN_MILLIS = 300;

@autobind
class Base extends EventEmitter {
    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl - The container
     * @param {Object} options - some options
     * @return {Base} Instance of base
     */
    constructor(options) {
        super();
        this.options = options;
    }

    /**
     * Sets up the vewier and its DOM
     *
     * @return {void}
     */
    setup() {
        // Get the container dom element if selector was passed, in tests
        let { container } = this.options;
        if (typeof container === 'string') {
            container = document.querySelector(container);
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
     * Destroys the viewer
     *
     * @protected
     * @return {void}
     */
    destroy() {
        const { status } = this.options.representation || {};
        if (status) {
            status.destroy();
        }
        fullscreen.removeAllListeners();
        document.defaultView.removeEventListener('resize', this.debouncedResizeHandler);
        this.removeAllListeners();
        if (this.containerEl) {
            this.containerEl.innerHTML = '';
        }
        this.destroyed = true;
        this.emit('destroy');
    }

    /**
     * Resize handler
     *
     * @private
     * @return {Function} debounced resize handler
     */
    debouncedResizeHandler = debounce(() => {
        this.resize();
    }, RESIZE_WAIT_TIME_IN_MILLIS);

    /**
     * Loads content.
     *
     * @protected
     * @return {void}
     */
    load() {
        this.resetLoadTimeout();
    }

    /**
     * Sets a timeout for loading.
     *
     * @protected
     * @emits error
     * @return {void}
     */
    resetLoadTimeout() {
        clearTimeout(this.loadTimeoutId);
        /* istanbul ignore next */
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
     * Tells if the content is loaded or not
     *
     * @protected
     * @return {boolean} true if loaded
     */
    isLoaded() {
        return this.loaded;
    }

    /**
     * Tells if preview destroyed
     *
     * @protected
     * @return {boolean} true if destroyed
     */
    isDestroyed() {
        return this.destroyed;
    }

    /**
     * Returns the name of the viewer
     *
     * @protected
     * @return {void}
     */
    getName() {
        throw new Error('Viewer needs to override getName()');
    }

    /**
     * Appends auth params to the content url
     *
     * @protected
     * @param {string} url - url to attach param to
     * @return {string} url with appended auth params
     */
    appendAuthParams(url) {
        const { token, sharedLink, sharedLinkPassword } = this.options;
        return appendAuthParams(url, token, sharedLink, sharedLinkPassword);
    }

    /**
     * Creates and returns the content url
     * Prioritizes using the provided asset over
     * using the asset name provided from preview
     *
     * @protected
     * @param {string} template - url template to attach param to
     * @param {string|void} [asset] - optional asset name needed to access file
     * @return {string} content url
     */
    createContentUrl(template, asset) {
        return createContentUrl(template, asset);
    }

    /**
     * Creates and returns the content url
     * Prioritizes using the provided asset over
     * using the asset name provided from preview
     *
     * @protected
     * @param {string} template - url template to attach param to
     * @param {string|void} [asset] - optional asset name needed to access file
     * @return {string} content url
     */
    createContentUrlWithAuthParams(template, asset) {
        return this.appendAuthParams(this.createContentUrl(template, asset));
    }

    /**
     * Adds headers needed for an XHR fetch
     *
     * @protected
     * @param {Object} [headers] - optional existing headers
     * @return {Object} fetch headers
     */
    appendAuthHeader(headers = {}) {
        const { token, sharedLink, sharedLinkPassword } = this.options;
        return getHeaders(headers, token, sharedLink, sharedLinkPassword);
    }

    /**
     * Adds common event listeners.
     *
     * @private
     * @return {void}
     */
    addCommonListeners() {
        // Attach common full screen event listeners
        /* istanbul ignore next */
        fullscreen.addListener('enter', () => {
            this.containerEl.classList.add(CLASS_FULLSCREEN);
            this.resize();
        });

        /* istanbul ignore next */
        fullscreen.addListener('exit', () => {
            this.containerEl.classList.remove(CLASS_FULLSCREEN);
            this.resize();
        });

        // Add a resize handler for the window
        document.defaultView.addEventListener('resize', this.debouncedResizeHandler);
    }

    /**
     * Enters or exits fullscreen
     * @protected
     * @return {void}
     */
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl);
    }

    /**
     * Resizing logic
     *
     * @protected
     * @emits resize
     * @return {void}
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
     * @return {boolean} true
     */
    allowNavigationArrows() {
        return true;
    }

    /**
     * Emits a generic viewer event
     *
     * @protected
     * @emits viewerevent
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @return {void}
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
     * @private
     * @param {Event} event - object
     * @return {void}
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
     * @private
     * @param {Event} event - object
     * @return {void}
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
     * @private
     * @param {Event} event - object
     * @return {void}
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
     * @protected
     * @param {string} option - to get
     * @return {Object} Value of a viewer option
     */
    getViewerOption(option) {
        const { viewers, viewerName } = this.options;
        if (viewers && viewers[viewerName]) {
            return viewers[viewerName][option];
        }
        return null;
    }

    /**
     * Loads assets needed for a viewer
     *
     * @protected
     * @param {Array} [js] - js assets
     * @param {Array} [css] - css assets
     * @return {Promise} Promise to load scripts
     */
    loadAssets(js, css) {
        // Create an asset path creator function
        const { location } = this.options;
        const assetUrlCreator = createAssetUrlCreator(location);

        // 1st load the stylesheets needed for this preview
        loadStylesheets((css || []).map(assetUrlCreator));

        // Then load the scripts needed for this preview
        return loadScripts((js || []).map(assetUrlCreator));
    }

    /**
     * Prefetches assets needed for a viewer
     *
     * @protected
     * @param {Array} [js] - js assets
     * @param {Array} [css] - css assets
     * @return {void}
     */
    prefetchAssets(js, css) {
        // Create an asset path creator function
        const { location } = this.options;
        const assetUrlCreator = createAssetUrlCreator(location);

        // Prefetch the stylesheets needed for this preview
        prefetchAssets((css || []).map(assetUrlCreator));

        // Prefetch the scripts needed for this preview
        prefetchAssets((js || []).map(assetUrlCreator));
    }
}

export default Base;
