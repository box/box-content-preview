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
    CLASS_FULLSCREEN_UNSUPPORTED,
    CLASS_HIDDEN,
    CLASS_BOX_PREVIEW_MOBILE,
    SELECTOR_BOX_PREVIEW,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW,
    SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER,
    SELECTOR_BOX_PREVIEW_ICON,
    STATUS_SUCCESS,
    STATUS_VIEWABLE
} from '../constants';
import { ICON_FILE_DEFAULT } from '../icons/icons';

const ANNOTATIONS_JS = ['annotations.js'];
const ANNOTATIONS_CSS = ['annotations.css'];
const ANNOTATION_TYPE_DRAW = 'draw';
const ANNOTATION_TYPE_POINT = 'point';
const LOAD_TIMEOUT_MS = 180000; // 3m
const RESIZE_WAIT_TIME_IN_MILLIS = 300;
const ANNOTATION_MODE_ENTER = 'annotationmodeenter';
const ANNOTATION_MODE_EXIT = 'annotationmodeexit';
const ANNOTATION_BUTTONS = {
    point: {
        title: __('annotation_point_toggle'),
        selector: SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT
    },
    draw: {
        title: __('annotation_draw_toggle'),
        selector: SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW
    }
};

@autobind
class BaseViewer extends EventEmitter {
    /** @property {Controls} - UI used to interact with the document in the viewer */
    controls;

    /** @property {boolean} - Flag for tracking whether or not this viewer has been destroyed */
    destroyed = false;

    /** @property {number} - Number of milliseconds to wait, while loading, until messaging that the viewer took too long to load */
    loadTimeout;

    /** @property {number} - Rotation value in degrees, if rotated */
    rotationAngle = 0;

    /** @property {number} - Zoom scale, if zoomed */
    scale = 1;

    /** @property {string} - Viewer-specific file loading icon */
    fileLoadingIcon;

    /** @property {Object} - Viewer options */
    options;

    /** @property {Cache} - Preview's cache instance */
    cache;

    /** @property {PreviewUI} - Preview's UI instance */
    previewUI;

    /** @property {RepStatus[]} - Collection of representation status checkers */
    repStatuses;

    /** @property {boolean} - Whether viewer is being used on a mobile device */
    isMobile;

    /** @property {boolean} - Whether viewer is being used on a touch device */
    hasTouch;

    /**
     * [constructor]
     *
     * @param {Object} options - Some options
     * @return {BaseViewer} Instance of base viewer
     */
    constructor(options) {
        super();
        this.options = options;
        this.cache = options.cache;
        this.previewUI = options.ui;
        this.repStatuses = [];
        this.isMobile = Browser.isMobile();
        this.hasTouch = Browser.hasTouch();
    }

    /**
     * Sets up the viewer and its DOM
     *
     * @return {void}
     */
    setup() {
        this.finishLoadingSetup();

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
        if (this.isMobile) {
            this.containerEl.classList.add(CLASS_BOX_PREVIEW_MOBILE);
        }

        // Attempts to load annotations assets and initializes annotations if
        // the assets are available, the showAnnotations flag is true, and the
        // expiring embed is not a shared link
        if (this.areAnnotationsEnabled() && !this.options.sharedLink) {
            this.annotationsPromise = this.loadAssets(ANNOTATIONS_JS, ANNOTATIONS_CSS);
        }
    }

    /**
     * Removes the crawler and sets the file type specific loading icon
     *
     * @return {void}
     */
    finishLoadingSetup() {
        const { container } = this.options;
        const crawler = container.querySelector(SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER);
        if (crawler) {
            crawler.classList.add(CLASS_HIDDEN);
        }

        const iconWrapperEl = container.querySelector(SELECTOR_BOX_PREVIEW_ICON);
        iconWrapperEl.innerHTML = this.fileLoadingIcon || ICON_FILE_DEFAULT;
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

        fullscreen.removeAllListeners();
        document.defaultView.removeEventListener('resize', this.debouncedResizeHandler);
        this.removeAllListeners();

        if (this.containerEl) {
            this.containerEl.innerHTML = '';
        }

        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.removeAllListeners();
            this.annotator.destroy();
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
    };

    /**
     * Emits an error when an asset (static or representation) fails to load.
     *
     * @emits error
     * @return {void}
     */
    handleAssetError = () => {
        this.triggerError();
        this.destroyed = true;
    };

    /**
     * Emits error event with refresh message.
     *
     * @protected
     * @emits error
     * @param {Error} [err] - Optional error with message
     * @return {void}
     */
    triggerError(err) {
        this.emit('error', err instanceof Error ? err : new Error(__('error_refresh')));
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
        fullscreen.addListener('enter', this.onFullscreenToggled);
        fullscreen.addListener('exit', this.onFullscreenToggled);

        // Add a resize handler for the window
        document.defaultView.addEventListener('resize', this.debouncedResizeHandler);

        this.addListener('load', (event) => {
            if (event && event.scale) {
                this.scale = event.scale;
            }

            if (this.annotationsPromise) {
                this.annotationsPromise.then(this.loadAnnotator);
            }
        });
    }

    /**
     * Enters or exits fullscreen
     *
     * @protected
     * @return {void}
     */
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl);
    }

    /**
     * Applies appropriate styles and resizes the document depending on fullscreen state
     *
     * @return {void}
     */
    onFullscreenToggled() {
        this.containerEl.classList.toggle(CLASS_FULLSCREEN);
        if (!fullscreen.isSupported()) {
            this.containerEl.classList.toggle(CLASS_FULLSCREEN_UNSUPPORTED);
        }

        this.resize();
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
                    (this._pinchScale.initial[0][0] - this._pinchScale.initial[1][0]) *
                        (this._pinchScale.initial[0][0] - this._pinchScale.initial[1][0]) +
                        (this._pinchScale.initial[0][1] - this._pinchScale.initial[1][1]) *
                            (this._pinchScale.initial[0][1] - this._pinchScale.initial[1][1])
                );
                const finalDistance = Math.sqrt(
                    (this._pinchScale.end[0][0] - this._pinchScale.end[1][0]) *
                        (this._pinchScale.end[0][0] - this._pinchScale.end[1][0]) +
                        (this._pinchScale.end[0][1] - this._pinchScale.end[1][1]) *
                            (this._pinchScale.end[0][1] - this._pinchScale.end[1][1])
                );
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

    /**
     * Disables viewer controls
     *
     * @return {void}
     */
    disableViewerControls() {
        if (this.controls) {
            this.controls.disable();
        }
    }

    /**
     * Enables viewer controls
     *
     * @return {void}
     */
    enableViewerControls() {
        if (this.controls) {
            this.controls.enable();
        }
    }

    //--------------------------------------------------------------------------
    // Annotations
    //--------------------------------------------------------------------------

    /**
     * Get the configuration for viewer annotations and transform if legacy format.
     *
     * @return {Object} An object containing configuration properties.
     */
    getViewerAnnotationsConfig() {
        const config = this.getViewerOption('annotations') || {};

        // Backwards compatability for old boolean flag usage
        if (typeof config === 'boolean') {
            return {
                enabled: config
            };
        }

        return config;
    }

    /**
     * Loads the appropriate annotator and loads the file's annotations
     *
     * @protected
     * @return {void}
     */
    loadAnnotator() {
        // Do nothing if annotations are disabled for the viewer
        if (!this.areAnnotationsEnabled()) {
            return;
        }

        /* global BoxAnnotations */
        const boxAnnotations = new BoxAnnotations();
        // #TODO(@spramod|@jholdstock): remove this after we have annotation instancing
        const viewerName = this.options.viewer.NAME;
        const annotationsConfig = this.getViewerAnnotationsConfig();

        this.annotatorConf = boxAnnotations.determineAnnotator(viewerName, undefined, annotationsConfig);
        if (!this.annotatorConf) {
            return;
        }

        const { file } = this.options;
        this.canAnnotate = checkPermission(file, PERMISSION_ANNOTATE);

        if (this.canAnnotate) {
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
                annotator: this.annotatorConf,
                apiHost,
                fileId,
                token
            },
            fileVersionId,
            isMobile: this.isMobile,
            hasTouch: this.hasTouch,
            locale: location.locale,
            previewUI: this.previewUI,
            modeButtons: ANNOTATION_BUTTONS
        });
        this.annotator.init(this.scale);

        // Add a custom listener for entering/exit annotations mode using the app's custom annotations buttons
        this.addListener('toggleannotationmode', (data) => {
            this.annotator.toggleAnnotationHandler(data);
        });

        // Add a custom listener for events related to scaling/orientation changes
        this.addListener('scale', (data) => {
            this.annotator.emit('scaleAnnotations', data);
        });

        // Add a custom listener for events emmited by the annotator
        this.annotator.addListener('annotatorevent', this.handleAnnotatorNotifications);
    }

    /**
     * Returns whether or not annotations are enabled for this viewer.
     *
     * @return {boolean} Whether or not viewer is annotatable
     */
    areAnnotationsEnabled() {
        // Respect viewer-specific annotation option if it is set
        const viewerAnnotations = this.getViewerAnnotationsConfig();

        if (viewerAnnotations && viewerAnnotations.enabled !== undefined) {
            return viewerAnnotations.enabled;
        }

        // Otherwise, use global preview annotation option
        return this.options.showAnnotations;
    }

    /**
     * Handle events emitted by the annotator
     *
     * @private
     * @param {Object} [data] - Annotator event data
     * @param {string} [data.event] - Annotator event
     * @param {string} [data.data] -
     * @return {void}
     */
    handleAnnotatorNotifications(data) {
        /* istanbul ignore next */
        switch (data.event) {
            case ANNOTATION_MODE_ENTER:
                this.disableViewerControls();

                if (data.data === ANNOTATION_TYPE_POINT) {
                    this.emit('notificationshow', __('notification_annotation_point_mode'));
                } else if (data.data === ANNOTATION_TYPE_DRAW) {
                    this.emit('notificationshow', __('notification_annotation_draw_mode'));
                }
                break;
            case ANNOTATION_MODE_EXIT:
                this.enableViewerControls();
                this.emit('notificationhide');
                break;
            case 'annotationerror':
                this.emit('notificationshow', data.data);
                break;
            case 'annotationsfetched':
                this.emit('scale', {
                    scale: this.scale,
                    rotationAngle: this.rotationAngle
                });
                break;
            default:
                this.emit(data.event, data.data);
                this.emit('annotatorevent', data);
                break;
        }
    }
}

export default BaseViewer;
