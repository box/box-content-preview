import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import controlsTemplate from 'raw!./media-controls.html';
import Scrubber from './scrubber';
import Settings from './settings';
import fullscreen from '../../fullscreen';
import { insertTemplate } from '../../util';

const SHOW_CONTROLS_CLASS = 'box-preview-media-controls-is-visible';
const PLAYING_CLASS = 'box-preview-media-is-playing';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 1500;
const VOLUME_LEVEL_CLASS_NAMES = [
    'box-preview-media-volume-icon-is-mute',
    'box-preview-media-volume-icon-is-low',
    'box-preview-media-volume-icon-is-medium',
    'box-preview-media-volume-icon-is-high'
];
const CRAWLER = '<div class="box-preview-media-crawler-wrapper"><div class="box-preview-crawler"><div></div><div></div><div></div></div></div>';

/* istanbul ignore next */
@autobind
class MediaControls extends EventEmitter {

    /**
     * [constructor]
     * @param {HTMLElement} containerEl container
     * @param {HTMLElement} mediaEl media element
     * @returns {Controls} Controls instance
     */
    constructor(containerEl, mediaEl) {
        super();

        this.containerEl = containerEl;
        this.mediaEl = mediaEl;

        insertTemplate(this.containerEl, controlsTemplate);

        this.wrapperEl = this.containerEl.querySelector('.box-preview-media-controls-wrapper');

        this.timeScrubberEl = this.wrapperEl.querySelector('.box-preview-media-time-scrubber-container');
        this.volScrubberEl = this.wrapperEl.querySelector('.box-preview-media-volume-scrubber-container');

        this.playButtonEl = this.wrapperEl.querySelector('.box-preview-media-playpause-icon');
        this.setLabel(this.playButtonEl, __('media_play'));


        this.volButtonEl = this.wrapperEl.querySelector('.box-preview-media-controls-volume-control');
        this.volLevelButtonEl = this.wrapperEl.querySelector('.box-preview-media-volume-icon');
        this.setLabel(this.volButtonEl, __('media_mute'));

        this.timecodeEl = this.wrapperEl.querySelector('.box-preview-media-controls-timecode');
        this.durationEl = this.wrapperEl.querySelector('.box-preview-media-controls-duration');

        this.fullscreenButtonEl = this.wrapperEl.querySelector('.box-preview-media-fullscreen-icon');
        this.setLabel(this.fullscreenButtonEl, __('enter_fullscreen'));


        this.settingsButtonEl = this.wrapperEl.querySelector('.box-preview-media-gear-icon');
        this.setLabel(this.settingsButtonEl, __('media_settings'));


        this.setupSettings();
        this.setupScrubbers();
        this.attachEventHandlers();
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        this.removeAllListeners();

        document.removeEventListener('mouseup', this.timeScrubbingStopHandler);
        document.removeEventListener('mousemove', this.filmstripShowHandler);

        if (this.timeScrubber) {
            this.timeScrubber.getHandleEl().removeEventListener('mousedown', this.timeScrubbingStartHandler);
            this.timeScrubber.getConvertedEl().removeEventListener('mousemove', this.filmstripShowHandler);
            this.timeScrubber.getConvertedEl().removeEventListener('mouseleave', this.filmstripHideHandler);
            this.timeScrubber.destroy();
            this.timeScrubber = undefined;
        }

        if (this.volScrubber) {
            this.volScrubber.destroy();
            this.volScrubber = undefined;
        }

        if (this.settings) {
            this.settings.removeListener('quality', this.handleQuality);
            this.settings.removeListener('speed', this.handleSpeed);
            this.settings.destroy();
            this.settings = undefined;
        }

        if (this.playButtonEl) {
            this.playButtonEl.removeEventListener('click', this.togglePlay);
        }

        if (this.volLevelButtonEl) {
            this.volLevelButtonEl.removeEventListener('click', this.toggleMute);
        }

        if (this.fullscreenButtonEl) {
            this.fullscreenButtonEl.removeEventListener('click', this.toggleFullscreen);
        }

        if (this.settingsButtonEl) {
            this.settingsButtonEl.removeEventListener('click', this.toggleSettings);
        }

        if (this.wrapperEl) {
            this.wrapperEl.removeEventListener('mouseenter', this.mouseenterHandler);
            this.wrapperEl.removeEventListener('mouseleave', this.mouseleaveHandler);
        }

        if (fullscreen) {
            fullscreen.removeListener('exit', this.setFullscreenLabel);
        }

        this.wrapperEl = undefined;
        this.timeScrubberEl = undefined;
        this.volScrubberEl = undefined;
        this.playButtonEl = undefined;
        this.volButtonEl = undefined;
        this.timecodeEl = undefined;
        this.durationEl = undefined;
        this.fullscreenButtonEl = undefined;
        this.settingsButtonEl = undefined;
        this.filmstripContainerEl = undefined;
        this.filmstripEl = undefined;
        this.filmstripTimeEl = undefined;
    }

    /**
     * Playback rate handler
     *
     * @private
     * @returns {void}
     */
    handleSpeed() {
        this.emit('speedchange');
    }

    /**
     * Quality handler
     *
     * @private
     * @returns {void}
     */
    handleQuality() {
        this.emit('qualitychange');
    }

    /**
     * Attaches settings menu
     * @private
     * @returns {void}
     */
    setupSettings() {
        this.settings = new Settings(this.containerEl);
        this.settings.addListener('quality', this.handleQuality);
        this.settings.addListener('speed', this.handleSpeed);
    }

    /**
     * Attaches scrubbers
     * @private
     * @returns {void}
     */
    setupScrubbers() {
        this.timeScrubber = new Scrubber(this.timeScrubberEl, __('media_time_slider'), 0, 0, 1);
        this.timeScrubber.on('valuechange', (value) => {
            this.emit('timeupdate', value);
        });

        this.volScrubber = new Scrubber(this.volScrubberEl, __('media_volume_slider'), 0, 1, 1);
        this.volScrubber.on('valuechange', (value) => {
            this.emit('volumeupdate', value);
        });
    }

    /**
     * Formats a number of seconds as a time string
     *
     * @param {number} seconds seconds
     * @private
     * @returns {string} A string formatted like 3:57:35
     */
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor((seconds % 3600) % 60);
        const hour = h > 0 ? `${h.toString()}:` : '';
        const min = m < 10 ? `0${m.toString()}` : m.toString();
        const sec = s < 10 ? `0${s.toString()}` : s.toString();
        return `${hour}${min}:${sec}`;
    }

    /**
     * Updates the time duration of the media file
     * @param {number} time the time length of the media file
     * @returns {void}
     */
    setDuration(time) {
        this.durationEl.textContent = this.formatTime(time || 0);
    }

    /**
     * Updates the current time/playback position of the media file
     * @param {number} time current playback position of the media file
     * @returns {void}
     */
    setTimeCode(time) {
        const duration = this.mediaEl.duration;
        this.timeScrubber.setValue(duration ? (time || 0) / duration : 0);
        this.timecodeEl.textContent = this.formatTime(time || 0);
    }

    /**
     * Updates progress.
     *
     * @returns {void}
     */
    updateProgress() {
        const buffered = this.mediaEl.buffered;
        const duration = this.mediaEl.duration || 1;
        const bufferedLength = buffered.length;
        const bufferedValue = bufferedLength ? buffered.end(bufferedLength - 1) : 0; // Get the new last buffered value
        this.timeScrubber.setBufferedValue(bufferedValue / duration);
    }

    /**
     * Toggles mute
     * @returns {void}
     */
    toggleMute() {
        this.emit('togglemute');
        const muteTitle = this.volButtonEl.title === __('media_mute') ?
                          __('media_unmute') : __('media_mute');
        this.setLabel(this.volButtonEl, muteTitle);
    }

    /**
     * Toggles playback
     * @emits toggleplayback
     * @returns {void}
     */
    togglePlay() {
        this.emit('toggleplayback');
    }

    /**
     * Toggles fullscreen
     * @emits togglefullscreen
     * @returns {void}
     */
    toggleFullscreen() {
        this.emit('togglefullscreen');
        this.setFullscreenLabel();
    }

    /**
     * sets the fullscreen label once fullscreen mode has been exited.
     *
     * @private
     * @returns {void}
     */
    setFullscreenLabel() {
        const fullscreenTitle = fullscreen.isFullscreen(this.containerEl) ?
                                __('exit_fullscreen') : __('enter_fullscreen');
        this.setLabel(this.fullscreenButtonEl, fullscreenTitle);
    }


    /**
     * Toggles settings menu
     * @returns {void}
     */
    toggleSettings() {
        if (this.isSettingsVisible()) {
            this.settings.hide();
        } else {
            this.settings.show();
        }
    }

    /**
     * Toggles label for control element with more than one state
     * @returns {void}
     */
    setLabel(el, label) {
        el.setAttribute('aria-label', label);
        el.setAttribute('title', label);
    }

    /**
     * Tells if settings menu is open
     * @returns {boolean} true or false
     */
    isSettingsVisible() {
        return !!this.settings && this.settings.isVisible();
    }

    /**
     * Shows the pause icon.
     * Does not emit any event.
     * @returns {void}
     */
    showPauseIcon() {
        this.wrapperEl.classList.add(PLAYING_CLASS);
        this.setLabel(this.playButtonEl, __('media_pause'));
    }

    /**
     * Shows the play icon.
     * Does not emit any event.
     * @returns {void}
     */
    showPlayIcon() {
        this.wrapperEl.classList.remove(PLAYING_CLASS);
        this.setLabel(this.playButtonEl, __('media_play'));
    }

    /**
     * Sets the volume
     * @param {number} volume volume
     * @returns {void}
     */
    updateVolumeIcon(volume) {
        VOLUME_LEVEL_CLASS_NAMES.forEach((className) => {
            this.volLevelButtonEl.classList.remove(className);
        });
        this.volLevelButtonEl.classList.add(VOLUME_LEVEL_CLASS_NAMES[Math.ceil(volume * 3)]);
        this.volScrubber.setValue(volume);

        const muteTitle = Math.ceil(volume * 3) === 0 ?
                          __('media_unmute') : __('media_mute');
        this.setLabel(this.volButtonEl, muteTitle);
    }

    /**
     * Attaches event handlers to buttons
     * @returns {void}
     */
    attachEventHandlers() {
        this.wrapperEl.addEventListener('mouseenter', this.mouseenterHandler);
        this.wrapperEl.addEventListener('mouseleave', this.mouseleaveHandler);
        this.playButtonEl.addEventListener('click', this.togglePlay);

        this.volLevelButtonEl.addEventListener('click', this.toggleMute);
        this.fullscreenButtonEl.addEventListener('click', this.toggleFullscreen);
        this.settingsButtonEl.addEventListener('click', this.toggleSettings);
        fullscreen.addListener('exit', this.setFullscreenLabel);
    }

    /**
     * Handles the mouse enter event.
     * Prevents hiding of the controls.
     *
     * @private
     * @returns {void}
     */
    mouseenterHandler() {
        this.preventHiding = true;
        this.show();
    }

    /**
     * Handles the mouse leave event.
     * Allows hiding of the controls.
     *
     * @private
     * @returns {void}
     */
    mouseleaveHandler() {
        this.preventHiding = false;
        this.show();
    }

    /**
     * Shows the media controls
     *
     * @public
     * @returns {void}
     */
    show() {
        if (!this.wrapperEl || !this.wrapperEl.parentNode) {
            return;
        }

        this.wrapperEl.parentNode.classList.add(SHOW_CONTROLS_CLASS);

        clearTimeout(this.autoHideTimeout);
        this.autoHideTimeout = setTimeout(() => {
            this.hide();
        }, CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS);
    }

    /**
     * Hides the media controls
     * @returns {void}
     */
    hide() {
        // Do not hide the controls if the settings menu was open
        // Also do not hide, till the mouse has left the controls
        if (this.preventHiding || this.isSettingsVisible()) {
            this.show();
            return;
        }

        if (this.wrapperEl && this.wrapperEl.parentNode) {
            this.wrapperEl.parentNode.classList.remove(SHOW_CONTROLS_CLASS);
        }
    }

    /**
     * Resizes the time scrubber
     * @returns {void}
     */
    resizeTimeScrubber() {
        if (this.timeScrubber) {
            this.timeScrubber.resize(32);
        }
    }

    /**
     * Sets the filmstrip
     *
     * @private
     * @returns {void}
     */
    setFilmstrip() {
        if (this.filmstripEl) {
            this.filmstripEl.src = this.filmstripUrl;
        }
    }

    /**
     * Sets up the filmstrip
     *
     * @private
     * @param {string} url filmstrip url
     * @param {RepStatus} status status of filmstrip
     * @param {number} aspect ratio
     * @returns {void}
     */
    initFilmstrip(url, status, aspect) {
        this.filmstripUrl = url;

        this.filmstripContainerEl = this.containerEl.appendChild(document.createElement('div'));
        this.filmstripContainerEl.className = 'box-preview-media-filmstrip-container';
        this.filmstripContainerEl.innerHTML = CRAWLER;

        this.filmstripEl = this.filmstripContainerEl.appendChild(document.createElement('img'));
        this.filmstripEl.className = 'box-preview-media-filmstrip';

        this.filmstripTimeEl = this.filmstripContainerEl.appendChild(document.createElement('div'));
        this.filmstripTimeEl.className = 'box-preview-media-filmstrip-timecode';


        const frameWidth = 90 * aspect;

        // Unfortunately the filmstrip is jpg. jpg files have a width limit.
        // So ffmpeg ends up creating filmstrip elements in seperate rows.
        // Each row is 90px high. Only 100 frames per row. Each frame is in the
        // same aspect ratio as the original video.

        this.timeScrubber.getHandleEl().addEventListener('mousedown', this.timeScrubbingStartHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mousemove', this.filmstripShowHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mouseleave', this.filmstripHideHandler);

        this.filmstripEl.onload = () => {
            if (this.filmstripContainerEl) {
                this.filmstripContainerEl.style.width = `${frameWidth + 2}px`; // 2px for the borders on each side
                this.filmstripContainerEl.querySelector('.box-preview-media-crawler-wrapper').style.display = 'none'; // Hide the crawler
            }
        };

        // Once the filmstrip status is success, load it
        status.success().then(this.setFilmstrip);
    }

    /**
     * Called when the user has mouse pressed the scrubbler handler
     * @private
     * @returns {void}
     */
    timeScrubbingStartHandler() {
        // Flag that we are scrubbing
        this.isScrubbing = true;

        // Add event listener for the entire document that when mouse up happens
        // anywhere, consider scrubbing has stopped. This is added on the document
        // itself so that the user doesn't have to scrub in a straight line.
        document.addEventListener('mouseup', this.timeScrubbingStopHandler);

        // Likewise add a mouse move handler to the entire document so that when
        // the user is scrubbing and they are randomly moving mouse anywhere on the
        // document, we still continue to show the film strip
        document.addEventListener('mousemove', this.filmstripShowHandler);
    }

    /**
     * Adjusts the video time
     *
     * @param {Event} event mouse event
     * @private
     * @returns {void}
     */
    timeScrubbingStopHandler(event) {
        // Flag that scrubbing is done
        this.isScrubbing = false;

        // Remove any even listeners that were added when scrubbing started
        document.removeEventListener('mouseup', this.timeScrubbingStopHandler);
        document.removeEventListener('mousemove', this.filmstripShowHandler);

        if (!this.timeScrubberEl.contains(event.target)) {
            // Don't hide the film strip if we were hovering over the scrubber when
            // mouse up happened. Since we show film strip on hover. On all other cases
            // hide the film strip as scrubbing has stopped and no one is hovering over the scrubber.
            this.filmstripContainerEl.style.display = 'none';
        }
    }

    /**
     * Shows the filmstrip frame
     *
     * @private
     * @param {Event} event mouse event
     * @returns {void}
     */
    filmstripShowHandler(event) {
        // Don't show the filstrip when settings menu is open
        if (this.isSettingsVisible()) {
            return;
        }

        const rect = this.containerEl.getBoundingClientRect();
        const pageX = event.pageX; // get the mouse X position
        const time = ((pageX - rect.left) * this.mediaEl.duration) / rect.width; // given the mouse X position, get the relative time
        const frame = Math.floor(time); // filmstrip has frames every 1sec, get the frame number to show
        let frameWidth = this.filmstripEl.naturalWidth / 100; // calculate the frame width based on the filmstrip width with each row having 100 frames
        let left = -1 * (frame % 100) * frameWidth; // there are 100 frames per row, get the frame position in a given row
        let top = -90 * Math.floor((frame / 100)); // get the row number if there are more than 1 row. Each row is 90px high.

        // If the filmstrip is not ready yet, we are using a placeholder
        // which has a fixed dimension of 160 x 90
        if (!this.filmstripEl.naturalWidth) {
            left = 0;
            top = 0;
            frameWidth = 160;
        }

        // The filstrip container positioning should fall within the viewport of the video itself. Relative to the video it
        // should be left positioned 0 <= filmstrip frame <= (video.width - filmstrip frame.width)
        const minLeft = Math.max(0, pageX - rect.left - (frameWidth / 2)); // don't allow the image to bleed out of the video viewport left edge
        const maxLeft = Math.min(minLeft, rect.width - frameWidth); // don't allow the image to bleed out of the video viewport right edge

        this.filmstripEl.style.left = `${left}px`;
        this.filmstripEl.style.top = `${top}px`;
        this.filmstripContainerEl.style.display = 'block';
        this.filmstripContainerEl.style.left = `${maxLeft}px`;
        this.filmstripTimeEl.textContent = this.formatTime(time);
    }

    /**
     * Hides the filmstrip frame
     * @private
     * @returns {void}
     */
    filmstripHideHandler() {
        if (!this.isScrubbing) {
            // Don't hide the film strip when we are scrubbing
            this.filmstripContainerEl.style.display = 'none';
        }
    }

    /**
     * Determines if controls are focused
     *
     * @public
     * @returns {boolean} true if controls are focused
     */
    isFocused() {
        return this.wrapperEl.contains(document.activeElement);
    }
}

export default MediaControls;
