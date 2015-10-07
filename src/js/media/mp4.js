'use strict';

import '../../css/media.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import Base from '../base';
import MediaControls from './media-controls';
import throttle from 'lodash/function/throttle';

const VIDEO_LOAD_TIMEOUT_IN_MILLIS = 10000;
const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;
const CSS_CLASS_MEDIA = 'box-preview-media';
const CSS_CLASS_MP4 = 'box-preview-media-mp4';
const DEFAULT_VOLUME = 0.7;

let document = global.document;
let Box = global.Box || {};

@autobind
class MP4 extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super(container, options);
        
        // Media Wrapper
        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_MEDIA;
        
        // MP4 Wrapper
        this.videoContainerEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.videoContainerEl.className = CSS_CLASS_MP4;
        
        // MP4
        this.videoEl = this.videoContainerEl.appendChild(document.createElement('video'));
    }

    /**
     * Loads an image.
     * @param {Event} event The mousemove event
     * @pubic
     * @returns {Promise}
     */
    load(mp4Url) {
        this.mp4Url = mp4Url;
        
        return new Promise((resolve, reject) => {
            
            // For media elements meta data load signifies a load event
            this.videoEl.addEventListener('loadedmetadata', () => {
                resolve(this);
                this.loadedmetadataHandler();
            });

            // Attach the MP4 source
            this.videoEl.src = mp4Url;

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, VIDEO_LOAD_TIMEOUT_IN_MILLIS);
        });
    }

    /**
     * Handler for meta data load for the media element.
     * 
     * @private
     * @returns {void}
     */
    loadedmetadataHandler() {
        this.loaded = true;
        this.videoEl.volume = DEFAULT_VOLUME;
        this.emit('load');

        if (this.options.ui) {
            this.loadUI();
            this.resize();
        }            
    }

    /**
     * Zooms in
     * @private
     * @returns {void}
     */
    loadUI() {
        this.mediaControls = new MediaControls(this.videoContainerEl);
        this.mediaControls.setDuration(this.videoEl.duration);
        
        // Add event listeners for the media controls
        this.addEventsListenersForMediaControls();

        // Add event listeners for the media element
        this.addEventsListenersForMediaElement();
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the video element.
     * 
     * @private
     * @returns {void}
     */
    addEventsListenersForMediaControls() {
        this.mediaControls.on('timeupdate', (value) => {
            this.videoEl.currentTime = value * this.videoEl.duration;
        });
        
        this.mediaControls.on('volumeupdate', (value) => {
            this.videoEl.volume = value;
        });
        
        this.mediaControls.on('togglefullscreen', () => {
            this.toggleFullscreen();
        });
        
        this.mediaControls.on('toggleplayback', () => {
            if (this.videoEl.paused) {
                this.videoEl.play();
            } else {
                this.videoEl.pause();
            }
        });
        
        this.mediaControls.on('togglemute', () => {
            if (this.videoEl.volume) {
                this.oldVolume = this.videoEl.volume;
                this.videoEl.volume = 0;
            } else {
                this.videoEl.volume = this.oldVolume || DEFAULT_VOLUME;
            }
        }); 
    }

    /**
     * Adds event listeners to the media element.
     * Makes changes to the meida controls.
     * 
     * @private
     * @returns {void}
     */
    addEventsListenersForMediaElement() {
        this.mousemoveHandler = throttle(() => {
            this.mediaControls.show();
        }, MOUSE_MOVE_TIMEOUT_IN_MILLIS);

        this.videoEl.addEventListener('mousemove', this.mousemoveHandler);

        this.videoEl.addEventListener('timeupdate', () => {
            this.mediaControls.setTimeCode(this.videoEl.currentTime, this.videoEl.duration);
        });

        this.videoEl.addEventListener('volumechange', () => {
            this.mediaControls.updateVolumeIcon(this.videoEl.volume);
        });

        this.videoEl.addEventListener('playing', () => {
            this.mediaControls.showPauseIcon();
        });

        this.videoEl.addEventListener('pause', () => {
            this.mediaControls.showPlayIcon();
        });

        this.videoEl.addEventListener('ended', () => {
            this.mediaControls.setTimeCode(0);
            this.mediaControls.showPlayIcon();
        });            
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
        this.mediaControls.resizeTimeScrubber();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.MP4 = MP4;
global.Box = Box;
export default MP4;