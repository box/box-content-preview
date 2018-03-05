import EventEmitter from 'events';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import fullscreen from '../Fullscreen';
import RepStatus from '../RepStatus';
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
    replacePlaceholders
} from '../util';

import {
    setDownloadReachability,
    isCustomDownloadHost,
    replaceDownloadHostWithDefault,
    setDownloadHostNotificationShown,
    downloadNotificationToShow,
    getHostnameFromUrl
} from '../downloadReachability';

import Browser from '../Browser';
import {
    CLASS_FULLSCREEN,
    CLASS_FULLSCREEN_UNSUPPORTED,
    CLASS_HIDDEN,
    CLASS_BOX_PREVIEW_MOBILE,
    FILE_OPTION_START,
    SELECTOR_BOX_PREVIEW,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_POINT,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE_DRAW,
    SELECTOR_BOX_PREVIEW_CRAWLER_WRAPPER,
    SELECTOR_BOX_PREVIEW_ICON,
    STATUS_SUCCESS,
    STATUS_VIEWABLE
} from '../constants';
import { getIconFromExtension, getIconFromName } from '../icons/icons';
import { VIEWER_EVENT, ERROR_CODE, LOAD_METRIC, DOWNLOAD_REACHABILITY_METRICS } from '../events';
import PreviewError from '../PreviewError';
import Timer from '../Timer';

const ANNOTATIONS_JS = 'annotations.js';
const ANNOTATIONS_CSS = 'annotations.css';

const ANNOTATION_TYPE_DRAW = 'draw';
const ANNOTATION_TYPE_POINT = 'point';
const LOAD_TIMEOUT_MS = 180000; // 3m
const RESIZE_WAIT_TIME_IN_MILLIS = 300;
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
const ANNOTATOR_EVENT = {
    modeEnter: 'annotationmodeenter',
    modeExit: 'annotationmodeexit',
    fetch: 'annotationsfetched',
    error: 'annotationerror',
    scale: 'scaleannotations'
};

const DEFAULT_FILE_ICON_NAME = 'FILE_DEFAULT';

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

    /** @property {Object} - Viewer startAt options */
    startAt;

    /** @property {boolean} - Has the viewer retried downloading the content */
    hasRetriedContentDownload = false;

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

        // Bind context for callbacks
        this.resetLoadTimeout = this.resetLoadTimeout.bind(this);
        this.preventDefault = this.preventDefault.bind(this);
        this.debouncedResizeHandler = this.getResizeHandler().bind(this);
        this.handleAssetError = this.handleAssetError.bind(this);
        this.toggleFullscreen = this.toggleFullscreen.bind(this);
        this.onFullscreenToggled = this.onFullscreenToggled.bind(this);
        this.mobileZoomStartHandler = this.mobileZoomStartHandler.bind(this);
        this.mobileZoomChangeHandler = this.mobileZoomChangeHandler.bind(this);
        this.mobileZoomEndHandler = this.mobileZoomEndHandler.bind(this);
        this.handleAnnotatorEvents = this.handleAnnotatorEvents.bind(this);
        this.annotationsLoadHandler = this.annotationsLoadHandler.bind(this);
        this.viewerLoadHandler = this.viewerLoadHandler.bind(this);
    }

    /**
     * Sets up the viewer and its DOM
     *
     * @return {void}
     */
    setup() {
        if (this.options.file) {
            const fileExt = this.options.file.extension;
            this.fileLoadingIcon = getIconFromExtension(fileExt);
            this.startAt = getProp(this.options, `fileOptions.${this.options.file.id}.${FILE_OPTION_START}`, {});
        }

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
            this.loadAnnotator();
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
        if (iconWrapperEl) {
            iconWrapperEl.innerHTML = this.fileLoadingIcon || getIconFromName(DEFAULT_FILE_ICON_NAME);
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

        fullscreen.destroy();
        document.defaultView.removeEventListener('resize', this.debouncedResizeHandler);
        this.removeAllListeners();

        if (this.containerEl) {
            this.containerEl.removeEventListener('contextmenu', this.preventDefault);
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
                this.triggerError();
            }
        }, this.loadTimeout);
    }

    /**
     * Start the load timer for fullDocumentLoad event.
     *
     * @protected
     * @return {void}
     */
    startLoadTimer() {
        const tag = Timer.createTag(this.options.file.id, LOAD_METRIC.fullDocumentLoadTime);
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
        const error = new PreviewError(ERROR_CODE.LOAD_ASSET, '', {}, originalMessage);
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
        if (this.hasRetriedContentDownload) {
            this.triggerError(err);
            return;
        }

        this.hasRetriedContentDownload = true;
        this.load();

        if (isCustomDownloadHost(downloadURL)) {
            setDownloadReachability(downloadURL).then((isBlocked) => {
                if (isBlocked) {
                    this.emitMetric(DOWNLOAD_REACHABILITY_METRICS.DOWNLOAD_BLOCKED, getHostnameFromUrl(downloadURL));
                }
            });
        }
    }

    /**
     * Emits error event with refresh message.
     *
     * @protected
     * @emits error
     * @param {Error|string} [err] - Optional error or string with message
     * @return {void}
     */
    triggerError(err) {
        const error =
            err instanceof PreviewError
                ? err
                : new PreviewError(ERROR_CODE.LOAD_VIEWER, __('error_refresh'), {}, err.message);
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
            template = replaceDownloadHostWithDefault(template);
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
        // Attach common full screen event listeners
        fullscreen.addListener('enter', this.onFullscreenToggled);
        fullscreen.addListener('exit', this.onFullscreenToggled);

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
        const contentTemplate = getProp(this.options, 'representation.content.url_template', null);
        const downloadHostToNotify = downloadNotificationToShow(contentTemplate);
        if (downloadHostToNotify) {
            this.previewUI.notification.show(
                replacePlaceholders(__('notification_degraded_preview'), [downloadHostToNotify]),
                __('notification_button_default_text'),
                true
            );

            setDownloadHostNotificationShown(downloadHostToNotify);
            this.emitMetric(DOWNLOAD_REACHABILITY_METRICS.NOTIFICATION_SHOWN, {
                host: downloadHostToNotify
            });
        }

        if (event && event.scale) {
            this.scale = event.scale;
        }

        if (this.annotationsLoadPromise) {
            this.annotationsLoadPromise.then(this.annotationsLoadHandler).catch(() => {});
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
        super.emit(VIEWER_EVENT.default, {
            event,
            data,
            viewerName: viewer ? viewer.NAME : '',
            fileId: file.id
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
        super.emit(VIEWER_EVENT.metric, {
            event,
            data
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
            representation: representation || this.options.representation,
            token,
            sharedLink,
            sharedLinkPassword,
            fileId: file.id,
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
     * Loads the appropriate annotator and loads the file's annotations
     *
     * @protected
     * @return {void}
     */
    loadAnnotator() {
        // Auto-resolves promise if BoxAnnotations is passed in as a Preview option
        this.annotationsLoadPromise =
            window.BoxAnnotations && this.options.boxAnnotations instanceof window.BoxAnnotations
                ? Promise.resolve()
                : this.loadAssets([ANNOTATIONS_JS], [ANNOTATIONS_CSS], false);
    }

    /**
     * Fetches the Box Annotations library. Creates an instance of BoxAnnotations
     * if one isn't passed in to the preview options
     *
     * @protected
     * @return {void}
     */
    annotationsLoadHandler() {
        // Set viewer-specific annotation options
        const viewerOptions = {};
        viewerOptions[this.options.viewer.NAME] = this.viewerConfig;

        if (!global.BoxAnnotations) {
            const error = new PreviewError(ERROR_CODE.LOAD_ANNOTATIONS);
            this.triggerError(error);
            return;
        }

        const boxAnnotations = this.options.boxAnnotations || new global.BoxAnnotations(viewerOptions);
        this.annotatorConf = boxAnnotations.determineAnnotator(this.options, this.viewerConfig);

        if (this.annotatorConf) {
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
        // Construct and init annotator
        const annotatorOptions = this.createAnnotatorOptions({
            annotator: this.annotatorConf,
            modeButtons: ANNOTATION_BUTTONS
        });
        this.annotator = new this.annotatorConf.CONSTRUCTOR(annotatorOptions);
        this.annotator.init(this.scale);

        // Once the annotator instance has been created, emit it so that clients can attach their events.
        // Annotator object will still be sent along with the viewer in the load event also.
        this.emit('annotator', this.annotator);

        // Add a custom listener for entering/exit annotations mode using the app's
        // custom annotations buttons
        this.addListener('toggleannotationmode', (data) => this.annotator.toggleAnnotationMode(data));

        // Add a custom listener for events related to scaling/orientation changes
        this.addListener('scale', (data) => {
            this.annotator.emit(ANNOTATOR_EVENT.scale, data);
        });

        // Add a custom listener to scroll to the specified annotation
        this.addListener('scrolltoannotation', (data) => this.annotator.scrollToAnnotation(data));

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

        const canViewAnnotations = !!(permissions.can_view_annotations_all || permissions.can_view_annotations_self);
        return !permissions.can_annotate && !canViewAnnotations;
    }

    /**
     * Returns whether or not annotations are enabled for this viewer.
     *
     * @return {boolean} Whether or not viewer is annotatable
     */
    areAnnotationsEnabled() {
        // Do not attempt to fetch annotations if the user cannot create or view annotations
        if (!this.hasAnnotationPermissions(this.options.file)) {
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
                enabled: annotatorConfig && (annotatorConfig.enabled || annotatorConfig.enabledTypes.length > 0)
            };
        } else {
            this.viewerConfig = this.getViewerAnnotationsConfig();
        }

        if (this.viewerConfig && this.viewerConfig.enabled !== undefined) {
            return this.viewerConfig.enabled;
        }

        // Ignore viewer config if BoxAnnotations was pass into Preview as an option
        // Otherwise, use global preview annotation option
        return !!this.options.showAnnotations;
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
                enabled: config
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
                    this.emit(VIEWER_EVENT.notificationShow, __('notification_annotation_point_mode'));
                } else if (data.data.mode === ANNOTATION_TYPE_DRAW) {
                    this.emit(VIEWER_EVENT.notificationShow, __('notification_annotation_draw_mode'));
                    this.previewUI.replaceHeader(data.data.headerSelector);
                }
                break;
            case ANNOTATOR_EVENT.modeExit:
                this.enableViewerControls();
                this.emit(VIEWER_EVENT.notificationHide);

                if (data.data.mode === ANNOTATION_TYPE_DRAW) {
                    this.previewUI.replaceHeader(data.data.headerSelector);
                }
                break;
            case ANNOTATOR_EVENT.error:
                this.emit(VIEWER_EVENT.notificationShow, data.data);
                break;
            case ANNOTATOR_EVENT.fetch:
                this.emit('scale', {
                    scale: this.scale,
                    rotationAngle: this.rotationAngle
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
        // Temporary solution for localizing strings in the BoxAnnotations npm package
        // TODO(@spramod): Remove once BoxAnnotations has it's own localization strategy
        const localizedStrings = {
            loadError: __('annotations_load_error'),
            createError: __('annotations_create_error'),
            deleteError: __('annotations_delete_error'),
            authError: __('annotations_authorization_error'),
            doneButton: __('annotation_done'),
            closeButton: __('annotation_close'),
            cancelButton: __('annotation_cancel'),
            saveButton: __('annotation_save'),
            postButton: __('annotation_post'),
            deleteButton: __('annotation_delete'),
            addCommentPlaceholder: __('annotation_add_comment_placeholder'),
            replyPlaceholder: __('annotation_reply_placeholder'),
            deleteConfirmation: __('annotation_delete_confirmation_message'),
            posting: __('annotation_posting_message'),
            profileAlt: __('annotation_profile_alt'),
            anonymousUserName: __('annotation_anonymous_user_name'),
            pointToggle: __('annotation_point_toggle'),
            highlightToggle: __('annotation_highlight_toggle'),
            highlightComment: __('annotation_highlight_comment'),
            whoHighlighted: __('annotation_who_highlighted'),
            drawToggle: __('annotation_draw_toggle'),
            drawSave: __('annotation_draw_save'),
            drawDelete: __('annotation_draw_delete'),
            whoDrew: __('annotation_who_drew')
        };

        return cloneDeep(
            Object.assign({}, this.options, moreOptions, {
                isMobile: this.isMobile,
                hasTouch: this.hasTouch,
                locale: this.options.location.locale,
                localizedStrings
            })
        );
    }
}

export default BaseViewer;
