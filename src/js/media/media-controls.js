'use strict';

import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import controlsTemplate from 'raw!../../html/media/controls.html';
import Scrubber from './Scrubber';

const SHOW_CONTROLS_CLASS = 'box-preview-media-controls-is-visible';
const PLAYING_CLASS = 'box-preview-media-is-playing';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 1500;
const VOLUME_LEVEL_CLASS_NAMES = [
    'box-preview-media-volume-icon-mute',
    'box-preview-media-volume-icon-low',
    'box-preview-media-volume-icon-medium',
    'box-preview-media-volume-icon-high'
];

let document = global.document;

@autobind
class MediaControls extends EventEmitter  {

    /**
     * [constructor]
     * @param {HTMLElement} containerEl
     * @returns {Controls}
     */
    constructor(containerEl, mediaEl) {

        super();

        this.containerEl = containerEl;
        this.mediaEl = mediaEl;

        let template = controlsTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        this.containerEl.appendChild(document.createRange().createContextualFragment(template));

        this.wrapperEl = this.containerEl.querySelector('.box-preview-media-controls-wrapper');

        this.timeScrubberEl = this.wrapperEl.querySelector('.box-preview-media-time-scrubber-container');
        this.volScrubberEl = this.wrapperEl.querySelector('.box-preview-media-volume-scrubber-container');
        
        this.playButtonEl = this.wrapperEl.querySelector('.box-preview-media-play-icon');

        this.volButtonEl = this.wrapperEl.querySelector('.box-preview-media-controls-volume-control');
        this.volLevelButtonEl = this.wrapperEl.querySelector('.box-preview-media-volume-level-icon');

        this.timecodeEl = this.wrapperEl.querySelector('.box-preview-media-controls-timecode');
        this.durationEl = this.wrapperEl.querySelector('.box-preview-media-controls-duration');
        
        this.fullscreenButtonEl = this.wrapperEl.querySelector('.box-preview-media-expand-icon');
        this.hdButtonEl = this.wrapperEl.querySelector('.box-preview-media-hd-icon');

        this.setupScrubbers();
        this.attachEventHandlers();
    }

    /**
     * Attaches scrubbers
     * @private
     * @returns {void}
     */
    setupScrubbers() {
        this.timeScrubber = new Scrubber(this.timeScrubberEl, 'Time');
        this.timeScrubber.on('valuechange', (value) => {
            this.emit('timeupdate', value);
        });

        this.volScrubber = new Scrubber(this.volScrubberEl, 'Volume');
        this.volScrubber.on('valuechange', (value) => {
            this.emit('volumeupdate', value);
        });        
    }

    /**
     * Formats a number of seconds as a time string
     * @param {Number} seconds
     * @private
     * @returns {String} A string formatted like 03:57:35
     */
    formatTime(seconds) {
        let h = Math.floor(seconds / 3600);
        let m = Math.floor((seconds % 3600) / 60);
        let s = Math.floor((seconds % 3600) % 60);
        return (h > 0 ? h.toString() + ':' : '') + (m < 10 ? '0' + m.toString() : m.toString()) + ':' + (s < 10 ? '0' + s.toString() : s.toString());
    }

    /**
     * Updates the time duration of the media file
     * @param {Number} time the time length of the media file
     * @returns {void}
     */
    setDuration(time) {
        this.durationEl.textContent = this.formatTime(time || 0);
    }

    /**
     * Updates the current time/playback position of the media file
     * @param {Number} time current playback position of the media file
     * @returns {void}
     */
    setTimeCode(time) {
        let duration = this.mediaEl.duration;
        this.timeScrubber.setValue(duration ? time / duration : 0);
        this.timecodeEl.textContent = this.formatTime(time || 0);
    }

    /**
     * Toggles mute
     * @returns {void}
     */
    toggleMute() {
        this.emit('togglemute');
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
     * Toggles playback
     * @emits togglefullscreen
     * @returns {void}
     */
    toggleFullscreen() {
        this.emit('togglefullscreen');
    }

    /**
     * Toggles HD
     * @emits togglehd
     * @returns {void}
     */
    toggleHD() {
        this.emit('togglehd');
    }

    /**
     * Shows the pause icon.
     * Does not emit any event.
     * @returns {void}
     */
    showPauseIcon() {
        this.wrapperEl.classList.add(PLAYING_CLASS);
    }

    /**
     * Shows the play icon.
     * Does not emit any event.
     * @returns {void}
     */
    showPlayIcon() {
        this.wrapperEl.classList.remove(PLAYING_CLASS);
    }

    /**
     * Sets the volume
     * @param {Number} volume
     * @returns {void}
     */
    updateVolumeIcon(volume) {
        VOLUME_LEVEL_CLASS_NAMES.forEach((className) => {
            this.volLevelButtonEl.classList.remove(className);
        });
        this.volLevelButtonEl.classList.add(VOLUME_LEVEL_CLASS_NAMES[Math.ceil(volume * 3)]);
        this.volScrubber.setValue(volume);
    }

    /**
     * Attaches event handlers to buttons
     * @returns {void}
     */
    attachEventHandlers() {
        this.playButtonEl.addEventListener('click', this.togglePlay);
        this.volButtonEl.addEventListener('click', this.toggleMute);
        this.fullscreenButtonEl.addEventListener('click', this.toggleFullscreen);
        this.hdButtonEl.addEventListener('click', this.toggleHD);
    }

    /**
     * Shows the media controls
     *
     * @public
     * @param {boolean} [preventHiding] Prevents the controls from hiding
     * @returns {void}
     */
    show(preventHiding = false) {
        this.wrapperEl.classList.add(SHOW_CONTROLS_CLASS);

        if (!preventHiding) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = setTimeout(() => {
                this.hide();
            }, CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS);
        }
    }

    /**
     * Hides the media controls
     * @returns {void}
     */
    hide() {
        this.wrapperEl.classList.remove(SHOW_CONTROLS_CLASS);
    }

    /**
     * Resizes the time scrubber
     * @returns {void}
     */
    resizeTimeScrubber() {
        this.timeScrubber.resize(32);
    }

    /**
     * Sets the filmstrip
     * 
     * @private
     * @returns {void}
     */
    setFilmstrip() {
        this.filmstripEl.src = this.filmstripUrl;
    }

    /**
     * Sets up the filmstrip
     * 
     * @private
     * @returns {void}
     */
    initFilmstrip(filmstripUrl) {

        this.filmstripUrl = filmstripUrl;

        this.filmstripContainerEl = this.containerEl.appendChild(document.createElement('div'));
        this.filmstripContainerEl.className = 'box-preview-media-filmstrip-container';

        this.filmstripEl = this.filmstripContainerEl.appendChild(document.createElement('img'));
        this.filmstripEl.className = 'box-preview-media-filmstrip';

        this.filmstripTimeEl = this.filmstripContainerEl.appendChild(document.createElement('div'));
        this.filmstripTimeEl.className = 'box-preview-media-filmstrip-timecode';

        
        let frameWidth = 90 * this.aspect;

        // Unfortunately the filmstrip is jpg. jpg files have a width limit.
        // So ffmpeg ends up creating filmstrip elements in seperate rows.
        // Each row is 90px high. Only 100 frames per row. Each frame is in the
        // same aspect ratio as the original video.

        this.timeScrubber.getHandleEl().addEventListener('mousedown', this.timeScrubbingStartHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mousemove', this.filmstripShowHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mouseleave', this.filmstripHideHandler);

        this.filmstripEl.onload = () => {
            this.filmstripContainerEl.style.width = frameWidth + 2 + 'px'; // 2px for the borders on each side
        };

        if (this.filmstripUrl) {
            this.setFilmstrip();
        }
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
     * @param {Event} event
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
     * @param {Event} event
     * @returns {void}
     */
    filmstripShowHandler(event) {
        let rect = this.containerEl.getBoundingClientRect();
        let pageX = event.pageX; // get the mouse X position
        let time = (pageX - rect.left) * this.mediaEl.duration / rect.width; // given the mouse X position, get the relative time
        let frame = Math.floor(time); // filmstrip has frames every 1sec, get the frame number to show
        let frameWidth = this.filmstripEl.naturalWidth / 100; // calculate the frame width based on the filmstrip width with each row having 100 frames
        let left = -1 * (frame % 100) * frameWidth; // there are 100 frames per row, get the frame position in a given row
        let top = -90 * Math.floor((frame / 100)); // get the row number if there are more than 1 row. Each row is 90px high.

        // If the filmstrip is not ready yet, we are using a placeholder
        // which has a fixed dimension of 160 x 90
        if (!this.filmstripUrl) {
            left = 0;
            top = 0;
            frameWidth = 160;
        }

        // The filstrip container positioning should fall within the viewport of the video itself. Relative to the video it
        // should be left positioned 0 <= filmstrip frame <= (video.width - filmstrip frame.width)
        let minLeft = Math.max(0, pageX - rect.left - (frameWidth / 2)); // don't allow the image to bleed out of the video viewport left edge
        let maxLeft = Math.min(minLeft, rect.width - frameWidth); // don't allow the image to bleed out of the video viewport right edge

        this.filmstripEl.style.left = left + 'px';
        this.filmstripEl.style.top = top + 'px';
        this.filmstripContainerEl.style.display = 'block';
        this.filmstripContainerEl.style.left = maxLeft + 'px';
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
}

export default MediaControls;
