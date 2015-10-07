'use strict';

import '../../css/media.css';
import 'core-js/modules/es6.reflect';
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
    constructor(containerEl) {

        super();

        this.containerEl = containerEl;

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
        this.hdButtonEl = this.wrapperEl.querySelector('.box-preview-media-controls-hd');

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
        this.timeScrubber.on('scrub', (value) => {
            this.emit('timeupdate', value);
        });

        this.volScrubber = new Scrubber(this.volScrubberEl, 'Volume');
        this.volScrubber.on('scrub', (value) => {
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
    setTimeCode(time, duration) {
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
     * @emits toggleplayback
     * @returns {void}
     */
    toggleFullscreen() {
        this.emit('togglefullscreen');
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
    }

    /**
     * Shows the media controls
     * @returns {void}
     */
    show() {
        this.wrapperEl.classList.add(SHOW_CONTROLS_CLASS);
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
        this.wrapperEl.classList.remove(SHOW_CONTROLS_CLASS);
    }

    /**
     * Resizes the time scrubber
     * @returns {void}
     */
    resizeTimeScrubber() {
        this.timeScrubber.resize(32);
    }
}

export default MediaControls;
