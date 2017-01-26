import autobind from 'autobind-decorator';
import Base from '../base';
import cache from '../../cache';
import Browser from '../../browser';
import MediaControls from './media-controls';
import { CLASS_HIDDEN, CLASS_IS_BUFFERING, CLASS_IS_VISIBLE } from '../../constants';

const CSS_CLASS_MEDIA = 'bp-media';
const CSS_CLASS_MEDIA_CONTAINER = 'bp-media-container';
const DEFAULT_VOLUME = 1;

@autobind
class MediaBase extends Base {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
        super.setup();

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
     *
     * @override
     * @return {void}
     */
    destroy() {
        if (this.mediaControls) {
            this.mediaControls.removeAllListeners();
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
                this.mediaEl.removeEventListener('seeked', this.seekHandler);
                this.mediaEl.removeEventListener('loadeddata', this.loadeddataHandler);
                this.mediaEl.removeEventListener('error', this.errorHandler);

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
     * @override
     * @return {void}
     */
    load() {
        this.setup();

        const { representation } = this.options;
        const { data, status } = representation;
        const { content } = data;
        const { url_template: template } = content;

        this.mediaUrl = this.createContentUrlWithAuthParams(template);
        this.mediaEl.addEventListener('loadeddata', this.loadeddataHandler);
        this.mediaEl.addEventListener('error', this.errorHandler);

        if (Browser.isIOS()) {
            // iOS doesn't fire loadeddata event till some data loads
            // Adding autoplay helps with that and itself won't autoplay.
            // https://webkit.org/blog/6784/new-video-policies-for-ios/
            this.mediaEl.autoplay = true;
        }

        status.getPromise().then(() => {
            this.mediaEl.src = this.mediaUrl;
        });

        super.load();
    }

    /**
     * Handler for meta data load for the media element.
     *
     * @protected
     * @emits load
     * @return {void}
     */
    loadeddataHandler() {
        if (this.destroyed) {
            return;
        }
        this.handleVolume();
        this.loaded = true;
        this.emit('load');

        this.loadUI();
        this.resize();

        // Make media element visible after resize
        this.showMedia();
    }

    /**
     * Makes media wrapper (and contents) visible.
     *
     * @protected
     * @return {void}
     */
    showMedia() {
        this.wrapperEl.classList.add(CLASS_IS_VISIBLE);
    }

    /**
     * Handles media element loading errors.
     *
     * @private
     * @emits error
     * @return {void}
     */
    errorHandler = (err) => {
        /* eslint-disable no-console */
        console.error(err);
        /* eslint-enable no-console */

        // Display a generic error message but log the real one
        const error = err;
        if (err instanceof Error) {
            error.displayMessage = __('error_refresh');
        }
        this.emit('error', error);
    }

    /**
     * Handler for playback rate
     *
     * @private
     * @emits speedchange
     * @return {void}
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
     * @return {void}
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
     * @return {void}
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
     * @protected
     * @emits play
     * @emits pause
     * @return {void}
     */
    /* istanbul ignore next */
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
                this.emit('play');
                this.handleSpeed();
                this.handleVolume();
            } else {
                this.mediaEl.pause();
                this.emit('pause');
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
     * @return {void}
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
     * @return {void}
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
     * @return {void}
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
     * @return {void}
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
     * @return {void}
     */
    pauseHandler() {
        if (this.mediaControls) {
            this.mediaControls.showPlayIcon();
        }
    }

    /**
     * Emits the seek event and hides the loading icon.
     *
     * @private
     * @emits seek
     * @return {void}
     */
    seekHandler() {
        this.hideLoadingIcon();
        this.emit('seek', this.mediaEl.currentTime);
    }

    /**
     * Shows the play button in media content.
     *
     * @private
     * @return {void}
     */
    showPlayButton() {
        if (this.playButtonEl) {
            this.playButtonEl.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Hides the play button in media content.
     *
     * @private
     * @return {void}
     */
    hidePlayButton() {
        if (this.playButtonEl) {
            this.playButtonEl.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Resets the play icon and time.
     *
     * @private
     * @return {void}
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
     * @return {void}
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
     * @return {void}
     */
    hideLoadingIcon() {
        if (this.containerEl) {
            this.containerEl.classList.remove(CLASS_IS_BUFFERING);
        }
    }

    /**
     * Shows the loading indicator
     *
     * @private
     * @return {void}
     */
    showLoadingIcon() {
        if (this.containerEl && this.mediaEl && !this.mediaEl.paused && !this.mediaEl.ended) {
            this.containerEl.classList.add(CLASS_IS_BUFFERING);
            this.hidePlayButton();
        }
    }

    /**
     * Adds event listeners to the media element.
     * Makes changes to the media controls.
     *
     * @protected
     * @return {void}
     */
    addEventListenersForMediaElement() {
        this.mediaEl.addEventListener('timeupdate', this.setTimeCode);
        this.mediaEl.addEventListener('progress', this.progressHandler);
        this.mediaEl.addEventListener('volumechange', this.updateVolumeIcon);
        this.mediaEl.addEventListener('playing', this.playingHandler);
        this.mediaEl.addEventListener('pause', this.pauseHandler);
        this.mediaEl.addEventListener('ended', this.resetPlayIcon);
        this.mediaEl.addEventListener('seeked', this.seekHandler);
    }

    /**
     * Handles keyboard events for media
     *
     * @protected
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
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
