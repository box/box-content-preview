import autobind from 'autobind-decorator';
import throttle from 'lodash.throttle';
import MediaBase from './media-base';
import { CLASS_HIDDEN, CLASS_IS_BUFFERING, CLASS_DARK } from '../../constants';

const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;
const PLAY_ICON = '<svg fill="#FFF" height="48" viewBox="0 0 24 24" width="48"><path d="M8 5v14l11-7z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';
const CLASS_PLAY_BUTTON = 'bp-media-play-button';

@autobind
class VideoBase extends MediaBase {

    /**
     * [constructor]
     *
     * @override
     * @param {string|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @return {VideoBase} VideoBase instance
     */
    constructor(container, options) {
        super(container, options);

        // Video element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('video'));
        this.mediaEl.setAttribute('preload', 'auto');

        // Play button
        this.playButtonEl = this.mediaContainerEl.appendChild(document.createElement('div'));
        this.playButtonEl.classList.add(CLASS_PLAY_BUTTON);
        this.playButtonEl.classList.add(CLASS_HIDDEN);
        this.playButtonEl.innerHTML = PLAY_ICON;

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
            this.mediaEl.removeEventListener('click', this.togglePlay);
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
     * @protected
     * @return {void}
     */
    loadeddataHandler() {
        super.loadeddataHandler();
        this.showPlayButton();
    }

    /**
     * Handler for play state
     *
     * @override
     * @private
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
     * @private
     * @return {void}
     */
    pauseHandler() {
        super.pauseHandler();
        this.showPlayButton();
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
        }
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @override
     * @protected
     * @return {void}
     */
    addEventListenersForMediaControls() {
        super.addEventListenersForMediaControls();

        this.mediaControls.on('togglefullscreen', () => {
            this.toggleFullscreen();
        });
    }

    /**
     * Adds event listeners to the media element.
     * Makes changes to the meida controls.
     *
     * @override
     * @protected
     * @return {void}
     */
    addEventListenersForMediaElement() {
        super.addEventListenersForMediaElement();

        this.mousemoveHandler = throttle(() => {
            this.mediaControls.show();
        }, MOUSE_MOVE_TIMEOUT_IN_MILLIS);

        this.mediaEl.addEventListener('mousemove', this.mousemoveHandler);
        this.mediaEl.addEventListener('click', this.togglePlay);
        this.mediaEl.addEventListener('waiting', this.waitingHandler);
        this.playButtonEl.addEventListener('click', this.togglePlay);
    }

    /**
     * Overriden method to handle resizing of the window.
     * Adjusts the size of the time scrubber since its
     * senstive to the containers width.
     *
     * @override
     * @protected
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
        if (this.containerEl) {
            this.containerEl.classList.add(CLASS_DARK);
        }
    }
}

export default VideoBase;
