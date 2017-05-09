import autobind from 'autobind-decorator';
import debounce from 'lodash.debounce';
import BaseViewer from '../BaseViewer';
import cache from '../../Cache';
import Browser from '../../Browser';
import MediaControls from './MediaControls';
import { CLASS_ELEM_KEYBOARD_FOCUS, CLASS_HIDDEN, CLASS_IS_BUFFERING, CLASS_IS_VISIBLE } from '../../constants';
import { ICON_FILE_MEDIA } from '../../icons/icons';

const CSS_CLASS_MEDIA = 'bp-media';
const CSS_CLASS_MEDIA_CONTAINER = 'bp-media-container';
const DEFAULT_VOLUME = 1;
const MEDIA_VOLUME_CACHE_KEY = 'media-volume';
const MEDIA_VOLUME_INCREMENT = 0.05;
const EMIT_WAIT_TIME_IN_MILLIS = 100;


@autobind
class MediaBaseViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = this.fileLoadingIcon || ICON_FILE_MEDIA;

        // Call super() to set up common layout
        super.setup();

        // Media Wrapper
        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_MEDIA;

        // Media Wrapper
        this.mediaContainerEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.mediaContainerEl.setAttribute('tabindex', '-1');
        this.mediaContainerEl.className = CSS_CLASS_MEDIA_CONTAINER;
        this.mediaContainerEl.addEventListener('click', this.containerClickHandler);

        this.loadTimeout = 100000;
        this.oldVolume = DEFAULT_VOLUME;
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
                this.mediaContainerEl.removeEventListener(this.containerClickHandler);
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
     * @return {Promise} Promise to load representations
     */
    load() {
        this.setup();
        super.load();

        const template = this.options.representation.content.url_template;
        this.mediaUrl = this.createContentUrlWithAuthParams(template);
        this.mediaEl.addEventListener('loadeddata', this.loadeddataHandler);
        this.mediaEl.addEventListener('error', this.errorHandler);

        if (Browser.isIOS()) {
            // iOS doesn't fire loadeddata event till some data loads
            // Adding autoplay helps with that and itself won't autoplay.
            // https://webkit.org/blog/6784/new-video-policies-for-ios/
            this.mediaEl.autoplay = true;
        }

        return this.getRepStatus().getPromise().then(() => {
            this.mediaEl.src = this.mediaUrl;
        }).catch(this.handleAssetError);
    }

    /**
     * Click handler for media container
     *
     * @private
     * @return {void}
     */
    containerClickHandler() {
        this.mediaContainerEl.classList.remove(CLASS_ELEM_KEYBOARD_FOCUS);
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
        this.mediaContainerEl.focus();
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
     * @emits ratechange
     * @return {void}
     */
    handleRate() {
        const speed = cache.get('media-speed') - 0;
        if (speed && this.mediaEl.playbackRate !== speed && this.mediaEl.playbackRate > 0) {
            this.emit('ratechange', speed);
        }

        this.mediaEl.playbackRate = speed;
    }

    /**
     * Handler for volume
     *
     * @private
     * @emits volume
     * @return {void}
     */
    handleVolume() {
        const volume = cache.has(MEDIA_VOLUME_CACHE_KEY) ? cache.get(MEDIA_VOLUME_CACHE_KEY) : DEFAULT_VOLUME;
        if (volume !== 0) {
            this.oldVolume = volume;
        }

        if (this.mediaEl.volume !== volume) {
            this.debouncedEmit('volume', volume);
            this.mediaEl.volume = volume;
        }
    }

    /**
     * Resize handler
     *
     * @private
     * @return {Function} debounced resize handler
     */
    debouncedEmit = debounce((event, data) => {
        this.emit(event, data);
    }, EMIT_WAIT_TIME_IN_MILLIS);

    /**
     * Loads the controls
     *
     * @private
     * @return {void}
     */
    loadUI() {
        this.mediaControls = new MediaControls(this.mediaContainerEl, this.mediaEl);

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
     * @return {void}
     */
    addEventListenersForMediaControls() {
        this.mediaControls.addListener('timeupdate', this.setMediaTime);
        this.mediaControls.addListener('volumeupdate', this.setVolume);
        this.mediaControls.addListener('toggleplayback', this.togglePlay);
        this.mediaControls.addListener('togglemute', this.toggleMute);
        this.mediaControls.addListener('ratechange', this.handleRate);
    }

    /**
     * Updates time code.
     *
     * @private
     * @return {void}
     */
    setTimeCode() {
        this.mediaControls.setTimeCode(this.mediaEl.currentTime);
    }

    /**
     * Updates media element's time
     *
     * @private
     * @param {double} time - Time in seconds
     */
    setMediaTime(time) {
        this.mediaEl.currentTime = time;
    }

    /**
     * Updates volume
     *
     * @private
     * @param {number} volume - Must be a number between [0,1], per HTML5 spec
     */
    setVolume(volume) {
        cache.set(MEDIA_VOLUME_CACHE_KEY, volume);
        this.handleVolume();
    }

    /**
     * Updates volume icon.
     *
     * @private
     * @return {void}
     */
    updateVolumeIcon() {
        this.mediaControls.updateVolumeIcon(this.mediaEl.volume);
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
        this.mediaControls.showPauseIcon();
        this.hideLoadingIcon();
        this.handleRate();
        this.handleVolume();
    }

    /**
     * Updates progress.
     *
     * @private
     * @return {void}
     */
    progressHandler() {
        this.mediaControls.updateProgress();
    }

    /**
     * Shows the play icon.
     *
     * @private
     * @return {void}
     */
    pauseHandler() {
        this.mediaControls.showPlayIcon();
    }

    /**
     * Emits the seek event and hides the loading icon.
     *
     * @private
     * @emits seeked
     * @return {void}
     */
    seekHandler() {
        this.hideLoadingIcon();
        this.debouncedEmit('seeked', this.mediaEl.currentTime);
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
        this.mediaControls.setTimeCode(0);
        this.hideLoadingIcon();
        this.pauseHandler();
    }

    /**
     * Toggle playback
     *
     * @private
     * @emits play
     * @emits pause
     * @return {void}
     */
    togglePlay() {
        if (this.mediaEl.paused) {
            this.mediaEl.play();
            this.emit('play');
            this.handleRate();
            this.handleVolume();
        } else {
            this.mediaEl.pause();
            this.emit('pause');
        }
    }

    /**
     * Toggle mute
     *
     * @private
     * @return {void}
     */
    toggleMute() {
        if (this.mediaEl.volume) {
            this.oldVolume = this.mediaEl.volume;
            cache.set(MEDIA_VOLUME_CACHE_KEY, 0);
        } else {
            cache.set(MEDIA_VOLUME_CACHE_KEY, this.oldVolume);
        }
        this.handleVolume();
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
     * @protected
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
     * Seeks forwards/backwards from current point
     *
     * @private
     * @param {number} increment - Increment in seconds. Negative to seek backwards, positive to seek forwards
     * @return {void}
     */
    quickSeek(increment) {
        let newTime = this.mediaEl.currentTime + increment;
        // Make sure it's within bounds
        newTime = Math.max(0, Math.min(newTime, this.mediaEl.duration));
        this.setMediaTime(newTime);
    }

    /**
     * Increases volume by a small increment
     *
     * @private
     * @return {void}
     */
    increaseVolume() {
        let newVol = Math.round((this.mediaEl.volume + MEDIA_VOLUME_INCREMENT) * 100) / 100;
        newVol = Math.min(1, newVol);
        this.setVolume(newVol);
    }

    /**
     * Decreases volume by a small increment
     *
     * @private
     * @return {void}
     */
    decreaseVolume() {
        let newVol = Math.round((this.mediaEl.volume - MEDIA_VOLUME_INCREMENT) * 100) / 100;
        newVol = Math.max(0, newVol);
        this.setVolume(newVol);
    }

    /**
     * Handles keyboard events for media
     *
     * @protected
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
     */
    onKeydown(key) {
        // Return false when media controls are not ready
        if (!this.mediaControls) {
            return false;
        }

        const k = key.toLowerCase();
        switch (k) {
            case 'tab':
            case 'shift+tab':
                this.mediaContainerEl.classList.add(CLASS_ELEM_KEYBOARD_FOCUS);
                this.mediaControls.show();
                return false; // So that tab can proceed to do its default behavior of going to the next element
            case 'space':
            case 'k':
                this.togglePlay();
                break;
            case 'arrowleft':
                if (this.mediaControls.isVolumeScrubberFocused()) {
                    this.decreaseVolume();
                } else {
                    this.quickSeek(-5);
                }
                break;
            case 'j':
                this.quickSeek(-10);
                break;
            case 'arrowright':
                if (this.mediaControls.isVolumeScrubberFocused()) {
                    this.increaseVolume();
                } else {
                    this.quickSeek(5);
                }
                break;
            case 'l':
                this.quickSeek(10);
                break;
            case '0':
            case 'home':
                this.setMediaTime(0);
                break;
            case 'arrowup':
                if (this.mediaControls.isTimeScrubberFocused()) {
                    this.quickSeek(5);
                } else {
                    this.increaseVolume();
                }
                break;
            case 'arrowdown':
                if (this.mediaControls.isTimeScrubberFocused()) {
                    this.quickSeek(-5);
                } else {
                    this.decreaseVolume();
                }
                break;
            case 'shift+>':
                this.mediaControls.increaseSpeed();
                break;
            case 'shift+<':
                this.mediaControls.decreaseSpeed();
                break;
            case 'f':
            case 'shift+f':
                this.mediaControls.toggleFullscreen();
                break;
            case 'm':
            case 'shift+m':
                this.toggleMute();
                break;
            default:
                return false;
        }
        this.mediaControls.show();
        return true;
    }
}

export default MediaBaseViewer;
