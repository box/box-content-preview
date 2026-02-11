import noop from 'lodash/noop';
import throttle from 'lodash/throttle';
import {
    ANNOTATOR_EVENT,
    CLASS_DARK,
    CLASS_HIDDEN,
    CLASS_INVISIBLE,
    DISCOVERABILITY_ATTRIBUTE,
    VIDEO_FTUX_CURSOR_SEEN_KEY,
    CLASS_ANNOTATIONS_VIDEO_FTUX_CURSOR_SEEN,
    VIDEO_PLAYER_CONTROL_BAR_HEIGHT,
    MIN_VIDEO_WIDTH_PX,
    PRELOAD_REP_NAME,
} from '../../constants';
import fullscreen from '../../Fullscreen';
import { VIEWER_EVENT } from '../../events';
import { AnnotationInput, AnnotationState } from '../../AnnotationControlsFSM';
import { ICON_PLAY_LARGE, ICON_FORWARD, ICON_BACKWARD } from '../../icons';
import ControlsRoot from '../controls';
import MediaBaseViewer from './MediaBaseViewer';
import VideoPreloader from './VideoPreloader';
import { isWatermarked, getRepresentation } from '../../file';

const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;
const CLASS_PLAY_BUTTON = 'bp-media-play-button';
const CLASS_PLAY_CONTAINER = 'bp-media-overlay-play-container';
const CLASS_PLAY_CONTAINER_PLAY_BUTTON = 'bp-media-overlay-play-button';
const CLASS_SEEK_BUTTON = 'bp-media-overlay-seek-button';
const SMALL_VIDEO_WIDTH_THRESHOLD = 580;
const SPINNER_HALF_SIZE = 40; // Half of the 80px spinner height (defined in _mediaBase.scss)
const VIDEO_ANNOTATIONS_ENABLED = 'videoAnnotations.enabled';

export const DISCOVERABILITY_STATES = [AnnotationState.DRAWING, AnnotationState.NONE, AnnotationState.REGION_TEMP];

class VideoBaseViewer extends MediaBaseViewer {
    videoAnnotationsEnabled = false;

    /** @property {VideoPreloader} - Video preloader instance */
    preloader;

    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for handlers
        this.handleControlsHide = this.handleControlsHide.bind(this);
        this.handleControlsShow = this.handleControlsShow.bind(this);
        this.handlePlayRequest = this.handlePlayRequest.bind(this);
        this.loadeddataHandler = this.loadeddataHandler.bind(this);
        this.pointerHandler = this.pointerHandler.bind(this);
        this.waitingHandler = this.waitingHandler.bind(this);
        this.playingHandler = this.playingHandler.bind(this);
        this.pauseHandler = this.pauseHandler.bind(this);
        this.resize = this.resize.bind(this);
        // Bind context for annotation callbacks
        this.applyCursorFtux = this.applyCursorFtux.bind(this);
        this.handleAnnotationColorChange = this.handleAnnotationColorChange.bind(this);
        this.handleAnnotationControlsClick = this.handleAnnotationControlsClick.bind(this);
        this.handleAnnotationCreateEvent = this.handleAnnotationCreateEvent.bind(this);
        this.scaleAnnotations = this.scaleAnnotations.bind(this);
        this.updateDiscoverabilityResinTag = this.updateDiscoverabilityResinTag.bind(this);
        this.annotationControlsFSM.subscribe(this.applyCursorFtux);
        this.annotationControlsFSM.subscribe(this.updateDiscoverabilityResinTag);
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

        this.videoAnnotationsEnabled = this.featureEnabled(VIDEO_ANNOTATIONS_ENABLED);

        this.isNarrowVideo = false;
        this.userRequestedPlay = false;
        // Video element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('video'));
        this.mediaEl.setAttribute('preload', 'auto');
        // Prevents native iOS UI from taking over
        this.mediaEl.setAttribute('playsinline', '');

        if (!this.useReactControls()) {
            // Play button
            this.playButtonEl = this.mediaContainerEl.appendChild(document.createElement('button'));
            this.playButtonEl.classList.add(CLASS_PLAY_BUTTON);
            this.playButtonEl.classList.add(CLASS_HIDDEN);
            this.playButtonEl.setAttribute('type', 'button');
            this.playButtonEl.setAttribute('title', __('media_play'));
            this.playButtonEl.innerHTML = ICON_PLAY_LARGE;
        }

        // Buffering spinner
        this.bufferingSpinnerEl = this.mediaContainerEl.appendChild(document.createElement('div'));
        this.bufferingSpinnerEl.classList.add('bp-media-buffering-spinner');
        this.bufferingSpinnerEl.classList.add(CLASS_HIDDEN);
        if (this.useReactControls()) {
            // Shift up by half the control bar + half the spinner to visually center above the controls
            this.bufferingSpinnerEl.style.marginTop = `-${VIDEO_PLAYER_CONTROL_BAR_HEIGHT / 2 + SPINNER_HALF_SIZE}px`;
        }

        this.lowerLights();
    }

    /**
     * Loads a media source.
     *
     * @override
     * @return {Promise} Promise to load representations
     */
    load() {
        if (!this.preloader?.wrapperEl) {
            this.showPreload();
        }
        return super.load();
    }

    /**
     * Dismisses the preload thumbnail if it is currently visible. Safe to call
     * multiple times — hidePreload() guards on wrapperEl internally.
     *
     * @private
     * @return {void}
     */
    dismissPreload() {
        if (this.preloader?.wrapperEl) {
            this.hidePreload();
            this.mediaEl.classList.remove(CLASS_INVISIBLE);
            this.resize();
        }
    }

    /**
     * Handles user request to play (image click or play button). Hides preload if visible and sets userRequestedPlay before toggling play.
     *
     * @return {void}
     */
    handlePlayRequest() {
        if (this.preloader) {
            this.preloader.showLoading();
        }
        this.userRequestedPlay = true;
        this.togglePlay();
    }

    /**
     * Shows a preload (thumbnail image) while the full video loads.
     *
     * @return {void}
     */
    showPreload() {
        const { file } = this.options;
        const isWatermarkedFile = isWatermarked(file);

        // Don't show preload for watermarked files
        if (isWatermarkedFile || !this.getViewerOption('preload')) {
            return;
        }

        const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        if (!preloadRep || !this.isRepresentationReady(preloadRep)) {
            return;
        }

        if (!this.preloader) {
            this.preloader = new VideoPreloader({ api: this.api });
            this.preloader.once('preload', () => {
                this.emit(VIEWER_EVENT.default, { event: VIEWER_EVENT.preload, data: {} });
            });
        }

        const { url_template: template } = preloadRep.content;
        const preloadUrlWithAuth = this.createContentUrlWithAuthParams(template);
        const options = {
            onImageClick: () => this.handlePlayRequest(),
        };
        if (this.wrapperEl) {
            const controlsHeight = this.useReactControls() ? VIDEO_PLAYER_CONTROL_BAR_HEIGHT : 0;
            options.viewport = {
                width: this.wrapperEl.clientWidth,
                height: this.wrapperEl.clientHeight - controlsHeight,
            };
        }
        this.preloader.showPreload(preloadUrlWithAuth, this.mediaContainerEl, options);
        this.mediaEl.classList.add(CLASS_INVISIBLE);
    }

    /**
     * Cleans up the preload (thumbnail image). Should be called when video is loaded.
     *
     * @return {void}
     */
    hidePreload() {
        if (this.preloader) {
            this.preloader.hidePreload();
        }
    }

    /**
     * Prefetches video viewer assets and optionally the JPG preload image so it is cached
     * before the user opens the preview (e.g. on hover or adjacent-file prefetch).
     *
     * @param {boolean} [options.assets] - Whether to prefetch static assets (handled by subclasses)
     * @param {boolean} [options.content] - Whether to prefetch rep content (handled by subclasses)
     * @param {boolean} [options.preload] - Whether to prefetch the JPG preload image
     * @return {void}
     */
    // eslint-disable-next-line no-unused-vars -- assets/content handled by subclasses
    prefetch({ assets = true, content = true, preload = false }) {
        if (!preload) {
            return;
        }
        const { file } = this.options;
        if (!file || isWatermarked(file)) {
            return;
        }
        const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        if (!preloadRep || !this.isRepresentationReady(preloadRep) || !preloadRep.content?.url_template) {
            return;
        }
        const preloadUrlWithAuth = this.createContentUrlWithAuthParams(preloadRep.content.url_template);
        this.api.get(preloadUrlWithAuth, { type: 'blob' }).catch(() => {});
    }

    buildPlayButtonWithSeekButtons() {
        this.playContainerEl = this.mediaContainerEl.appendChild(document.createElement('div'));
        this.playContainerEl.classList.add(CLASS_PLAY_CONTAINER);
        this.playContainerEl.classList.add(CLASS_HIDDEN);

        this.seekBackwardButtonEl = this.playContainerEl.appendChild(document.createElement('button'));
        this.seekBackwardButtonEl.classList.add(CLASS_SEEK_BUTTON);
        this.seekBackwardButtonEl.setAttribute('type', 'button');
        this.seekBackwardButtonEl.setAttribute('title', __('media_skip_backward'));
        this.seekBackwardButtonEl.innerHTML = ICON_BACKWARD;

        this.playButtonEl = this.playContainerEl.appendChild(document.createElement('button'));
        this.playButtonEl.classList.add(CLASS_PLAY_CONTAINER_PLAY_BUTTON);
        this.playButtonEl.setAttribute('type', 'button');
        this.playButtonEl.setAttribute('title', __('media_play'));
        this.playButtonEl.innerHTML = ICON_PLAY_LARGE;
        this.playButtonEl.addEventListener('click', this.handlePlayRequest);

        this.seekForwardButtonEl = this.playContainerEl.appendChild(document.createElement('button'));
        this.seekForwardButtonEl.classList.add(CLASS_SEEK_BUTTON);
        this.seekForwardButtonEl.setAttribute('type', 'button');
        this.seekForwardButtonEl.setAttribute('title', __('media_skip_forward'));
        this.seekForwardButtonEl.innerHTML = ICON_FORWARD;
        if (this.seekForwardButtonEl) {
            this.seekForwardButtonEl.addEventListener('click', () => this.movePlayback(true, 5));
        }
        if (this.seekBackwardButtonEl) {
            this.seekBackwardButtonEl.addEventListener('click', () => this.movePlayback(false, 5));
        }
    }

    removePlayButtonWithSeekButtons() {
        if (this.playContainerEl) {
            if (this.seekForwardButtonEl) {
                this.seekForwardButtonEl.removeEventListener('click', () => this.movePlayback(true, 5));
                this.seekForwardButtonEl.remove();
                this.seekForwardButtonEl = null;
            }
            if (this.seekBackwardButtonEl) {
                this.seekBackwardButtonEl.removeEventListener('click', () => this.movePlayback(false, 5));
                this.seekBackwardButtonEl.remove();
                this.seekBackwardButtonEl = null;
            }
            if (this.playButtonEl) {
                this.playButtonEl.removeEventListener('click', this.handlePlayRequest);
                this.playButtonEl.remove();
                this.playButtonEl = null;
            }
            this.playContainerEl.remove();
            this.playContainerEl = null;
        }
    }

    /**
     * [destructor]
     *
     * @override
     * @return {void}
     */
    destroy() {
        if (this.mediaEl) {
            this.mediaEl.removeEventListener('mousemove', this.mousemoveHandler);
            this.mediaEl.removeEventListener('click', this.pointerHandler);
            this.mediaEl.removeEventListener('touchstart', this.pointerHandler);
            this.mediaEl.removeEventListener('waiting', this.waitingHandler);
        }

        if (this.playButtonEl) {
            this.playButtonEl.removeEventListener('click', this.handlePlayRequest);
        }

        if (this.seekForwardButtonEl) {
            this.seekForwardButtonEl.removeEventListener('click', () => this.movePlayback(true, 5));
        }

        if (this.seekBackwardButtonEl) {
            this.seekBackwardButtonEl.removeEventListener('click', () => this.movePlayback(false, 5));
        }

        this.bufferingSpinnerEl = null;

        super.destroy();
    }

    /**
     * Handler for meta data load for the media element.
     *
     * @override
     * @return {void}
     */
    loadeddataHandler() {
        super.loadeddataHandler();

        if (!this.preloader?.wrapperEl) {
            this.mediaEl.classList.remove(CLASS_INVISIBLE);
        }
        this.showPlayButton();

        if (this.userRequestedPlay) {
            this.play();
        }

        if (this.mediaControls) {
            this.mediaControls.show();
        } else if (this.controls && this.controls.controlsLayer) {
            this.showAndHideReactControls();
        }
    }

    showAndHideReactControls(retries = 10) {
        if (this.controls?.controlsLayer?.show && this.controls.controlsLayer.show !== noop) {
            this.controls.controlsLayer.show();
            this.controls.controlsLayer.hide(); // Show controls briefly after content loads
        } else if (retries > 0) {
            setTimeout(() => this.showAndHideReactControls(retries - 1), 100);
        }
    }

    /**
     * @inheritdoc
     */
    loadUI() {
        super.loadUI();
    }

    /**
     * @inheritdoc
     */
    loadUIReact() {
        super.loadUIReact();

        this.controls = new ControlsRoot({
            className: 'bp-VideoControlsRoot',
            containerEl: this.mediaContainerEl,
            fileId: this.options.file.id,
            onHide: this.handleControlsHide,
            onShow: this.handleControlsShow,
        });
        this.renderUI();
    }

    /**
     * Handler for a pointer event on the media element.
     *
     * @param  {Event} event pointer event, either touch or mouse
     * @return {void}
     */
    pointerHandler(event) {
        if (event.type === 'touchstart') {
            // Prevents 'click' event from firing which would pause the video
            event.preventDefault();
            event.stopPropagation();

            if (this.mediaControls) {
                this.mediaControls.toggle();
            }
        } else if (event.type === 'click') {
            this.handlePlayRequest();
        }
    }

    /**
     * Handler for play state
     *
     * @override
     * @return {void}
     */
    playingHandler() {
        this.dismissPreload();
        this.hideBufferingSpinner();
        super.playingHandler();
        this.hidePlayButton();
    }

    /**
     * Handler for pause state
     *
     * @override
     * @return {void}
     */
    pauseHandler() {
        super.pauseHandler();
        this.showPlayButton();
        this.hideLoadingIcon();
        this.hideBufferingSpinner();
    }

    /**
     * Shows the loading indicator.
     *
     * @private
     * @return {void}
     */
    waitingHandler() {
        if (!this.containerEl) return;

        this.showBufferingSpinner();
        this.hidePlayButton();
    }

    showBufferingSpinner() {
        if (this.bufferingSpinnerEl) {
            this.bufferingSpinnerEl.classList.remove(CLASS_HIDDEN);
        }
    }

    hideBufferingSpinner() {
        if (this.bufferingSpinnerEl) {
            this.bufferingSpinnerEl.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @override
     * @return {void}
     */
    addEventListenersForMediaControls() {
        super.addEventListenersForMediaControls();

        /* istanbul ignore next */
        this.mediaControls.on('togglefullscreen', () => {
            this.toggleFullscreen();
        });
    }

    /**
     * Adds event listeners to the media element.
     * Makes changes to the media controls.
     *
     * @override
     * @return {void}
     */
    addEventListenersForMediaElement() {
        super.addEventListenersForMediaElement();

        /* istanbul ignore next */
        this.mousemoveHandler = throttle(() => {
            if (this.mediaControls) {
                this.mediaControls.show();
            }
        }, MOUSE_MOVE_TIMEOUT_IN_MILLIS);

        this.mediaEl.addEventListener('mousemove', this.mousemoveHandler);

        if (this.hasTouch) {
            this.mediaEl.addEventListener('touchstart', this.pointerHandler);
        }

        this.mediaEl.addEventListener('click', this.pointerHandler);
        this.mediaEl.addEventListener('waiting', this.waitingHandler);

        if (this.playButtonEl) {
            this.playButtonEl.addEventListener('click', this.handlePlayRequest);
        }
    }

    /**
     * @inheritdoc
     */
    showLoadingIcon() {
        super.showLoadingIcon();
    }

    /**
     * Resizes the video to be of fixed dimensions.
     * Should work in most common scenarios.
     *
     * @return {void}
     */
    resize() {
        // Reset any prior set widths and heights
        // We are only going to modify the widths and not heights
        // This is because in Chrome its not possible to set a height
        // that larger than the current videoHeight.
        this.mediaEl.style.width = '';
        if (this.mediaContainerEl) {
            this.mediaContainerEl.style.width = '';
            this.mediaContainerEl.style.height = '';
        }

        this.setVideoDimensions();

        // Handle time scrubber resize
        if (this.mediaControls) {
            this.mediaControls.resizeTimeScrubber();
        }

        if (this.annotator) {
            this.scaleAnnotations(this.mediaEl.style.width, this.mediaEl.style.height);
        }
        this.handleNarrowVideoUI();

        super.resize();
    }

    /**
     * Calculates and applies video dimensions based on viewport constraints.
     * Handles three cases: video fits in viewport, fullscreen mode, or overflow.
     *
     * @private
     * @return {void}
     */
    setVideoDimensions() {
        let width = this.videoWidth || 0;
        let height = this.videoHeight || 0;
        const controlsHeight = this.useReactControls() ? VIDEO_PLAYER_CONTROL_BAR_HEIGHT : 0;

        // Calculate the viewport height minus the control bar height if using react controls
        // This is necessary to prevent the control bar from overflowing the viewport when the video scale
        // is expanded.
        const viewport = {
            height: this.wrapperEl.clientHeight - controlsHeight,
            width: this.wrapperEl.clientWidth,
        };

        // We need the width to be atleast wide enough for the controls
        // to not overflow and fit properly
        if (width < MIN_VIDEO_WIDTH_PX) {
            width = MIN_VIDEO_WIDTH_PX;
            height = width / this.aspect;
        }
        if (!fullscreen.isFullscreen(this.containerEl) && width <= viewport.width && height <= viewport.height) {
            // Case 1: The video ends up fitting within the viewport of preview
            // For this case, just set the video player dimensions to match the
            // actual video's dimenstions.
            if (this.aspect >= 1) {
                this.mediaEl.style.width = `${width}px`;
            } else {
                this.mediaEl.style.width = `${height * this.aspect}px`;
            }
        } else {
            // Case 2: The video is now in fullscreen and needs to be scaled
            // Case 3: The video overflows the viewport of preview
            // For this case, try fitting in the video by reducing
            // either its width or its height.

            // If video were to be stretched vertically, then figure out by how much and if that causes the width to overflow
            const percentIncreaseInHeightToFitViewport = (viewport.height - height) / height;
            const newWidthIfHeightUsed = width + width * percentIncreaseInHeightToFitViewport;

            // If video were to be stretched horizontally, then figure out how much and if that causes the height to overflow
            const percentIncreaseInWidthToFitViewport = (viewport.width - width) / width;
            const newHeightIfWidthUsed = height + height * percentIncreaseInWidthToFitViewport;

            // One of the two cases will end up fitting
            if (newHeightIfWidthUsed <= viewport.height) {
                this.mediaEl.style.width = `${viewport.width}px`;
            } else if (newWidthIfHeightUsed <= viewport.width) {
                this.mediaEl.style.width = `${viewport.height * this.aspect}px`;
            }
        }

        if (this.mediaContainerEl && this.mediaEl.style.width) {
            this.mediaContainerEl.style.width = this.mediaEl.style.width;
        }
    }

    /**
     * Handles play button visibility for narrow videos.
     * Shows/hides play button with seek buttons based on video width.
     *
     * @private
     * @return {void}
     */
    handleNarrowVideoUI() {
        if (this.useReactControls()) {
            const mediaElWidthNumber = parseInt(this.mediaEl.style.width, 10);

            if (!Number.isNaN(mediaElWidthNumber)) {
                // check if play and seek buttons exist in the dom
                if (this.playContainerEl && mediaElWidthNumber >= SMALL_VIDEO_WIDTH_THRESHOLD) {
                    this.isNarrowVideo = false;
                    this.removePlayButtonWithSeekButtons();
                    this.renderUI();
                } else if (!this.playContainerEl && mediaElWidthNumber < SMALL_VIDEO_WIDTH_THRESHOLD) {
                    this.buildPlayButtonWithSeekButtons();
                    this.isNarrowVideo = true;
                    this.renderUI();
                }
            }
        }
    }

    /**
     * Function to tell preview if navigation arrows
     * should be shown and won't intefere with viewer
     *
     * @protected
     * @return {boolean} true if arrows should be shown
     */
    allowNavigationArrows() {
        return !this.mediaControls || !this.mediaControls.isSettingsVisible();
    }

    /**
     * Darkens the background of preview.
     * Good for having high contrast videos.
     *
     * @protected
     * @return {void}
     */
    lowerLights() {
        if (this.rootEl) {
            this.rootEl.classList.add(CLASS_DARK);
        }
    }

    /**
     * Auto-play was prevented, try muted play
     *
     * @override
     */
    handleAutoplayFail = () => {
        this.setVolume(0);
        this.play().catch(this.pause);
    };

    handleControlsHide = () => {
        this.mediaContainerEl.classList.remove('bp-media-controls-is-visible');
    };

    handleControlsShow = () => {
        this.mediaContainerEl.classList.add('bp-media-controls-is-visible');
    };

    /**
     * Hides the create region cursor popup for a document
     *
     * @protected
     * @return {void}
     */
    applyCursorFtux() {
        if (!this.containerEl || this.annotationControlsFSM.getState() !== AnnotationState.REGION) {
            return;
        }

        if (this.cache.get(VIDEO_FTUX_CURSOR_SEEN_KEY)) {
            this.containerEl.classList.add(CLASS_ANNOTATIONS_VIDEO_FTUX_CURSOR_SEEN);
        } else {
            this.cache.set(VIDEO_FTUX_CURSOR_SEEN_KEY, true, true);
        }
    }

    handleAnnotationColorChange(color) {
        if (this.annotator) {
            this.annotationModule.setColor(color);
            this.annotator.emit(ANNOTATOR_EVENT.setColor, color);
        }
        this.renderUI();
    }

    /**
     * Handler for annotation controls button click event.
     *
     * @private
     * @param {AnnotationMode} mode one of annotation modes
     * @return {void}
     */
    handleAnnotationControlsClick({ mode }) {
        if (this.annotator) {
            this.mediaEl.pause();
            const nextMode = this.annotationControlsFSM.transition(AnnotationInput.CLICK, mode);

            this.annotator.toggleAnnotationMode(nextMode);

            this.processAnnotationModeChange(nextMode);
        }
    }

    initAnnotations() {
        super.initAnnotations();

        if (this.areNewAnnotationsEnabled() && this.annotator) {
            this.annotator.addListener('annotations_create', this.handleAnnotationCreateEvent);
        }
    }

    scaleAnnotations(width, height) {
        if (!width && !height) {
            return;
        }
        const scale = width ? width / this.videoWidth : height / this.videoHeight;
        this.emit('scale', {
            scale,
            rotationAngle: this.rotationAngle,
        });
    }

    updateDiscoverabilityResinTag() {
        if (!this.containerEl) {
            return;
        }

        const controlsState = this.annotationControlsFSM.getState();
        const isDiscoverable = DISCOVERABILITY_STATES.includes(controlsState);
        const isUsingDiscoverability = this.options.enableAnnotationsDiscoverability && isDiscoverable;

        // For tracking purposes, set property to true when the annotation controls are in a state
        // in which the default discoverability experience is enabled
        this.containerEl.setAttribute(DISCOVERABILITY_ATTRIBUTE, isUsingDiscoverability);
    }

    handleAnnotationCreateEvent({ annotation: { id } = {}, meta: { status } = {} }) {
        if (status !== 'success') {
            return;
        }

        if (this.annotator) {
            this.annotator.emit('annotations_active_set', id);
        }
    }

    /**
     * Handles the 'scrolltoannotation' event and calls the annotator scroll method
     * @param {string | Object} event - Annotation Event
     * @param {string} event.id - Annotation Id
     * @return {void}
     */
    handleScrollToAnnotation(event) {
        const data = event && event.id ? event.id : event;
        const defaultLocaton = event?.target?.location?.value;
        this.annotator.scrollToAnnotation(data, defaultLocaton);
    }
}

export default VideoBaseViewer;
