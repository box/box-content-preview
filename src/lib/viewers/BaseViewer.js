import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import debounce from 'lodash.debounce';
import fullscreen from '../Fullscreen';
import RepStatus from '../RepStatus';
import {
    appendAuthParams,
    getHeaders,
    createContentUrl,
    loadStylesheets,
    loadScripts,
    prefetchAssets,
    createAssetUrlCreator
} from '../util';
import { checkPermission } from '../file';
import Browser from '../Browser';
import {
    PERMISSION_ANNOTATE,
    CLASS_FULLSCREEN,
    CLASS_HIDDEN,
    CLASS_BOX_PREVIEW_MOBILE,
    SELECTOR_BOX_PREVIEW,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE,
    STATUS_SUCCESS,
    STATUS_VIEWABLE
} from '../constants';

const ANNOTATIONS_JS = ['annotations.js'];
const LOAD_TIMEOUT_MS = 180000; // 3m
const RESIZE_WAIT_TIME_IN_MILLIS = 300;

@autobind
class BaseViewer extends EventEmitter {
    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl - The container
     * @param {Object} options - some options
     * @return {BaseViewer} Instance of base viewer
     */
    constructor(options) {
        super();
        this.options = options;
        this.repStatuses = [];
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

        // Attempts to load annotations assets and initializes annotations if
        // the assets are available, the showAnnotations flag is true, and the
        // expiring embed is not a shared link
        if (this.areAnnotationsEnabled() && !this.options.sharedLink) {
            this.loadAssets(ANNOTATIONS_JS);
        }
    }

    /**
     * Destroys the viewer
     *
     * @protected
     * @return {void}
     */
    destroy() {
        if (this.repStatuses) {
            this.repStatuses.forEach((repStatus) => {
                repStatus.removeListener('conversionpending', this.resetLoadTimeout);
                repStatus.destroy();
            });
        }

        const { container } = this.options;
        if (container) {
            const annotateButtonEl = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
            if (annotateButtonEl) {
                annotateButtonEl.removeEventListener('click', this.annotateClickHandler);
            }
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
     * @emits Error
     * @return {void}
     */
    resetLoadTimeout = () => {
        clearTimeout(this.loadTimeoutId);
        /* istanbul ignore next */
        this.loadTimeoutId = setTimeout(() => {
            if (document.hidden) {
                this.resetLoadTimeout();
                return;
            }
            if (!this.isLoaded() && !this.isDestroyed()) {
                this.triggerError();
            }
        }, this.loadTimeout);
    }

    /**
     * Emits an error when an asset (static or representation) fails to load.
     *
     * @emits error
     * @return {void}
     */
    handleAssetError = () => {
        this.triggerError();
        this.destroyed = true;
    }

    /**
     * Emits error event with refresh message.
     *
     * @protected
     * @emits error
     * @param {Error} [err] - Optional error with message
     * @return {void}
     */
    triggerError(err) {
        this.emit('error', (err instanceof Error) ? err : new Error(__('error_refresh')));
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

        /* istanbul ignore next */
        this.addListener('togglepointannotationmode', () => {
            this.annotator.togglePointModeHandler();
        });

        this.addListener('load', () => {
            if (window.BoxAnnotations && this.areAnnotationsEnabled()) {
                this.loadAnnotator();
            }
        });
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
        const { file, viewer } = this.options;

        super.emit(event, data);
        super.emit('viewerevent', {
            event,
            data,
            viewerName: viewer ? viewer.NAME : '',
            fileId: file.id
        });
    }

    /**
     * Handles the beginning of a pinch to zoom event on mobile.
     * Although W3 strongly discourages the prevention of pinch to zoom,
     * we still meet the WCAG's requirement of a 200% zoom on text.
     *
     * @protected
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
     * @protected
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
     * @protected
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
        const { viewers, viewer } = this.options;
        if (viewers && viewers[viewer.NAME]) {
            return viewers[viewer.NAME][option];
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

    /**
     * Instantiates and returns RepStatus
     *
     * @param {Object} [representation] - Optional representation
     * @return {RepStatus} Instance of RepStatus
     */
    getRepStatus(representation) {
        const { token, sharedLink, sharedLinkPassword, logger } = this.options;
        const repStatus = new RepStatus({
            representation: representation || this.options.representation,
            token,
            sharedLink,
            sharedLinkPassword,
            logger: representation ? null : logger // Do not log to main preview status if rep is passed in
        });

        // Don't time out while conversion is pending
        repStatus.addListener('conversionpending', this.resetLoadTimeout);

        this.repStatuses.push(repStatus);
        return repStatus;
    }

    /**
     * Returns if representation status is considered success
     *
     * @param {Object} representation - Representation to check
     * @return {boolean} Whether status is considered successful
     */
    isRepresentationReady(representation) {
        const status = RepStatus.getStatus(representation);
        return status === STATUS_SUCCESS || status === STATUS_VIEWABLE;
    }

    //--------------------------------------------------------------------------
    // Annotations
    //--------------------------------------------------------------------------

    /**
     * Loads the appropriate annotator and loads the file's annotations
     *
     * @protected
     * @return {void}
     */
    loadAnnotator() {
        /* global BoxAnnotations */
        const boxAnnotations = new BoxAnnotations();

        this.annotatorConf = boxAnnotations.determineAnnotator(this.options.viewer.NAME);
        if (!this.annotatorConf) {
            return;
        }

        if (this.isAnnotatable()) {
            const { file } = this.options;

            // Users can currently only view annotations on mobile
            this.canAnnotate = checkPermission(file, PERMISSION_ANNOTATE) && !Browser.isMobile();
            if (this.canAnnotate) {
                this.showAnnotateButton(this.getPointModeClickHandler());
            }
            this.initAnnotations();
        }
    }

    /**
     * Initializes annotations.
     *
     * @protected
     * @return {void}
     */
    initAnnotations() {
        const { apiHost, container, file, location, token } = this.options;
        const { id: fileId, file_version: { id: fileVersionId } } = file;

        // Construct and init annotator
        this.annotator = new this.annotatorConf.CONSTRUCTOR({
            canAnnotate: this.canAnnotate,
            container,
            options: {
                apiHost,
                fileId,
                token
            },
            fileVersionId,
            locale: location.locale
        });
        this.annotator.init();
    }

    /**
     * Returns whether or not viewer both supports annotations and has
     * annotations enabled. If an optional type is passed in, we check if that
     * type of annotation is allowed.
     *
     * @param {string} [type] - Type of annotation
     * @return {boolean} Whether or not viewer is annotatable
     */
    isAnnotatable(type) {
        const { TYPE: annotationTypes } = this.annotatorConf;
        if (type && annotationTypes) {
            if (!annotationTypes.some((annotationType) => type === annotationType)) {
                return false;
            }
        }

        // Return whether or not annotations are enabled for this viewer
        return this.areAnnotationsEnabled();
    }

    /**
     * Returns whether or not annotations are enabled for this viewer.
     *
     * @return {boolean} Whether or not viewer is annotatable
     */
    areAnnotationsEnabled() {
        // Respect viewer-specific annotation option if it is set
        const viewerAnnotations = this.getViewerOption('annotations');
        if (typeof viewerAnnotations === 'boolean') {
            return viewerAnnotations;
        }

        // Otherwise, use global preview annotation option
        return this.options.showAnnotations;
    }

    /**
     * Shows the point annotate button.
     *
     * @param {Function} handler - Annotation button handler
     * @return {void}
     */
    showAnnotateButton(handler) {
        this.annotateClickHandler = handler;
        const { container } = this.options;
        const annotateButtonEl = container.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
        if (!annotateButtonEl) {
            return;
        }

        annotateButtonEl.title = __('annotation_point_toggle');
        annotateButtonEl.classList.remove(CLASS_HIDDEN);
        annotateButtonEl.addEventListener('click', this.annotateClickHandler);
    }

    /**
     * Returns click handler for toggling point annotation mode.
     *
     * @param {HTMLElement} containerEl - Preview container element
     * @return {Function|null} Click handler
     */
    /* eslint-disable no-unused-vars */
    getPointModeClickHandler(containerEl) {}
    /* eslint-enable no-unused-vars */
}

export default BaseViewer;
