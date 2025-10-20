import noop from 'lodash/noop';
import throttle from 'lodash/throttle';
import { CLASS_DARK, CLASS_HIDDEN, CLASS_IS_BUFFERING } from '../../constants';
import { ICON_PLAY_LARGE, ICON_FORWARD, ICON_BACKWARD } from '../../icons';
import ControlsRoot from '../controls';
import MediaBaseViewer from './MediaBaseViewer';

const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;
const CLASS_PLAY_BUTTON = 'bp-media-play-button';
const CLASS_PLAY_CONTAINER = 'bp-media-overlay-play-container';
const CLASS_PLAY_CONTAINER_PLAY_BUTTON = 'bp-media-overlay-play-button';
const CLASS_SEEK_BUTTON = 'bp-media-overlay-seek-button';
const SMALL_VIDEO_WIDTH_THRESHOLD = 580;
class VideoBaseViewer extends MediaBaseViewer {
    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for handlers
        this.handleControlsHide = this.handleControlsHide.bind(this);
        this.handleControlsShow = this.handleControlsShow.bind(this);
        this.loadeddataHandler = this.loadeddataHandler.bind(this);
        this.pointerHandler = this.pointerHandler.bind(this);
        this.waitingHandler = this.waitingHandler.bind(this);
        this.playingHandler = this.playingHandler.bind(this);
        this.pauseHandler = this.pauseHandler.bind(this);
        this.resize = this.resize.bind(this);
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

        this.isNarrowVideo = false;
        // Video element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('video'));
        this.mediaEl.setAttribute('preload', 'auto');
        // Prevents native iOS UI from taking over
        this.mediaEl.setAttribute('playsinline', '');

        if (!this.getViewerOption('useReactControls')) {
            // Play button
            this.playButtonEl = this.mediaContainerEl.appendChild(document.createElement('button'));
            this.playButtonEl.classList.add(CLASS_PLAY_BUTTON);
            this.playButtonEl.classList.add(CLASS_HIDDEN);
            this.playButtonEl.setAttribute('type', 'button');
            this.playButtonEl.setAttribute('title', __('media_play'));
            this.playButtonEl.innerHTML = ICON_PLAY_LARGE;
        }

        this.lowerLights();
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
        this.playButtonEl.addEventListener('click', this.togglePlay);

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
                this.playButtonEl.removeEventListener('click', this.togglePlay);
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
            this.playButtonEl.removeEventListener('click', this.togglePlay);
        }

        if (this.seekForwardButtonEl) {
            this.seekForwardButtonEl.removeEventListener('click', () => this.movePlayback(true, 5));
        }

        if (this.seekBackwardButtonEl) {
            this.seekBackwardButtonEl.removeEventListener('click', () => this.movePlayback(false, 5));
        }

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
        this.showPlayButton();

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
            this.togglePlay();
        }
    }

    /**
     * Handler for play state
     *
     * @override
     * @return {void}
     */
    playingHandler() {
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
    }

    /**
     * Shows the loading indicator.
     *
     * @private
     * @return {void}
     */
    waitingHandler() {
        if (this.containerEl) {
            this.containerEl.classList.add(CLASS_IS_BUFFERING);
            this.hidePlayButton();
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
            this.playButtonEl.addEventListener('click', this.togglePlay);
        }
    }

    /**
     * @inheritdoc
     */
    showLoadingIcon() {
        super.showLoadingIcon();
    }

    /**
     * Overriden method to handle resizing of the window.
     * Adjusts the size of the time scrubber since its
     * senstive to the containers width.
     *
     * @override
     * @return {void}
     */
    resize() {
        if (this.mediaControls) {
            this.mediaControls.resizeTimeScrubber();
        }

        if (this.getViewerOption('useReactControls')) {
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
        super.resize();
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
     * @inheritdoc
     */
    onKeydown(key) {
        return super.onKeydown(key);
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
}

export default VideoBaseViewer;
