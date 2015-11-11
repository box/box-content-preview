'use strict';

import autobind from 'autobind-decorator';
import Base from '../base';
import MediaControls from './media-controls';

const MEDIA_LOAD_TIMEOUT_IN_MILLIS = 10000;
const CSS_CLASS_MEDIA = 'box-preview-media';
const CSS_CLASS_MEDIA_CONTAINER = 'box-preview-media-container';
const DEFAULT_VOLUME = 0.7;

let Promise = global.Promise;
let document = global.document;

@autobind
class MediaBase extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container DOM node
     * @param {object} [options] some options
     * @returns {MediaBase}
     */
    constructor(container, options) {
        super(container, options);

        // Media Wrapper
        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_MEDIA;

        // Media Wrapper
        this.mediaContainerEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.mediaContainerEl.className = CSS_CLASS_MEDIA_CONTAINER;
    }

    /**
     * Loads a media source.
     *
     * @param {String} mediaUrl The media url
     * @public
     * @returns {Promise}
     */
    load(mediaUrl) {
        this.mediaUrl = mediaUrl;

        return new Promise((resolve, reject) => {

            // For media elements meta data load signifies a load event
            this.mediaEl.addEventListener('loadedmetadata', () => {
                resolve(this);
                this.loadedmetadataHandler();
            });

            // Attach the media source
            this.mediaEl.src = mediaUrl;

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, MEDIA_LOAD_TIMEOUT_IN_MILLIS);
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
        this.mediaEl.volume = DEFAULT_VOLUME;
        this.emit('load');

        if (this.options.ui) {
            this.loadUI();
            this.resize();
        }
    }

    /**
     * Loads the controls
     *
     * @private
     * @returns {void}
     */
    loadUI() {
        this.mediaControls = new MediaControls(this.mediaContainerEl, this.mediaEl);
        this.mediaControls.setDuration(this.mediaEl.duration);

        // Add event listeners for the media controls
        this.addEventListenersForMediaControls();

        // Add event listeners for the media element
        this.addEventListenersForMediaElement();
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @private
     * @returns {void}
     */
    addEventListenersForMediaControls() {
        this.mediaControls.on('timeupdate', (value) => {
            this.mediaEl.currentTime = value * this.mediaEl.duration;
        });

        this.mediaControls.on('volumeupdate', (value) => {
            this.mediaEl.volume = value;
        });

        this.mediaControls.on('toggleplayback', () => {
            if (this.mediaEl.paused) {
                this.mediaEl.play();
            } else {
                this.mediaEl.pause();
            }
        });

        this.mediaControls.on('togglemute', () => {
            if (this.mediaEl.volume) {
                this.oldVolume = this.mediaEl.volume;
                this.mediaEl.volume = 0;
            } else {
                this.mediaEl.volume = this.oldVolume || DEFAULT_VOLUME;
            }
        });
    }

    /**
     * Adds event listeners to the media element.
     * Makes changes to the media controls.
     *
     * @private
     * @returns {void}
     */
    addEventListenersForMediaElement() {
        this.mediaEl.addEventListener('timeupdate', () => {
            this.mediaControls.setTimeCode(this.mediaEl.currentTime);
        });

        this.mediaEl.addEventListener('volumechange', () => {
            this.mediaControls.updateVolumeIcon(this.mediaEl.volume);
        });

        this.mediaEl.addEventListener('playing', () => {
            this.mediaControls.showPauseIcon();
        });

        this.mediaEl.addEventListener('pause', () => {
            this.mediaControls.showPlayIcon();
        });

        this.mediaEl.addEventListener('ended', () => {
            this.mediaControls.setTimeCode(0);
            this.mediaControls.showPlayIcon();
        });
    }
}

export default MediaBase;
