import throttle from 'lodash/throttle';
import MediaBaseViewer from './MediaBaseViewer';
import { CLASS_HIDDEN, CLASS_IS_BUFFERING, CLASS_DARK } from '../../constants';
import { ICON_PLAY_LARGE } from '../../icons';

const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;
const CLASS_PLAY_BUTTON = 'bp-media-play-button';

class VideoBaseViewer extends MediaBaseViewer {
    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for handlers
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

        // Video element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('video'));
        this.mediaEl.setAttribute('preload', 'auto');
        // Prevents native iOS UI from taking over
        this.mediaEl.setAttribute('playsinline', '');

        // Play button
        this.playButtonEl = this.mediaContainerEl.appendChild(document.createElement('div'));
        this.playButtonEl.classList.add(CLASS_PLAY_BUTTON);
        this.playButtonEl.classList.add(CLASS_HIDDEN);
        this.playButtonEl.innerHTML = ICON_PLAY_LARGE;

        this.lowerLights();
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
        this.mediaControls.show();
    }

    /**
     * @inheritdoc
     */
    loadUI() {
        super.loadUI();
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
            this.mediaControls.toggle();
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
            this.mediaControls.show();
        }, MOUSE_MOVE_TIMEOUT_IN_MILLIS);

        this.mediaEl.addEventListener('mousemove', this.mousemoveHandler);
        if (this.hasTouch) {
            this.mediaEl.addEventListener('touchstart', this.pointerHandler);
        }

        this.mediaEl.addEventListener('click', this.pointerHandler);
        this.mediaEl.addEventListener('waiting', this.waitingHandler);
        this.playButtonEl.addEventListener('click', this.togglePlay);
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
}

export default VideoBaseViewer;
