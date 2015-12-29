'use strict';

import autobind from 'autobind-decorator';
import Base from '../base';
import MediaControls from './media-controls';

const CSS_CLASS_MEDIA = 'box-preview-media';
const CSS_CLASS_MEDIA_CONTAINER = 'box-preview-media-container';
const DEFAULT_VOLUME = 0.7;

@autobind
class MediaBase extends Base {

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container The container DOM node
     * @param {object} [options] some options
     * @returns {MediaBase} MediaBase instance
     */
    constructor(container, options) {
        super(container, options);

        // Media Wrapper
        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_MEDIA;

        // Media Wrapper
        this.mediaContainerEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.mediaContainerEl.className = CSS_CLASS_MEDIA_CONTAINER;

        this.loadTimeout = 100000;
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        if (this.mediaControls) {
            this.mediaControls.destroy();
        }

        if (this.mediaEl) {
            this.mediaEl.removeEventListener('timeupdate', this.setTimeCode);
            this.mediaEl.removeEventListener('volumechange', this.updateVolumeIcon);
            this.mediaEl.removeEventListener('playing', this.showPauseIcon);
            this.mediaEl.removeEventListener('pause', this.showPlayIcon);
            this.mediaEl.removeEventListener('ended', this.resetPlayIcon);

            this.mediaEl.removeAttribute('src');
            this.mediaEl.load();
        }

        if (this.mediaContainerEl) {
            this.mediaContainerEl.removeChild(this.mediaEl);
        }

        super.destroy();
    }

    /**
     * Loads a media source.
     *
     * @param {String} mediaUrl The media url
     * @public
     * @returns {Promise} Promise to load media
     */
    load(mediaUrl) {
        this.mediaUrl = this.appendAuthParam(mediaUrl);
        this.mediaEl.addEventListener('loadedmetadata', this.loadedmetadataHandler);
        this.mediaEl.src = this.mediaUrl;
        super.load();
    }

    /**
     * Handler for meta data load for the media element.
     *
     * @private
     * @returns {void}
     */
    loadedmetadataHandler() {
        if (this.destroyed) {
            return;
        }
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
     * Updates time code.
     *
     * @private
     * @returns {void}
     */
    setTimeCode() {
        this.mediaControls.setTimeCode(this.mediaEl.currentTime);
    }

    /**
     * Updates volume icon.
     *
     * @private
     * @returns {void}
     */
    updateVolumeIcon() {
        this.mediaControls.updateVolumeIcon(this.mediaEl.volume);
    }

    /**
     * Shows the pause icon.
     *
     * @private
     * @returns {void}
     */
    showPauseIcon() {
        this.mediaControls.showPauseIcon();
    }

    /**
     * Shows the play icon.
     *
     * @private
     * @returns {void}
     */
    showPlayIcon() {
        this.mediaControls.showPlayIcon();
    }

    /**
     * Resets the play icon and time.
     *
     * @private
     * @returns {void}
     */
    resetPlayIcon() {
        this.mediaControls.setTimeCode(0);
        this.showPlayIcon();
    }

    /**
     * Adds event listeners to the media element.
     * Makes changes to the media controls.
     *
     * @private
     * @returns {void}
     */
    addEventListenersForMediaElement() {
        this.mediaEl.addEventListener('timeupdate', this.setTimeCode);
        this.mediaEl.addEventListener('volumechange', this.updateVolumeIcon);
        this.mediaEl.addEventListener('playing', this.showPauseIcon);
        this.mediaEl.addEventListener('pause', this.showPlayIcon);
        this.mediaEl.addEventListener('ended', this.resetPlayIcon);
    }

    /**
     * Handles keyboard events for media
     *
     * @private
     * @param {String} key keydown key
     * @returns {Boolean} consumed or not
     */
    onKeydown(key) {

        // Return false when media controls are not ready or are focused
        if (!this.mediaControls || this.mediaControls.isFocused()) {
            return false;
        }

        if (key === 'Space') {
            this.mediaControls.togglePlay();
            return true;
        }

        return false;
    }
}

export default MediaBase;
