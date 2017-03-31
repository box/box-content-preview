import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import controlsTemplate from './MediaControls.html';
import Scrubber from './Scrubber';
import Settings from './Settings';
import fullscreen from '../../Fullscreen';
import { insertTemplate } from '../../util';

const SHOW_CONTROLS_CLASS = 'bp-media-controls-is-visible';
const PLAYING_CLASS = 'bp-media-is-playing';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 1500;
const VOLUME_LEVEL_CLASS_NAMES = [
    'bp-media-volume-icon-is-mute',
    'bp-media-volume-icon-is-low',
    'bp-media-volume-icon-is-medium',
    'bp-media-volume-icon-is-high'
];
const CRAWLER = '<div class="bp-media-crawler-wrapper"><div class="bp-crawler"><div></div><div></div><div></div></div></div>';
const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_FRAME_HEIGHT = 90;

@autobind
class MediaControls extends EventEmitter {

    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl - container
     * @param {HTMLElement} mediaEl - media element
     * @return {Controls} Controls instance
     */
    constructor(containerEl, mediaEl) {
        super();

        this.containerEl = containerEl;
        this.mediaEl = mediaEl;

        insertTemplate(this.containerEl, controlsTemplate);

        this.wrapperEl = this.containerEl.querySelector('.bp-media-controls-wrapper');

        this.timeScrubberEl = this.wrapperEl.querySelector('.bp-media-time-scrubber-container');
        this.volScrubberEl = this.wrapperEl.querySelector('.bp-media-volume-scrubber-container');

        this.playButtonEl = this.wrapperEl.querySelector('.bp-media-playpause-icon');
        this.setLabel(this.playButtonEl, __('media_play'));


        this.volButtonEl = this.wrapperEl.querySelector('.bp-media-controls-volume-control');
        this.volLevelButtonEl = this.wrapperEl.querySelector('.bp-media-volume-icon');
        this.setLabel(this.volButtonEl, __('media_mute'));

        this.timecodeEl = this.wrapperEl.querySelector('.bp-media-controls-timecode');
        this.durationEl = this.wrapperEl.querySelector('.bp-media-controls-duration');

        this.fullscreenButtonEl = this.wrapperEl.querySelector('.bp-media-fullscreen-icon');
        this.setLabel(this.fullscreenButtonEl, __('enter_fullscreen'));


        this.settingsButtonEl = this.wrapperEl.querySelector('.bp-media-gear-icon');
        this.setLabel(this.settingsButtonEl, __('media_settings'));

        this.setupSettings();
        this.setupScrubbers();
        this.attachEventHandlers();
    }

    /**
     * [destructor]
     *
     * @return {void}
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
            this.settings.removeListener('speed', this.handleRate);
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
     * @return {void}
     */
    handleRate() {
        this.emit('ratechange');
    }

    /**
     * Quality handler
     *
     * @private
     * @return {void}
     */
    handleQuality() {
        this.emit('qualitychange');
    }

    /**
     * Attaches settings menu
     *
     * @private
     * @return {void}
     */
    setupSettings() {
        this.settings = new Settings(this.containerEl);
        this.settings.addListener('quality', this.handleQuality);
        this.settings.addListener('speed', this.handleRate);
    }

    /**
     * Computes time in seconds represented by the time-scrubber
     *
     * @private
     * @return {number} Time in seconds
     */
    getTimeFromScrubber() {
        return this.timeScrubber.getValue() * this.mediaEl.duration;
    }

    /**
     * Attaches scrubbers
     *
     * @private
     * @return {void}
     */
    setupScrubbers() {
        this.timeScrubber = new Scrubber(this.timeScrubberEl, __('media_time_slider'), 0, 0, 1);
        this.timeScrubber.on('valuechange', () => {
            this.emit('timeupdate', this.getTimeFromScrubber());
        });

        this.volScrubber = new Scrubber(this.volScrubberEl, __('media_volume_slider'), 1, 1, 1);
        this.volScrubber.on('valuechange', () => {
            this.emit('volumeupdate', this.volScrubber.getValue());
        });
    }

    /**
     * Formats a number of seconds as a time string
     *
     * @param {number} seconds - seconds
     * @private
     * @return {string} A string formatted like 3:57:35
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
     *
     * @param {number} time - the time length of the media file
     * @return {void}
     */
    setDuration(time) {
        this.durationEl.textContent = this.formatTime(time || 0);
    }

    /**
     * Updates the current time/playback position of the media file
     *
     * @param {number} time - current playback position of the media file
     * @return {void}
     */
    setTimeCode(time) {
        const duration = this.mediaEl.duration;
        this.timeScrubber.setValue(duration ? (time || 0) / duration : 0);
        this.timecodeEl.textContent = this.formatTime(time || 0);
    }

    /**
     * Updates progress.
     *
     * @return {void}
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
     *
     * @emits togglemute
     * @return {void}
     */
    toggleMute() {
        this.emit('togglemute');
    }

    /**
     * Toggles playback
     *
     * @emits toggleplayback
     * @return {void}
     */
    togglePlay() {
        this.emit('toggleplayback');
    }

    /**
     * Toggles fullscreen
     *
     * @emits togglefullscreen
     * @return {void}
     */
    toggleFullscreen() {
        this.emit('togglefullscreen');
        this.setFullscreenLabel();
    }

    /**
     * sets the fullscreen label once fullscreen mode has been exited.
     *
     * @private
     * @return {void}
     */
    setFullscreenLabel() {
        const fullscreenTitle = fullscreen.isFullscreen(this.containerEl) ? __('exit_fullscreen') : __('enter_fullscreen');
        this.setLabel(this.fullscreenButtonEl, fullscreenTitle);
    }


    /**
     * Toggles settings menu
     *
     * @return {void}
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
     * @return {void}
     */
    setLabel(el, label) {
        el.setAttribute('aria-label', label);
        el.setAttribute('title', label);
    }

    /**
     * Tells if settings menu is open
     * @return {boolean} true or false
     */
    isSettingsVisible() {
        return !!this.settings && this.settings.isVisible();
    }

    /**
     * Shows the pause icon.
     * Does not emit any event.
     *
     * @return {void}
     */
    showPauseIcon() {
        this.wrapperEl.classList.add(PLAYING_CLASS);
        this.setLabel(this.playButtonEl, __('media_pause'));
    }

    /**
     * Shows the play icon.
     * Does not emit any event.
     *
     * @return {void}
     */
    showPlayIcon() {
        this.wrapperEl.classList.remove(PLAYING_CLASS);
        this.setLabel(this.playButtonEl, __('media_play'));
    }

    /**
     * Sets the volume
     *
     * @param {number} volume - volume
     * @return {void}
     */
    updateVolumeIcon(volume) {
        VOLUME_LEVEL_CLASS_NAMES.forEach((className) => {
            this.volLevelButtonEl.classList.remove(className);
        });
        this.volLevelButtonEl.classList.add(VOLUME_LEVEL_CLASS_NAMES[Math.ceil(volume * 3)]);
        this.volScrubber.setValue(volume);

        const muteTitle = Math.ceil(volume * 3) === 0 ? __('media_unmute') : __('media_mute');
        this.setLabel(this.volButtonEl, muteTitle);
    }

    /**
     * Increases the speed one step. If already maximum, does nothing
     *
     * @return {void}
     */
    increaseSpeed() {
        this.settings.increaseSpeed();
    }

    /**
     * Decreases the speed one step. If already minimum, does nothing
     *
     * @return {void}
     */
    decreaseSpeed() {
        this.settings.decreaseSpeed();
    }

    /**
     * Attaches event handlers to buttons
     *
     * @return {void}
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
     * @return {void}
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
     * @return {void}
     */
    mouseleaveHandler() {
        this.preventHiding = false;
        this.show();
    }

    /**
     * Shows the media controls
     *
     * @return {void}
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
     *
     * @return {void}
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
     *
     * @return {void}
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
     * @return {void}
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
     * @param {string} url - Filmstrip url
     * @param {RepStatus} status - Status of filmstrip
     * @param {number} aspect - Aspect ratio
     * @param {number} interval - The filmstrip has one frame every 'interval' seconds
     * @return {void}
     */
    initFilmstrip(url, status, aspect, interval) {
        this.filmstripUrl = url;
        this.filmstripInterval = interval;

        this.filmstripContainerEl = this.containerEl.appendChild(document.createElement('div'));
        this.filmstripContainerEl.className = 'bp-media-filmstrip-container';
        this.filmstripContainerEl.innerHTML = CRAWLER;

        this.filmstripEl = this.filmstripContainerEl.appendChild(document.createElement('img'));
        this.filmstripEl.className = 'bp-media-filmstrip';

        this.filmstripTimeEl = this.filmstripContainerEl.appendChild(document.createElement('div'));
        this.filmstripTimeEl.className = 'bp-media-filmstrip-timecode';

        const frameWidth = FILMSTRIP_FRAME_HEIGHT * aspect;

        // Unfortunately the filmstrip is jpg. jpg files have a width limit.
        // So ffmpeg ends up creating filmstrip elements in separate rows.
        // Each row is FILMSTRIP_FRAME_HEIGHT px high. Only
        // FILMSTRIP_FRAMES_PER_ROW frames per row. Each frame is in the same
        // aspect ratio as the original video.

        this.timeScrubber.getHandleEl().addEventListener('mousedown', this.timeScrubbingStartHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mousemove', this.filmstripShowHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mouseleave', this.filmstripHideHandler);

        this.filmstripEl.onload = () => {
            if (this.filmstripContainerEl) {
                this.filmstripContainerEl.style.width = `${frameWidth + 2}px`; // 2px for the borders on each side
                this.filmstripContainerEl.querySelector('.bp-media-crawler-wrapper').style.display = 'none'; // Hide the crawler
            }
        };

        // Once the filmstrip status is success, load it
        status.getPromise().then(this.setFilmstrip);
    }

    /**
     * Called when the user has mouse pressed the scrubbler handler
     *
     * @private
     * @return {void}
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
     * @private
     * @param {Event} event - mouse event
     * @return {void}
     */
    timeScrubbingStopHandler(event) {
        // Flag that scrubbing is done
        this.isScrubbing = false;

        // Remove any even listeners that were added when scrubbing started
        document.removeEventListener('mouseup', this.timeScrubbingStopHandler);
        document.removeEventListener('mousemove', this.filmstripShowHandler);

        if (!this.timeScrubberEl.contains(event.target)) {
            // Don't hide the filmstrip if we were hovering over the scrubber when
            // mouse up happened. Since we show film strip on hover. On all other cases
            // hide the film strip as scrubbing has stopped and no one is hovering over the scrubber.
            this.filmstripContainerEl.style.display = 'none';
        }
    }

    /**
     * Returns offset into filmstrip and filmstrip container position
     *
     * @private
     * @param {number} pageX - Mouse X position
     * @param {number} rectLeft - Left position of the bounding rectangle
     * @param {number} rectWidth - Width of the bounding rectangle
     * @param {number} filmstripWidth - Pixel width of the filmstrip
     * @return {Object}
     */
    computeFilmstripPositions(pageX, rectLeft, rectWidth, filmstripWidth) {
        const time = ((pageX - rectLeft) * this.mediaEl.duration) / rectWidth; // given the mouse X position, get the relative time
        const frame = Math.floor(time / this.filmstripInterval); // get the frame number to show
        let frameWidth = filmstripWidth / FILMSTRIP_FRAMES_PER_ROW; // calculate the frame width based on the filmstrip width
        let left = -1 * (frame % FILMSTRIP_FRAMES_PER_ROW) * frameWidth; // get the frame position in a given row
        let top = -FILMSTRIP_FRAME_HEIGHT * Math.floor((frame / FILMSTRIP_FRAMES_PER_ROW)); // get the row number if there is more than 1 row.

        // If the filmstrip is not ready yet, we are using a placeholder
        // which has a fixed dimension of 160 x 90
        if (!filmstripWidth) {
            left = 0;
            top = 0;
            frameWidth = 160;
        }

        // The filmstrip container positioning should fall within the viewport of the video itself. Relative to the video it
        // should be left positioned 0 <= filmstrip frame <= (video.width - filmstrip frame.width)
        const minLeft = Math.max(0, pageX - rectLeft - (frameWidth / 2)); // don't allow the image to bleed out of the video viewport left edge
        const containerLeft = Math.min(minLeft, rectWidth - frameWidth); // don't allow the image to bleed out of the video viewport right edge
        return {
            time,
            left,
            top,
            containerLeft
        };
    }

    /**
     * Shows the filmstrip frame
     *
     * @private
     * @param {Event} event - mouse event
     * @return {void}
     */
    filmstripShowHandler(event) {
        // Don't show the filmstrip when settings menu is open
        if (this.isSettingsVisible()) {
            return;
        }

        const rect = this.containerEl.getBoundingClientRect();
        const pageX = event.pageX; // get the mouse X position
        const filmstripPositions = this.computeFilmstripPositions(pageX, rect.left, rect.width, this.filmstripEl.naturalWidth);

        this.filmstripEl.style.left = `${filmstripPositions.left}px`;
        this.filmstripEl.style.top = `${filmstripPositions.top}px`;
        this.filmstripContainerEl.style.display = 'block';
        this.filmstripContainerEl.style.left = `${filmstripPositions.containerLeft}px`;
        this.filmstripTimeEl.textContent = this.formatTime(filmstripPositions.time);
    }

    /**
     * Hides the filmstrip frame
     *
     * @private
     * @return {void}
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
     * @return {boolean} true if controls are focused
     */
    isFocused() {
        return this.wrapperEl.contains(document.activeElement);
    }
}

export default MediaControls;
