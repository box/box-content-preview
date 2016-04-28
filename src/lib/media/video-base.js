import autobind from 'autobind-decorator';
import MediaBase from './media-base';
import throttle from 'lodash.throttle';
import { CLASS_HIDDEN, CLASS_PREVIEW_LOADED } from '../constants';

const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;
const PLAY_ICON = '<svg fill="#FFF" height="48" viewBox="0 0 24 24" width="48" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/><path d="M0 0h24v24H0z" fill="none"/></svg>';
const CLASS_PLAY_BUTTON = 'box-preview-media-play-button';

@autobind
class VideoBase extends MediaBase {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @returns {VideoBase} VideoBase instance
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
    }

    /**
     * Shows the play button on video
     *
     * @private
     * @returns {void}
     */
    showPlayButton() {
        if (this.playButtonEl) {
            this.playButtonEl.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Hides the play button on video
     *
     * @private
     * @returns {void}
     */
    hidePlayButton() {
        if (this.playButtonEl) {
            this.playButtonEl.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Handler for meta data load for the media element.
     *
     * @private
     * @returns {void}
     */
    loadedmetadataHandler() {
        super.loadedmetadataHandler();
        this.showPlayButton();
    }

    /**
     * Handler for play state
     *
     * @private
     * @returns {void}
     */
    playingHandler() {
        super.playingHandler();
        this.hidePlayButton();
    }

    /**
     * Handler for pause state
     *
     * @private
     * @returns {void}
     */
    pauseHandler() {
        super.pauseHandler();
        this.showPlayButton();
    }

    /**
     * Shows the loading indicator.
     *
     * @private
     * @returns {void}
     */
    waitingHandler() {
        this.containerEl.classList.remove(CLASS_PREVIEW_LOADED);
    }

    /**
     * [destructor]
     * @returns {void}
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
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @private
     * @returns {void}
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
     * @private
     * @returns {void}
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
     * @private
     * @returns {void}
     */
    resize() {
        if (this.mediaControls) {
            this.mediaControls.resizeTimeScrubber();
        }
    }

    /**
     * Function to tell preview if navigation arrows
     * should be shown and won't intefere with viewer
     *
     * @protected
     * @returns {Boolean} true
     */
    allowNavigationArrows() {
        return !this.mediaControls || !this.mediaControls.isSettingsVisible();
    }
}

export default VideoBase;
