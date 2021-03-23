import EventEmitter from 'events';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import fullscreen from '../Fullscreen';
import intlUtil from '../i18n';
import RepStatus from '../RepStatus';
import Browser from '../Browser';
import {
    getProp,
    appendQueryParams,
    appendAuthParams,
    createContentUrl,
    getHeaders,
    loadStylesheets,
    loadScripts,
    prefetchAssets,
    createAssetUrlCreator,
    replacePlaceholders,
} from '../util';
import {
    ANNOTATOR_EVENT,
    CLASS_ANNOTATIONS_CREATE_DRAWING,
    CLASS_ANNOTATIONS_CREATE_HIGHLIGHT,
    CLASS_ANNOTATIONS_CREATE_REGION,
    CLASS_ANNOTATIONS_DISCOVERABLE,
    CLASS_BOX_PREVIEW_MOBILE,
    FILE_OPTION_START,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT,
    SELECTOR_BOX_PREVIEW_CONTENT,
    SELECTOR_BOX_PREVIEW,
    STATUS_SUCCESS,
    STATUS_VIEWABLE,
} from '../constants';
import { EXCLUDED_EXTENSIONS } from '../extensions';
import { VIEWER_EVENT, ERROR_CODE, LOAD_METRIC, DOWNLOAD_REACHABILITY_METRICS } from '../events';
import AnnotationControlsFSM, { AnnotationInput, AnnotationMode } from '../AnnotationControlsFSM';
import AnnotationModule from '../AnnotationModule';
import PreviewError from '../PreviewError';
import Timer from '../Timer';

const VIEWER_STATUSES = {
    error: 'error',
    loaded: 'loaded',
    loading: 'loading',
};

const ANNOTATION_CLASSES = {
    [AnnotationMode.DRAWING]: CLASS_ANNOTATIONS_CREATE_DRAWING,
    [AnnotationMode.HIGHLIGHT]: CLASS_ANNOTATIONS_CREATE_HIGHLIGHT,
    [AnnotationMode.REGION]: CLASS_ANNOTATIONS_CREATE_REGION,
};

const ANNOTATIONS_JS = 'annotations.js';
const ANNOTATIONS_CSS = 'annotations.css';

const ANNOTATION_TYPE_DRAW = 'draw';
const ANNOTATION_TYPE_POINT = 'point';
const LOAD_TIMEOUT_MS = 180000; // 3m
const RESIZE_WAIT_TIME_IN_MILLIS = 300;
const ANNOTATION_BUTTONS = {
    point: {
        selector: SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT,
        title: __('annotation_point_toggle'),
    },
    draw: {
        selector: SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW,
        title: __('annotation_draw_toggle'),
    },
};

class BaseViewer extends EventEmitter {
    /** @property {Api} - Api instance used for XHR calls */
    api;

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

    /** @property {Object} - Viewer startAt options */
    startAt;

    /** @property {boolean} - Has the viewer retried downloading the content */
    hasRetriedContentDownload = false;

    /** @property {Object} - Keeps track of which metrics have been emitted already */
    emittedMetrics;

    /** @property {HTMLElement} - The root element (.bp) of the viewer (includes the loading wrapper as well as content) */
    rootEl;

    /** @property {HTMLElement} - The .bp-content which is the container for the viewer's content */
    containerEl;

    /** @property {boolean} - Stores whether the Viewer has been setup yet. */
    isSetup = false;

    /**
     * [constructor]
     *
     * @param {Object} options - Some options
     * @return {BaseViewer} Instance of base viewer
     */
    constructor(options) {
        super();
        this.options = options;
        this.api = options.api;
        this.cache = options.cache;
        this.previewUI = options.ui;
        this.repStatuses = [];
        this.isMobile = Browser.isMobile();
        this.hasTouch = Browser.hasTouch();

        this.emittedMetrics = {};

        this.annotationControlsFSM = new AnnotationControlsFSM();

        this.annotationModule = new AnnotationModule({ cache: this.cache });

        // Bind context for callbacks
        this.resetLoadTimeout = this.resetLoadTimeout.bind(this);
        this.preventDefault = this.preventDefault.bind(this);
        this.debouncedResizeHandler = this.getResizeHandler().bind(this);
        this.handleAssetError = this.handleAssetError.bind(this);
        this.toggleFullscreen = this.toggleFullscreen.bind(this);
        this.mobileZoomStartHandler = this.mobileZoomStartHandler.bind(this);
        this.mobileZoomChangeHandler = this.mobileZoomChangeHandler.bind(this);
        this.mobileZoomEndHandler = this.mobileZoomEndHandler.bind(this);
        this.handleAnnotatorEvents = this.handleAnnotatorEvents.bind(this);
        this.handleAnnotationControlsEscape = this.handleAnnotationControlsEscape.bind(this);
        this.handleFullscreenEnter = this.handleFullscreenEnter.bind(this);
        this.handleFullscreenExit = this.handleFullscreenExit.bind(this);
        this.createAnnotator = this.createAnnotator.bind(this);
        this.viewerLoadHandler = this.viewerLoadHandler.bind(this);
        this.initAnnotations = this.initAnnotations.bind(this);
        this.loadBoxAnnotations = this.loadBoxAnnotations.bind(this);
        this.createViewer = this.createViewer.bind(this);
    }

    /**
     * Sets up the viewer and its DOM
     *
     * @return {void}
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        if (this.options.file) {
            this.startAt = getProp(this.options, `fileOptions.${this.options.file.id}.${FILE_OPTION_START}`, {});
        }

        // Get the container dom element if selector was passed, in tests
        let { container } = this.options;
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        this.rootEl = container.querySelector(SELECTOR_BOX_PREVIEW);

        // From the perspective of viewers bp-content holds everything
        this.containerEl = container.querySelector(SELECTOR_BOX_PREVIEW_CONTENT);

        // Attach event listeners
        this.addCommonListeners();

        // Timeout for loading the preview
        this.loadTimeout = LOAD_TIMEOUT_MS;

        // For mobile browsers add mobile class just in case viewers need it
        if (this.isMobile) {
            this.rootEl.classList.add(CLASS_BOX_PREVIEW_MOBILE);
        }

        // Creates a promise that the annotator will be constructed if annotations are
        // enabled and the expiring embed is not a shared link
        if (this.areAnnotationsEnabled() && !this.options.sharedLink) {
            this.annotatorPromise = new Promise(resolve => {
                this.annotatorPromiseResolver = resolve;
            });
        }

        if (this.options.enableAnnotationsDiscoverability && this.containerEl) {
            this.containerEl.classList.add(CLASS_ANNOTATIONS_DISCOVERABLE);
        }

        this.isSetup = true;
    }

    /**
     * Destroys the viewer
     *
     * @protected
     * @return {void}
     */
    destroy() {
        if (this.repStatuses) {
            this.repStatuses.forEach(repStatus => {
                repStatus.removeListener('conversionpending', this.resetLoadTimeout);
                repStatus.destroy();
            });
        }

        if (this.annotationControls) {
            this.annotationControls.destroy();
        }

        fullscreen.removeAllListeners();
        document.defaultView.removeEventListener('resize', this.debouncedResizeHandler);
        this.removeAllListeners();

        if (this.containerEl) {
            this.containerEl.removeEventListener('contextmenu', this.preventDefault);
            this.containerEl.innerHTML = '';
            this.containerEl.classList.remove(CLASS_ANNOTATIONS_DISCOVERABLE);
        }

        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            try {
                this.annotator.removeAllListeners();
                this.annotator.destroy();
            } catch (error) {
                // No-op, as annotator was likely never initialized in the first place
            }
        }

        this.destroyed = true;
        this.annotatorPromise = null;
        this.annotatorPromiseResolver = null;
        this.emittedMetrics = null;
        this.emit('destroy');
    }

    /**
     * Resize handler
     *
     * @private
     * @return {Function} debounced resize handler
     */
    getResizeHandler() {
        return debounce(() => {
            this.resize();
        }, RESIZE_WAIT_TIME_IN_MILLIS);
    }

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
    resetLoadTimeout() {
        clearTimeout(this.loadTimeoutId);
        /* istanbul ignore next */
        this.loadTimeoutId = setTimeout(() => {
            if (document.hidden) {
                this.resetLoadTimeout();
                return;
            }

            if (!this.isLoaded() && !this.isDestroyed()) {
                const error = new PreviewError(ERROR_CODE.VIEWER_LOAD_TIMEOUT, __('error_refresh'));
                this.triggerError(error);
            }
        }, this.loadTimeout);
    }

    /**
     * Start the load timer for contentLoadTime event.
     *
     * @protected
     * @return {void}
     */
    startLoadTimer() {
        const { file } = this.options;
        const tag = Timer.createTag(file.id, LOAD_METRIC.contentLoadTime);
        Timer.start(tag);
    }

    /**
     * Triggers an error when an asset (static or representation) fails to load.
     *
     * @param {string} [err] - Optional error message
     * @return {void}
     */
    handleAssetError(err) {
        const originalMessage = err ? err.message : '';
        const error = err instanceof PreviewError ? err : new PreviewError(ERROR_CODE.LOAD_ASSET, originalMessage, {});
        this.triggerError(error);
        this.destroyed = true;
    }

    /**
     * Handles a download error when using a non default host.
     *
     * @param {Error} err - Load error
     * @param {string} downloadURL - download URL
     * @return {void}
     */
    handleDownloadError(err, downloadURL) {
        const isRepDeleted = getProp(err, 'details.isRepDeleted', false);

        if (this.hasRetriedContentDownload || isRepDeleted) {
            this.triggerError(err);
            return;
        }

        if (this.api.reachability.constructor.isCustomDownloadHost(downloadURL)) {
            this.api.reachability.setDownloadReachability(downloadURL).then(isBlocked => {
                if (isBlocked) {
                    this.emitMetric(
                        DOWNLOAD_REACHABILITY_METRICS.DOWNLOAD_BLOCKED,
                        this.api.reachability.constructor.getHostnameFromUrl(downloadURL),
                    );
                }
            });
        }

        this.hasRetriedContentDownload = true;
        this.load();
    }

    /**
     * Emits error event with refresh message.
     *
     * @protected
     * @emits error
     * @param {Error|PreviewError} [err] - Error object related to the error that happened.
     * @return {void}
     */
    triggerError(err) {
        const message = err ? err.message : '';
        const error =
            err instanceof PreviewError
                ? err
                : new PreviewError(ERROR_CODE.LOAD_VIEWER, __('error_refresh'), {}, message);

        this.emit('error', error);
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
        if (this.hasRetriedContentDownload) {
            // eslint-disable-next-line
            template = this.api.reachability.constructor.replaceDownloadHostWithDefault(template);
        }

        // Append optional query params
        const { queryParams } = this.options;
        return appendQueryParams(createContentUrl(template, asset), queryParams);
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
        const urlWithAuthParams = this.appendAuthParams(this.createContentUrl(template, asset));

        // Append optional query params
        const { queryParams } = this.options;
        return appendQueryParams(urlWithAuthParams, queryParams);
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
        // Attach full screen event listeners
        fullscreen.addListener('enter', this.handleFullscreenEnter);
        fullscreen.addListener('exit', this.handleFullscreenExit);

        // Add a resize handler for the window
        document.defaultView.addEventListener('resize', this.debouncedResizeHandler);

        const { permissions } = this.options.file;
        if (permissions && !permissions.can_download) {
            this.containerEl.addEventListener('contextmenu', this.preventDefault);
        }

        this.addListener(VIEWER_EVENT.load, this.viewerLoadHandler);
    }

    /**
     * Handles the viewer load to finish viewer setup after loading.
     *
     * @private
     * @param {Object} event - load event data
     * @return {void}
     */
    viewerLoadHandler(event) {
        const contentTemplate = getProp(this.options, 'representation.content.url_template', '');
        const downloadHostToNotify = this.api.reachability.constructor.getDownloadNotificationToShow(contentTemplate);
        if (downloadHostToNotify) {
            this.previewUI.notification.show(
                replacePlaceholders(__('notification_degraded_preview'), [downloadHostToNotify]),
                null,
                true,
            );

            this.api.reachability.constructor.setDownloadHostNotificationShown(downloadHostToNotify);
            this.emitMetric(DOWNLOAD_REACHABILITY_METRICS.NOTIFICATION_SHOWN, {
                host: downloadHostToNotify,
            });
        }

        if (event && event.scale) {
            this.scale = event.scale;
        }

        // Ensures that the annotator has been created first
        if (this.annotatorPromise) {
            this.annotatorPromise.then(this.initAnnotations);
        }
    }

    /**
     * Prevents default behavior.
     *
     * @param {Event} event - Some event
     * @return {void}
     */
    preventDefault(event) {
        event.preventDefault();
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
     * Resize the document depending on fullscreen state
     *
     * @return {void}
     */
    handleFullscreenEnter() {
        this.resize();

        if (this.annotator && this.areNewAnnotationsEnabled()) {
            this.annotator.emit(ANNOTATOR_EVENT.setVisibility, false);
            this.disableAnnotationControls();
        }
    }

    /**
     * Resize the document depending on fullscreen state
     *
     * @return {void}
     */
    handleFullscreenExit() {
        this.resize();

        if (this.annotator && this.areNewAnnotationsEnabled()) {
            this.annotator.emit(ANNOTATOR_EVENT.setVisibility, true);
            this.enableAnnotationControls();
        }
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
            height: document.documentElement.clientHeight,
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
        super.emit(VIEWER_EVENT.default, {
            event,
            data,
            viewerName: viewer ? viewer.NAME : '',
            fileId: file.id,
        });
    }

    /**
     * Emits a viewer metric
     *
     * @protected
     * @emits metric
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @return {void}
     */
    emitMetric(event, data) {
        // If this metric has been emitted already and is on the whitelist of metrics
        // to be emitted only once per session, then do nothing
        if (this.emittedMetrics[event] && this.getMetricsWhitelist().includes(event)) {
            return;
        }

        // Mark that this metric has been emitted
        this.emittedMetrics[event] = true;

        super.emit(VIEWER_EVENT.metric, {
            event,
            data,
        });
    }

    /**
     * Method which returns the list of metrics to be emitted only once
     * @return {Array} - the array of metric names to be emitted only once
     */
    getMetricsWhitelist() {
        return [];
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
                    1: [event.touches[1].clientX, event.touches[1].clientY],
                },
                end: {},
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
            1: [event.touches[1].clientX, event.touches[1].clientY],
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
                            (this._pinchScale.initial[0][1] - this._pinchScale.initial[1][1]),
                );
                const finalDistance = Math.sqrt(
                    (this._pinchScale.end[0][0] - this._pinchScale.end[1][0]) *
                        (this._pinchScale.end[0][0] - this._pinchScale.end[1][0]) +
                        (this._pinchScale.end[0][1] - this._pinchScale.end[1][1]) *
                            (this._pinchScale.end[0][1] - this._pinchScale.end[1][1]),
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
     * @return {Object|undefined} Value of a viewer option
     */
    getViewerOption(option) {
        const { viewers, viewer } = this.options;
        const viewerName = getProp(viewer, 'NAME');
        return getProp(viewers, `${viewerName}.${option}`);
    }

    /**
     * Loads assets needed for a viewer
     *
     * @protected
     * @param {Array} [js] - JS assets
     * @param {Array} [css] - CSS assets
     * @param {boolean} [isViewerAsset] - Whether we are loading a third party viewer asset
     * @return {Promise} Promise to load scripts
     */
    loadAssets(js, css, isViewerAsset = true) {
        // Create an asset path creator function
        const { location } = this.options;
        const assetUrlCreator = createAssetUrlCreator(location);

        // 1st load the stylesheets needed for this preview
        loadStylesheets((css || []).map(assetUrlCreator));

        // Then load the scripts needed for this preview
        const disableAMD = isViewerAsset && this.options.fixDependencies;
        return loadScripts((js || []).map(assetUrlCreator), disableAMD).then(() => {
            if (isViewerAsset) {
                this.emit('assetsloaded');
            }
        });
    }

    /**
     * Prefetches assets needed for a viewer
     *
     * @protected
     * @param {Array} [js] - js assets
     * @param {Array} [css] - css assets
     * @param {boolean} preload - Use preload instead of prefetch, default false
     * @return {void}
     */
    prefetchAssets(js, css, preload = false) {
        // Create an asset path creator function
        const { location } = this.options;
        const assetUrlCreator = createAssetUrlCreator(location);

        // Prefetch the stylesheets needed for this preview
        prefetchAssets((css || []).map(assetUrlCreator), preload);

        // Prefetch the scripts needed for this preview
        prefetchAssets((js || []).map(assetUrlCreator), preload);
    }

    /**
     * Instantiates and returns RepStatus
     *
     * @param {Object} [representation] - Optional representation
     * @return {RepStatus} Instance of RepStatus
     */
    getRepStatus(representation) {
        const { token, sharedLink, sharedLinkPassword, logger, file } = this.options;
        const repStatus = new RepStatus({
            api: this.api,
            representation: representation || this.options.representation,
            token,
            sharedLink,
            sharedLinkPassword,
            fileId: file.id,
            logger: representation ? null : logger, // Do not log to main preview status if rep is passed in
        });

        // Don't time out while conversion is pending
        repStatus.addListener('conversionpending', this.resetLoadTimeout);

        this.repStatuses.push(repStatus);
        return repStatus;
    }

    /**
     * Returns a string representing the viewer's loading status. Either loading, loaded, or error
     *
     * @public
     * @return {string} A string representing the viewer's load status
     */
    getLoadStatus() {
        if (this.loaded) {
            return this.options.viewer.NAME === 'Error' ? VIEWER_STATUSES.error : VIEWER_STATUSES.loaded;
        }

        return VIEWER_STATUSES.loading;
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

    /**
     * Returns the representation used for Preview.
     *
     * @return {Object} Box representation used/to be used by Preview
     */
    getRepresentation() {
        return this.options.representation;
    }

    /**
     * Returns the asset path to access representation content for Preview.
     *
     * @return {string} Asset path
     */
    getAssetPath() {
        return getProp(this, 'options.viewer.ASSET', '');
    }

    //--------------------------------------------------------------------------
    // Annotations
    //--------------------------------------------------------------------------

    disableAnnotationControls() {
        if (!this.areNewAnnotationsEnabled()) {
            return;
        }

        if (this.annotator) {
            this.annotator.toggleAnnotationMode(AnnotationMode.NONE);
        }

        if (this.annotationControls) {
            this.annotationControls.toggle(false);
        }

        this.processAnnotationModeChange(this.annotationControlsFSM.transition(AnnotationInput.RESET));
    }

    enableAnnotationControls() {
        if (this.annotationControls && this.areNewAnnotationsEnabled()) {
            this.annotationControls.toggle(true);
        }
    }

    /**
     * Loads the BoxAnnotations static assets
     *
     * @protected
     * @return {Promise} promise that is resolved when the assets are loaded
     */
    loadBoxAnnotations() {
        if (
            !this.areAnnotationsEnabled() ||
            (window.BoxAnnotations && this.options.boxAnnotations instanceof window.BoxAnnotations)
        ) {
            return Promise.resolve();
        }

        return this.loadAssets([ANNOTATIONS_JS], [ANNOTATIONS_CSS], false);
    }

    /**
     * Creates an instance of BoxAnnotations if one isn't passed in to the preview options
     * and instantiates the appropriate annotator
     *
     * @protected
     * @return {void}
     */
    createAnnotator() {
        if (!this.areAnnotationsEnabled()) {
            return;
        }

        // Set viewer-specific annotation options
        const viewerOptions = {};
        viewerOptions[this.options.viewer.NAME] = this.viewerConfig;

        if (!global.BoxAnnotations) {
            const error = new PreviewError(ERROR_CODE.LOAD_ANNOTATIONS, __('annotations_load_error'), { silent: true });
            this.previewUI.notification.show(error.displayMessage);
            this.triggerError(error);
            return;
        }

        const boxAnnotations = this.options.boxAnnotations || new global.BoxAnnotations(viewerOptions);
        this.annotatorConf = boxAnnotations.determineAnnotator(this.options, this.viewerConfig);

        if (!this.annotatorConf) {
            return;
        }

        const options = boxAnnotations.getOptions && boxAnnotations.getOptions();

        const annotatorOptions = this.createAnnotatorOptions({
            annotator: this.annotatorConf,
            features: options && options.features,
            initialColor: this.annotationModule.getColor(),
            initialMode: this.getInitialAnnotationMode(),
            intl: (options && options.intl) || intlUtil.createAnnotatorIntl(),
            modeButtons: ANNOTATION_BUTTONS,
        });

        this.annotator = new this.annotatorConf.CONSTRUCTOR(annotatorOptions);

        this.emit('annotator_create', this.annotator);

        if (this.annotatorPromiseResolver) {
            this.annotatorPromiseResolver();
        }
    }

    getInitialAnnotationMode() {
        return AnnotationMode.NONE;
    }

    /**
     * Initializes annotations.
     *
     * @protected
     * @return {void}
     */
    initAnnotations() {
        // Annotations must be loaded and ready before scrolling can occur on a deep-linked annotation.
        this.annotator.addListener('annotations_initialized', this.handleAnnotationsInitialized);

        this.annotator.init(this.scale);

        // Once the annotator instance has been created, emit it so that clients can attach their events.
        // Annotator object will still be sent along with the viewer in the load event also.
        this.emit('annotator', this.annotator);

        // Add a custom listener for entering/exit annotations mode using the app's
        // custom annotations buttons
        this.addListener('toggleannotationmode', data => this.annotator.toggleAnnotationMode(data));

        // Add a custom listener for events related to scaling/orientation changes
        this.addListener('scale', data => {
            this.annotator.emit(ANNOTATOR_EVENT.scale, data);
        });

        // Add a custom listener to scroll to the specified annotation
        this.addListener('scrolltoannotation', this.handleScrollToAnnotation);

        // Add a custom listener for events emmited by the annotator
        this.annotator.addListener('annotatorevent', this.handleAnnotatorEvents);
    }

    /**
     * Returns whether or not user has permissions to load annotations on the current file
     *
     * @param {Object} permissions Permissions on the current file
     * @return {boolean} Whether or not user has the correct permissions
     */
    hasAnnotationPermissions(permissions) {
        if (!permissions) {
            return false;
        }

        return !!(
            permissions.can_annotate ||
            permissions.can_create_annotations ||
            permissions.can_view_annotations ||
            permissions.can_view_annotations_all ||
            permissions.can_view_annotations_self
        );
    }

    /**
     * Returns whether or not user has permissions to create new annotations on the current file
     *
     * @param {Object} permissions Permissions on the current file
     * @return {boolean} Whether or not user has create permission
     */
    hasAnnotationCreatePermission(permissions = this.options.file.permissions) {
        return !!permissions && !!permissions.can_create_annotations;
    }

    /**
     * Returns whether or not user has permissions to view new annotations on the current file
     *
     * @param {Object} permissions Permissions on the current file
     * @return {boolean} Whether or not user has view permission
     */
    hasAnnotationViewPermission(permissions = this.options.file.permissions) {
        return !!permissions && !!permissions.can_view_annotations;
    }

    /**
     * Handler for annotation toolbar button reset
     *
     * @private
     * @return {void}
     */
    handleAnnotationControlsEscape() {
        this.processAnnotationModeChange(this.annotationControlsFSM.transition(AnnotationInput.RESET));
        this.annotator.toggleAnnotationMode(AnnotationMode.NONE);
    }

    /**
     * Handler for annotation mode change
     * 1. Set annotationsControls mode
     * 2. If discoverability FF is on, add mode classes to container
     *
     * @param {AnnotationMode} mode Next annotation mode
     */
    processAnnotationModeChange = mode => {
        if (!this.areNewAnnotationsEnabled()) {
            return;
        }

        if (this.annotationControls) {
            this.annotationControls.setMode(mode);
        }

        if (this.containerEl) {
            // Remove all annotations create related classes
            Object.values(ANNOTATION_CLASSES).forEach(createClass => this.containerEl.classList.remove(createClass));

            // Apply the mode's related created class
            const className = ANNOTATION_CLASSES[mode];
            if (className) {
                this.containerEl.classList.add(className);
            }
        }

        this.annotator.emit(ANNOTATOR_EVENT.setColor, this.annotationModule.getColor());
    };

    /**
     * Handles the 'scrolltoannotation' event and calls the annotator scroll method
     * @param {string | Object} event - Annotation Event
     * @param {string} event.id - Annotation Id
     * @return {void}
     */
    handleScrollToAnnotation(event) {
        const data = event && event.id ? event.id : event;

        this.annotator.scrollToAnnotation(data);
    }

    /**
     * Handles retrieving the active annotation id from a deep-linked annotation and scrolls to the annotation.
     * @param {Object} event - annotations array from emitted from box-annotations.
     * @param {Array} event.annotations - annotations array from emitted from box-annotations.
     * @return {void}
     */
    handleAnnotationsInitialized = ({ annotations = [] }) => {
        const {
            file: { id },
        } = this.options;

        const activeAnnotationId = getProp(this.options, `fileOptions.${id}.annotations.activeId`, null);
        const annotation = annotations.find(entry => entry.id === activeAnnotationId);

        if (!annotation) {
            return;
        }

        this.handleScrollToAnnotation(annotation);
    };

    /**
     * Returns whether or not annotations are enabled for this viewer.
     *
     * @return {boolean} Whether or not viewer is annotatable
     */
    areAnnotationsEnabled() {
        // Do not attempt to fetch annotations if the user cannot create or view annotations
        const { permissions } = this.options.file;
        if (!this.hasAnnotationPermissions(permissions)) {
            return false;
        }

        const { showAnnotations, showAnnotationsControls } = this.options;

        // If it's new annotations experience
        if (showAnnotations && showAnnotationsControls && !this.areNewAnnotationsEnabled()) {
            return false;
        }

        // Respect viewer-specific annotation option if it is set
        if (
            window.BoxAnnotations &&
            this.options.boxAnnotations instanceof window.BoxAnnotations &&
            this.options.boxAnnotations.viewerOptions
        ) {
            const { boxAnnotations, viewer } = this.options;
            const annotatorConfig = boxAnnotations.viewerOptions[viewer.NAME];
            this.viewerConfig = {
                enabled: annotatorConfig && (annotatorConfig.enabled || annotatorConfig.enabledTypes.length > 0),
            };
        } else {
            this.viewerConfig = this.getViewerAnnotationsConfig();
        }

        if (this.viewerConfig && this.viewerConfig.enabled !== undefined) {
            return this.viewerConfig.enabled;
        }

        // Ignore viewer config if BoxAnnotations was pass into Preview as an option
        // Otherwise, use global preview annotation option
        return !!showAnnotations;
    }

    /**
     * Returns whether or not new annotations are enabled for this viewer.
     * If enabled, a new annotations button will show up in toolbar
     *
     * @return {boolean} Whether or not viewer enables new annotations
     */
    areNewAnnotationsEnabled() {
        const { showAnnotationsControls, file } = this.options;
        const { permissions, extension } = file || {};

        if (!this.hasAnnotationCreatePermission(permissions) && !this.hasAnnotationViewPermission(permissions)) {
            return false;
        }

        // Disable new annotations for spreadsheet formats
        if (EXCLUDED_EXTENSIONS.includes(extension)) {
            return false;
        }

        return showAnnotationsControls;
    }

    /**
     * Get the configuration for viewer annotations and transform if legacy format.
     *
     * @private
     * @return {Object} An object containing configuration properties.
     */
    getViewerAnnotationsConfig() {
        const option = this.getViewerOption('annotations');
        const config = option !== null && option !== undefined ? option : {};

        // Backwards compatability for old boolean flag usage
        if (typeof config === 'boolean') {
            return {
                enabled: config,
            };
        }
        return config;
    }

    /**
     * Handle events emitted by the annotator
     *
     * @private
     * @param {Object} [data] - Annotator event data
     * @param {string} [data.event] - Annotator event
     * @param {string} [data.data] - Annotation event data
     * @return {void}
     */
    handleAnnotatorEvents(data) {
        /* istanbul ignore next */
        switch (data.event) {
            case ANNOTATOR_EVENT.modeEnter:
                this.disableViewerControls();

                if (data.data.mode === ANNOTATION_TYPE_POINT) {
                    this.previewUI.notification.show(__('notification_annotation_point_mode'));
                } else if (data.data.mode === ANNOTATION_TYPE_DRAW) {
                    this.previewUI.notification.show(__('notification_annotation_draw_mode'));
                    this.previewUI.replaceHeader(data.data.headerSelector);
                }
                break;
            case ANNOTATOR_EVENT.modeExit:
                this.enableViewerControls();
                this.previewUI.notification.hide();

                if (data.data.mode === ANNOTATION_TYPE_DRAW) {
                    this.previewUI.replaceHeader(data.data.headerSelector);
                }
                break;
            case ANNOTATOR_EVENT.error:
                this.previewUI.notification.show(data.data);
                break;
            case ANNOTATOR_EVENT.fetch:
                this.emit('scale', {
                    scale: this.scale,
                    rotationAngle: this.rotationAngle,
                });
                break;
            default:
        }

        // Emit all annotation events to Preview
        this.emit(data.event, data.data);
        this.emit('annotatorevent', data);
    }

    /**
     * Creates combined options to give to the annotator
     *
     * @private
     * @param {Object} moreOptions - Options specified by init()
     * @return {Object} combined options
     */
    createAnnotatorOptions(moreOptions) {
        const localizedStrings = {
            addCommentPlaceholder: __('annotation_add_comment_placeholder'),
            anonymousUserName: __('annotation_anonymous_user_name'),
            authError: __('annotations_authorization_error'),
            cancelButton: __('annotation_cancel'),
            closeButton: __('annotation_close'),
            createError: __('annotations_create_error'),
            deleteButton: __('annotation_delete'),
            deleteConfirmation: __('annotation_delete_confirmation_message'),
            deleteError: __('annotations_delete_error'),
            doneButton: __('annotation_done'),
            drawDelete: __('annotation_draw_delete'),
            drawSave: __('annotation_draw_save'),
            drawToggle: __('annotation_draw_toggle'),
            highlightComment: __('annotation_highlight_comment'),
            highlightToggle: __('annotation_highlight_toggle'),
            loadError: __('annotations_load_error'),
            pointToggle: __('annotation_point_toggle'),
            postButton: __('annotation_post'),
            posting: __('annotation_posting_message'),
            profileAlt: __('annotation_profile_alt'),
            replyPlaceholder: __('annotation_reply_placeholder'),
            saveButton: __('annotation_save'),
            whoDrew: __('annotation_who_drew'),
            whoHighlighted: __('annotation_who_highlighted'),
        };
        return cloneDeep({
            ...this.options,
            ...moreOptions,
            hasTouch: this.hasTouch,
            isMobile: this.isMobile,
            locale: this.options.location.locale,
            localizedStrings,
        });
    }

    /**
     * Method that is run after all the assets and rep are loaded. In this
     * base class, it will attempt to load the Box Annotations and create
     * the annotator
     *
     * @return {void}
     */
    handleAssetAndRepLoad() {
        this.loadBoxAnnotations().then(this.createAnnotator);
    }

    /**
     * Method to insert the viewer wrapper
     *
     * @param {HTMLElement} element Element to be inserted into the DOM
     * @return {HTMLElement} inserted element
     */
    createViewer(element) {
        if (!element) {
            return null;
        }

        const firstChildEl = this.containerEl.firstChild;
        let addedElement;

        if (!firstChildEl) {
            addedElement = this.containerEl.appendChild(element);
        } else {
            // Need to insert the viewer wrapper as the first element in the container
            // so that we can perserve the natural stacking context to have the prev/next
            // file buttons on top of the previewed content
            addedElement = this.containerEl.insertBefore(element, firstChildEl);
        }

        return addedElement;
    }
}

export default BaseViewer;
