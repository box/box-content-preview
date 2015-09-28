'use strict';

import '../../css/media.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import util from '../util';
import EventEmitter from 'events';
import throttle from 'lodash/function/throttle';
import controlsTemplate from 'raw!../../html/media/controls.html';
import Scrubber from './Scrubber';

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const PREVIEW_CONTROLS_SELECTOR = '.box-preview-controls';
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
        this.containerEl.innerHTML = controlsTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        
        this.timeScrubberEl = this.containerEl.querySelector('.box-preview-media-time-scrubber-container');
        this.volScrubberEl = this.containerEl.querySelector('.box-preview-media-volume-scrubber-container');
        
        this.playButtonEl = this.containerEl.querySelector('.box-preview-media-play-icon');

        this.volButtonEl = this.containerEl.querySelector('.box-preview-media-controls-volume-control');
        this.volLevelButtonEl = this.containerEl.querySelector('.box-preview-media-volume-level-icon');

        this.timecodeEl = this.containerEl.querySelector('.box-preview-media-controls-timecode');
        this.durationEl = this.containerEl.querySelector('.box-preview-media-controls-duration');
        
        this.fullscreenButtonEl = this.containerEl.querySelector('.box-preview-media-fullscreen-icon');
        this.hdButtonEl = this.containerEl.querySelector('.box-preview-media-controls-hd');

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
        this.durationEl.textContent = formatTime(time || 0);
    }

    /**
     * Updates the current time/playback position of the media file
     * @param {Number} time current playback position of the media file
     * @returns {void}
     */
    setTimeCode(time) {
        this.timecodeEl.textContent = formatTime(time || 0);
    }

    /**
     * Toggles playback
     * @returns {void}
     */
    togglePlay() {
        this.emit('toggleplayback');
    }

    /**
     * Returns the class name which should be used for a volume level
     * @private
     * @param {Number} volume the volume level
     * @returns {String} the class name
     */
    getVolLevelClassName(volume) {
        return VOLUME_LEVEL_CLASS_NAMES[Math.ceil(volume * 3)];
    }

    /**
     * Sets the volume
     * @param {Number} volume
     * @returns {void}
     */
    setVolume(volume) {
        this.volLevelButtonEl.classList.add(this.getVolLevelClassName(vol));
        this.volScrubber.setScrubberValue(0);
    }

    /**
     * Toggles playback
     * @returns {void}
     */
    toggleMute() {
        VOLUME_LEVEL_CLASS_NAMES.forEach((className) => {
            this.volLevelButtonEl.classList.remove(className);
        });
        this.emit('togglemute');
    }

    /**
     * Attaches event handlers to buttons
     * @returns {void}
     */
    attachEventHandlers() {
        this.playButtonEl.addEventListener('click', this.togglePlay);
        this.volButtonEl.addEventListener('click', this.toggleMute);
    }

}

global.MediaControls = MediaControls;
export default MediaControls;
