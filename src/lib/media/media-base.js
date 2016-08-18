import autobind from 'autobind-decorator';
import Base from '../base';
import cache from '../cache';
import MediaControls from './media-controls';
import { CLASS_PREVIEW_LOADED } from '../constants';

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
            this.mediaControls.removeListener('speedchange', this.handleSpeed);
            this.mediaControls.destroy();
        }

        // Try catch is needed due to weird behavior when src is removed
        try {
            if (this.mediaEl) {
                this.mediaEl.removeEventListener('timeupdate', this.setTimeCode);
                this.mediaEl.removeEventListener('progress', this.progressHandler);
                this.mediaEl.removeEventListener('volumechange', this.updateVolumeIcon);
                this.mediaEl.removeEventListener('playing', this.playingHandler);
                this.mediaEl.removeEventListener('pause', this.pauseHandler);
                this.mediaEl.removeEventListener('ended', this.resetPlayIcon);
                this.mediaEl.removeEventListener('seeked', this.hideLoadingIcon);
                this.mediaEl.removeEventListener('stalled', this.stalledHandler);
                this.mediaEl.removeEventListener('loadedmetadata', this.loadedmetadataHandler);

                this.mediaEl.removeAttribute('src');
                this.mediaEl.load();
            }

            if (this.mediaContainerEl) {
                this.mediaContainerEl.removeChild(this.mediaEl);
            }
        } catch (e) {
            // do nothing
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
        this.handleVolume();
        this.loaded = true;
        this.emit('load');

        this.loadUI();
        this.resize();
    }

    /**
     * Handler for playback rate
     *
     * @private
     * @returns {void}
     */
    handleSpeed() {
        const speed = cache.get('media-speed') - 0;
        if (speed && this.mediaEl.playbackRate !== speed) {
            this.emit('speedchange', speed);
        }
        this.mediaEl.playbackRate = speed;
    }

    /**
     * Handler for volume
     *
     * @private
     * @returns {void}
     */
    handleVolume() {
        let volume = DEFAULT_VOLUME;

        if (cache.has('media-volume')) {
            volume = cache.get('media-volume');
        }

        this.mediaEl.volume = volume;
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
        this.mediaControls.addListener('timeupdate', (value) => {
            this.mediaEl.currentTime = value * this.mediaEl.duration;
        });

        this.mediaControls.addListener('volumeupdate', (value) => {
            cache.set('media-volume', value);
            this.handleVolume();
        });

        this.mediaControls.addListener('toggleplayback', () => {
            if (this.mediaEl.paused) {
                this.mediaEl.play();
                this.handleSpeed();
                this.handleVolume();
            } else {
                this.mediaEl.pause();
            }
        });

        this.mediaControls.addListener('togglemute', () => {
            if (this.mediaEl.volume) {
                this.oldVolume = this.mediaEl.volume;
                cache.set('media-volume', 0);
            } else {
                cache.set('media-volume', this.oldVolume);
            }
            this.handleVolume();
        });

        this.mediaControls.addListener('speedchange', this.handleSpeed);
    }

    /**
     * Updates time code.
     *
     * @private
     * @returns {void}
     */
    setTimeCode() {
        if (this.mediaControls) {
            this.mediaControls.setTimeCode(this.mediaEl.currentTime);
        }
    }

    /**
     * Updates volume icon.
     *
     * @private
     * @returns {void}
     */
    updateVolumeIcon() {
        if (this.mediaControls) {
            this.mediaControls.updateVolumeIcon(this.mediaEl.volume);
        }
    }

    /**
     * Shows the pause icon.
     * Hides the loading indicator.
     * Updates volume.
     * Updates speed.
     *
     * @private
     * @returns {void}
     */
    playingHandler() {
        if (this.mediaControls) {
            this.mediaControls.showPauseIcon();
        }
        this.hideLoadingIcon();
        this.handleSpeed();
        this.handleVolume();
    }

    /**
     * Updates progress.
     *
     * @private
     * @returns {void}
     */
    progressHandler() {
        if (this.mediaControls) {
            this.mediaControls.updateProgress();
        }
    }

    /**
     * Shows the play icon.
     *
     * @private
     * @returns {void}
     */
    pauseHandler() {
        if (this.mediaControls) {
            this.mediaControls.showPlayIcon();
        }
    }

    /**
     * Resets the play icon and time.
     *
     * @private
     * @returns {void}
     */
    resetPlayIcon() {
        if (this.mediaControls) {
            this.mediaControls.setTimeCode(0);
        }
        this.hideLoadingIcon();
        this.pauseHandler();
    }

    /**
     * Toggle playback
     *
     * @private
     * @returns {void}
     */
    togglePlay() {
        if (this.mediaControls) {
            this.mediaControls.togglePlay();
        }
    }

    /**
     * Hides the loading indicator
     *
     * @private
     * @returns {void}
     */
    hideLoadingIcon() {
        if (this.containerEl) {
            this.containerEl.classList.add(CLASS_PREVIEW_LOADED);
        }
    }

    /**
     * Shows the loading indicator
     *
     * @private
     * @returns {void}
     */
    showLoadingIcon() {
        if (this.containerEl && this.mediaEl && !this.mediaEl.paused && !this.mediaEl.ended) {
            this.containerEl.classList.remove(CLASS_PREVIEW_LOADED);
        }
    }

    /**
     * Logs some metrics when stalled
     *
     * @private
     * @returns {void}
     */
    stalledHandler() {
        if (this.mediaEl) {
            this.emit('stalled', this.mediaEl.currentTime);
        }
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
        this.mediaEl.addEventListener('progress', this.progressHandler);
        this.mediaEl.addEventListener('volumechange', this.updateVolumeIcon);
        this.mediaEl.addEventListener('playing', this.playingHandler);
        this.mediaEl.addEventListener('pause', this.pauseHandler);
        this.mediaEl.addEventListener('ended', this.resetPlayIcon);
        this.mediaEl.addEventListener('seeked', this.hideLoadingIcon);
        this.mediaEl.addEventListener('stalled', this.stalledHandler);
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
            this.togglePlay();
            return true;
        }

        return false;
    }
}

export default MediaBase;
