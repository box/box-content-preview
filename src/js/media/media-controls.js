'use strict';

import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import controlsTemplate from 'raw!../../html/media/controls.html';
import Scrubber from './scrubber';
import Settings from './settings';
import RepStatus from '../rep-status';
import { insertTemplate } from '../util';

const SHOW_CONTROLS_CLASS = 'box-preview-media-controls-is-visible';
const PLAYING_CLASS = 'box-preview-media-is-playing';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 1500;
const VOLUME_LEVEL_CLASS_NAMES = [
    'box-preview-media-volume-icon-mute',
    'box-preview-media-volume-icon-low',
    'box-preview-media-volume-icon-medium',
    'box-preview-media-volume-icon-high'
];
const CRAWLER = '<div class="box-preview-media-crawler-wrapper"><div class="box-preview-crawler"><div></div><div></div><div></div></div></div>';

let document = global.document;

@autobind
class MediaControls extends EventEmitter  {

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

        const template = controlsTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        insertTemplate(this.containerEl, template);

        this.wrapperEl = this.containerEl.querySelector('.box-preview-media-controls-wrapper');

        this.timeScrubberEl = this.wrapperEl.querySelector('.box-preview-media-time-scrubber-container');
        this.volScrubberEl = this.wrapperEl.querySelector('.box-preview-media-volume-scrubber-container');

        this.playButtonEl = this.wrapperEl.querySelector('.box-preview-media-play-icon');

        this.volButtonEl = this.wrapperEl.querySelector('.box-preview-media-controls-volume-control');
        this.volLevelButtonEl = this.wrapperEl.querySelector('.box-preview-media-volume-level-icon');

        this.timecodeEl = this.wrapperEl.querySelector('.box-preview-media-controls-timecode');
        this.durationEl = this.wrapperEl.querySelector('.box-preview-media-controls-duration');

        this.fullscreenButtonEl = this.wrapperEl.querySelector('.box-preview-media-expand-icon');
        this.settingsButtonEl = this.wrapperEl.querySelector('.box-preview-media-gear-icon');

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

        this.playButtonEl.removeEventListener('click', this.togglePlay);
        this.volButtonEl.removeEventListener('click', this.toggleMute);
        this.fullscreenButtonEl.removeEventListener('click', this.toggleFullscreen);
        this.settingsButtonEl.removeEventListener('click', this.toggleSettings);
        this.wrapperEl.removeEventListener('mouseenter', this.mouseenterHandler);
        this.wrapperEl.removeEventListener('mouseleave', this.mouseleaveHandler);

        this.wrapperEl = undefined;
        this.timeScrubberEl = undefined;
        this.volScrubberEl = undefined;
        this.playButtonEl = undefined;
        this.volButtonEl = undefined;
        this.volLevelButtonEl = undefined;
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
     * @param {String} speed playback rate
     * @returns {void}
     */
    handleSpeed(speed) {
        this.emit('speedchange');
    }

    /**
     * Quality handler
     *
     * @private
     * @param {String} quality hd or sd or auto
     * @returns {void}
     */
    handleQuality(quality) {
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
     *
     * @param {Number} seconds seconds
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
     * Toggles settings menu
     * @emits toggleSettings
     * @returns {void}
     */
    toggleSettings() {
        if (this.settings.isVisible()) {
            this.settings.hide();
        } else {
            this.settings.show();
        }
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
     * @param {Number} volume volume
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
        this.wrapperEl.addEventListener('mouseenter', this.mouseenterHandler);
        this.wrapperEl.addEventListener('mouseleave', this.mouseleaveHandler);
        this.playButtonEl.addEventListener('click', this.togglePlay);
        this.volButtonEl.addEventListener('click', this.toggleMute);
        this.fullscreenButtonEl.addEventListener('click', this.toggleFullscreen);
        this.settingsButtonEl.addEventListener('click', this.toggleSettings);
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

        if (!this.wrapperEl) {
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
        if (this.preventHiding || (this.settings && this.settings.isVisible())) {
            this.show();
            return;
        }

        if (this.wrapperEl) {
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
     * @param {Object} representation filmstrip representation
     * @param {Number} aspect aspect ratio
     * @param {String} token auth token
     * @returns {void}
     */
    initFilmstrip(representation, aspect, token) {

        this.filmstripUrl = representation.links.content.url + '?access_token=' + token;

        this.filmstripContainerEl = this.containerEl.appendChild(document.createElement('div'));
        this.filmstripContainerEl.className = 'box-preview-media-filmstrip-container';
        this.filmstripContainerEl.innerHTML = CRAWLER;

        this.filmstripEl = this.filmstripContainerEl.appendChild(document.createElement('img'));
        this.filmstripEl.className = 'box-preview-media-filmstrip';

        this.filmstripTimeEl = this.filmstripContainerEl.appendChild(document.createElement('div'));
        this.filmstripTimeEl.className = 'box-preview-media-filmstrip-timecode';


        let frameWidth = 90 * aspect;

        // Unfortunately the filmstrip is jpg. jpg files have a width limit.
        // So ffmpeg ends up creating filmstrip elements in seperate rows.
        // Each row is 90px high. Only 100 frames per row. Each frame is in the
        // same aspect ratio as the original video.

        this.timeScrubber.getHandleEl().addEventListener('mousedown', this.timeScrubbingStartHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mousemove', this.filmstripShowHandler);
        this.timeScrubber.getConvertedEl().addEventListener('mouseleave', this.filmstripHideHandler);

        this.filmstripEl.onload = () => {
            if (this.filmstripContainerEl) {
                this.filmstripContainerEl.style.width = frameWidth + 2 + 'px'; // 2px for the borders on each side
                this.filmstripContainerEl.querySelector('.box-preview-media-crawler-wrapper').style.display = 'none'; // Hide the crawler
            }
        };

        let repStatus = new RepStatus();
        repStatus.status(representation, {
            authorization: 'Bearer ' + token
        }).then(this.setFilmstrip);
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
        if (this.settings.isVisible()) {
            return;
        }

        let rect = this.containerEl.getBoundingClientRect();
        let pageX = event.pageX; // get the mouse X position
        let time = (pageX - rect.left) * this.mediaEl.duration / rect.width; // given the mouse X position, get the relative time
        let frame = Math.floor(time); // filmstrip has frames every 1sec, get the frame number to show
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

    /**
     * Determines if controls are focused
     *
     * @public
     * @returns {Boolean} true if controls are focused
     */
    isFocused() {
        return this.wrapperEl.contains(document.activeElement);
    }
}

export default MediaControls;
