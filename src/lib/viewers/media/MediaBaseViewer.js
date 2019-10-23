import debounce from 'lodash/debounce';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import MediaControls from './MediaControls';
import PreviewError from '../../PreviewError';
import Timer from '../../Timer';
import getTokens from '../../tokens';
import { CLASS_ELEM_KEYBOARD_FOCUS, CLASS_HIDDEN, CLASS_IS_BUFFERING, CLASS_IS_VISIBLE } from '../../constants';
import { ERROR_CODE, MEDIA_METRIC, MEDIA_METRIC_EVENTS, VIEWER_EVENT } from '../../events';
import { getProp } from '../../util';

const CSS_CLASS_MEDIA = 'bp-media';
const CSS_CLASS_MEDIA_CONTAINER = 'bp-media-container';
const DEFAULT_VOLUME = 1;
const MEDIA_VOLUME_CACHE_KEY = 'media-volume';
const MEDIA_AUTOPLAY_CACHE_KEY = 'media-autoplay';
const MEDIA_VOLUME_INCREMENT = 0.05;
const EMIT_WAIT_TIME_IN_MILLIS = 100;
const SECONDS_UNIT_NAME = 'seconds';
const TIMESTAMP_UNIT_NAME = 'timestamp';
const INITIAL_TIME_IN_SECONDS = 0;
const ONE_MINUTE_IN_SECONDS = 60;
const ONE_HOUR_IN_SECONDS = 60 * ONE_MINUTE_IN_SECONDS;
const PLAY_PROMISE_NOT_SUPPORTED = 'play_promise_not_supported';
const MEDIA_TOKEN_EXPIRE_ERROR = 'PIPELINE_ERROR_READ';

class MediaBaseViewer extends BaseViewer {
    /** @property {Object} - Keeps track of the different media metrics */
    metrics = {
        [MEDIA_METRIC.bufferFill]: 0,
        [MEDIA_METRIC.duration]: 0,
        [MEDIA_METRIC.lagRatio]: 0,
        [MEDIA_METRIC.seeked]: false,
        [MEDIA_METRIC.totalBufferLag]: 0,
        [MEDIA_METRIC.watchLength]: 0,
    };

    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for callbacks
        this.containerClickHandler = this.containerClickHandler.bind(this);
        this.errorHandler = this.errorHandler.bind(this);
        this.handleAutoplay = this.handleAutoplay.bind(this);
        this.handleRate = this.handleRate.bind(this);
        this.handleTimeupdateFromMediaControls = this.handleTimeupdateFromMediaControls.bind(this);
        this.loadeddataHandler = this.loadeddataHandler.bind(this);
        this.mediaendHandler = this.mediaendHandler.bind(this);
        this.pauseHandler = this.pauseHandler.bind(this);
        this.playingHandler = this.playingHandler.bind(this);
        this.processBufferFillMetric = this.processBufferFillMetric.bind(this);
        this.processMetrics = this.processMetrics.bind(this);
        this.progressHandler = this.progressHandler.bind(this);
        this.resetPlayIcon = this.resetPlayIcon.bind(this);
        this.seekHandler = this.seekHandler.bind(this);
        this.setTimeCode = this.setTimeCode.bind(this);
        this.setVolume = this.setVolume.bind(this);
        this.handleLoadStart = this.handleLoadStart.bind(this);
        this.handleCanPlay = this.handleCanPlay.bind(this);
        this.toggleMute = this.toggleMute.bind(this);
        this.togglePlay = this.togglePlay.bind(this);
        this.updateVolumeIcon = this.updateVolumeIcon.bind(this);

        window.addEventListener('beforeunload', this.processMetrics);
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

        // Media Wrapper
        this.wrapperEl = this.createViewer(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_MEDIA;

        // Media Container
        this.mediaContainerEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.mediaContainerEl.setAttribute('tabindex', '-1');
        this.mediaContainerEl.className = CSS_CLASS_MEDIA_CONTAINER;
        this.mediaContainerEl.addEventListener('click', this.containerClickHandler);

        this.loadTimeout = 100000;
        this.oldVolume = DEFAULT_VOLUME;
        this.pauseListener = null;

        this.startTimeInSeconds = this.getStartTimeInSeconds(this.startAt);
    }

    /**
     * Converts a value and unit to seconds
     *
     * @param {Object} startAt - the unit and value that describes where to start the preview
     * @return {number} a time in seconds
     */
    getStartTimeInSeconds(startAt = {}) {
        let convertedValue = INITIAL_TIME_IN_SECONDS;

        const value = getProp(startAt, 'value');
        const unit = getProp(startAt, 'unit');

        if (!value || !unit) {
            return INITIAL_TIME_IN_SECONDS;
        }

        if (unit === SECONDS_UNIT_NAME) {
            convertedValue = parseFloat(value, 10);

            if (Number.isNaN(convertedValue) || convertedValue < 0) {
                // Negative values aren't allowed, start from beginning
                return INITIAL_TIME_IN_SECONDS;
            }
        } else if (unit === TIMESTAMP_UNIT_NAME) {
            convertedValue = this.convertTimestampToSeconds(value);
        } else {
            console.error('Invalid unit for start:', unit); // eslint-disable-line no-console
        }

        return convertedValue;
    }

    /**
     * [destructor]
     *
     * @override
     * @return {void}
     */
    destroy() {
        // Attempt to process the playback metrics at whatever point of playback has occurred
        // before we destroy the viewer
        this.processMetrics();

        // Best effort to emit current media metrics as page unloads
        window.removeEventListener('beforeunload', this.processMetrics);

        if (this.mediaControls) {
            this.mediaControls.removeAllListeners();
            this.mediaControls.destroy();
        }

        // Try catch is needed due to weird behavior when src is removed
        try {
            if (this.mediaEl) {
                this.removeEventListenersForMediaElement();
                this.removePauseEventListener();
                this.mediaEl.removeAttribute('src');
                this.mediaEl.load();
            }

            if (this.mediaContainerEl) {
                this.mediaContainerEl.removeChild(this.mediaEl);
                this.mediaContainerEl.removeEventListener('click', this.containerClickHandler);
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
        super.load();

        this.addEventListenersForMediaLoad();

        const template = this.options.representation.content.url_template;
        this.mediaUrl = this.createContentUrlWithAuthParams(template);

        this.mediaEl.addEventListener('error', this.errorHandler);
        this.mediaEl.setAttribute('title', this.options.file.name);

        if (Browser.isIOS()) {
            // iOS doesn't fire loadeddata event until some data loads
            // Adding autoplay prevents this but won't actually autoplay the video.
            // https://webkit.org/blog/6784/new-video-policies-for-ios/
            this.mediaEl.autoplay = true;
        }

        return this.getRepStatus()
            .getPromise()
            .then(() => {
                this.startLoadTimer();
                this.mediaEl.src = this.mediaUrl;
            })
            .catch(this.handleAssetError);
    }

    /**
     * Add event listeners to the media element related to loading of data
     * @return {void}
     */
    addEventListenersForMediaLoad() {
        this.mediaEl.addEventListener('canplay', this.handleCanPlay);
        this.mediaEl.addEventListener('loadeddata', this.loadeddataHandler);
        this.mediaEl.addEventListener('loadstart', this.handleLoadStart);
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

        if (this.loaded) {
            this.play(this.currentTime);
            return;
        }

        this.loadUI();

        if (this.isAutoplayEnabled()) {
            this.autoplay();
        }

        this.setMediaTime(this.startTimeInSeconds);
        this.resize();
        this.handleVolume();

        this.loaded = true;
        this.emit(VIEWER_EVENT.load);

        // Make media element visible after resize
        this.showMedia();

        if (this.options.autoFocus) {
            this.mediaContainerEl.focus();
        }
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
     * Refresh the access token
     *
     * @private
     * @return {Promise<Object>}
     */
    refreshToken = async () => {
        const tokenMap = await getTokens(this.options.file.id, this.options.tokenGenerator);
        return tokenMap[this.options.file.id];
    };

    /**
     * Handles media element loading errors.
     *
     * @private
     * @param {Error} err - error object
     * @emits error
     * @return {void}
     */
    errorHandler(err) {
        // eslint-disable-next-line
        console.error(err);

        const errorCode = getProp(err, 'target.error.code');
        const errorMessage = getProp(err, 'target.error.message');
        const errorDetails = errorCode ? { error_code: errorCode, error_message: errorMessage } : {};

        // refresh the token if token expired
        if (errorCode === MediaError.MEDIA_ERR_NETWORK && errorMessage.includes(MEDIA_TOKEN_EXPIRE_ERROR)) {
            this.refreshToken().then(newToken => {
                const { currentTime } = this.mediaEl;
                this.currentTime = currentTime;
                this.options.token = newToken;
                this.mediaUrl = this.createContentUrlWithAuthParams(this.options.representation.content.url_template);
                this.mediaEl.src = this.mediaUrl;
            });
            return;
        }

        const error = new PreviewError(ERROR_CODE.LOAD_MEDIA, __('error_refresh'), errorDetails);

        if (!this.isLoaded()) {
            this.handleDownloadError(error, this.mediaUrl);
        } else {
            this.triggerError(error);
        }
    }

    /**
     * Handler for playback rate
     *
     * @private
     * @emits ratechange
     * @return {void}
     */
    handleRate() {
        const speed = this.cache.get('media-speed') - 0;
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
        const volume = this.cache.has(MEDIA_VOLUME_CACHE_KEY) ? this.cache.get(MEDIA_VOLUME_CACHE_KEY) : DEFAULT_VOLUME;
        if (volume !== 0) {
            this.oldVolume = volume;
        }

        if (this.mediaEl.volume !== volume) {
            this.debouncedEmit('volume', volume);
            this.mediaEl.volume = volume;
        }
    }

    /**
     * Handler for autoplay
     *
     * @private
     * @emits autoplay
     * @return {void}
     */
    handleAutoplay() {
        this.emit('autoplay', this.isAutoplayEnabled());
    }

    /**
     * Handler for autoplay failure
     * Overridden in child class
     *
     * @protected
     */
    handleAutoplayFail = () => {};

    /**
     * Autoplay the media
     *
     * @private
     * @return {Promise}
     */
    autoplay() {
        return this.play().catch(error => {
            if (error.message === PLAY_PROMISE_NOT_SUPPORTED) {
                // Fallback to traditional autoplay tag if mediaEl.play does not return a promise
                this.mediaEl.autoplay = true;
            } else {
                this.handleAutoplayFail();
            }
        });
    }

    /**
     * Determines if autoplay is enabled
     *
     * @private
     * @return {boolean} Indicates if autoplay is enabled
     */
    isAutoplayEnabled() {
        return this.cache.get(MEDIA_AUTOPLAY_CACHE_KEY) === 'Enabled';
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
        this.mediaControls = new MediaControls(this.mediaContainerEl, this.mediaEl, this.cache);

        // Add event listeners for the media controls
        this.addEventListenersForMediaControls();

        // Add event listeners for the media element
        this.addEventListenersForMediaElement();
    }

    /**
     * Handles timeupdate event for MediaControls
     *
     * @private
     * @param {number} time - Time in seconds
     * @return {void}
     */
    handleTimeupdateFromMediaControls(time) {
        this.removePauseEventListener();
        this.setMediaTime(time);
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @protected
     * @return {void}
     */
    addEventListenersForMediaControls() {
        this.mediaControls.addListener('timeupdate', this.handleTimeupdateFromMediaControls);
        this.mediaControls.addListener('volumeupdate', this.setVolume);
        this.mediaControls.addListener('toggleplayback', this.togglePlay);
        this.mediaControls.addListener('togglemute', this.toggleMute);
        this.mediaControls.addListener('ratechange', this.handleRate);
        this.mediaControls.addListener('autoplaychange', this.handleAutoplay);
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
     * @return {void}
     */
    setMediaTime(time) {
        if (this.mediaEl && time >= 0 && time <= this.mediaEl.duration) {
            this.mediaEl.currentTime = time;
        }
    }

    /**
     * Updates volume
     *
     * @private
     * @param {number} volume - Must be a number between [0,1], per HTML5 spec
     * @return {void}
     */
    setVolume(volume) {
        this.cache.set(MEDIA_VOLUME_CACHE_KEY, volume, true);
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
        this.emit('play');
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

        this.metrics[MEDIA_METRIC.seeked] = true;
        this.debouncedEmit('seeked', this.mediaEl.currentTime);
    }

    /**
     * Emits the previewnextfile event if autoplay is enabled.
     *
     * @private
     * @emits previewnextfile
     * @return {void}
     */
    mediaendHandler() {
        this.resetPlayIcon();

        this.processMetrics();

        if (this.isAutoplayEnabled()) {
            this.emit(VIEWER_EVENT.mediaEndAutoplay);
        }
    }

    /**
     * Abstract. Must be implemented to process end of playback metrics
     * @emits MEDIA_METRIC_EVENTS.endPlayback
     * @return {void}
     */
    processMetrics() {}

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
     * Removes pause event listener if it exists
     *
     * @private
     * @return {void}
     */
    removePauseEventListener() {
        if (this.mediaEl && this.pauseListener) {
            this.mediaEl.removeEventListener('timeupdate', this.pauseListener);
        }
    }

    /**
     * Validates time parameter
     *
     * @private
     * @param {number} time - time for media
     * @return {boolean} - true if time is valid
     */
    isValidTime(time) {
        return typeof time === 'number' && time >= 0 && time <= this.mediaEl.duration;
    }

    /**
     * Play media, optionally from start time to end time
     *
     * @param {number} start - start time in seconds
     * @param {number} end - end time in seconds
     * @emits play
     * @return {Promise}
     */
    play(start, end) {
        const hasValidStart = this.isValidTime(start);
        const hasValidEnd = this.isValidTime(end);
        this.removePauseEventListener();
        if (hasValidStart) {
            if (hasValidEnd && start < end) {
                this.pause(end);
            }
            // Start playing media from <start> time
            this.setMediaTime(start);
        }
        if (arguments.length === 0 || hasValidStart) {
            // Play may return a promise depending on browser support. This promise
            // will resolve when playback starts.
            // https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
            const playPromise = this.mediaEl.play();
            this.handleRate();
            this.handleVolume();

            return playPromise && typeof playPromise.then === 'function'
                ? playPromise
                : Promise.reject(new Error(PLAY_PROMISE_NOT_SUPPORTED));
        }
        return Promise.resolve();
    }

    /**
     * Pause media
     *
     * @param {number} time - time at which media is paused
     * @param {boolean} [userInitiated] - True if user input initiated the pause
     * @emits pause
     * @return {void}
     */
    pause(time, userInitiated = false) {
        const hasValidTime = this.isValidTime(time);
        // Remove eventListener because segment completed playing or user paused manually
        this.removePauseEventListener();
        if (hasValidTime) {
            this.pauseListener = () => {
                if (this.mediaEl.currentTime > time) {
                    this.pause();
                }
            };
            this.mediaEl.addEventListener('timeupdate', this.pauseListener);
        } else {
            this.mediaEl.pause();
            this.emit('pause', {
                userInitiated,
            });
        }
    }

    /**
     * Toggle playback
     *
     * @private
     * @return {void}
     */
    togglePlay() {
        if (this.mediaEl.paused) {
            this.play();
        } else {
            this.pause(undefined, true);
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
            this.cache.set(MEDIA_VOLUME_CACHE_KEY, 0, true);
        } else {
            this.cache.set(MEDIA_VOLUME_CACHE_KEY, this.oldVolume, true);
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
        this.mediaEl.addEventListener('ended', this.mediaendHandler);
        this.mediaEl.addEventListener('pause', this.pauseHandler);
        this.mediaEl.addEventListener('playing', this.playingHandler);
        this.mediaEl.addEventListener('progress', this.progressHandler);
        this.mediaEl.addEventListener('seeked', this.seekHandler);
        this.mediaEl.addEventListener('timeupdate', this.setTimeCode);
        this.mediaEl.addEventListener('volumechange', this.updateVolumeIcon);
    }

    /**
     * Removes event listeners to the media element
     * @return {void}
     */
    removeEventListenersForMediaElement() {
        this.mediaEl.removeEventListener('canplay', this.handleCanPlay);
        this.mediaEl.removeEventListener('ended', this.mediaendHandler);
        this.mediaEl.removeEventListener('error', this.errorHandler);
        this.mediaEl.removeEventListener('loadeddata', this.loadeddataHandler);
        this.mediaEl.removeEventListener('loadstart', this.handleLoadStart);
        this.mediaEl.removeEventListener('pause', this.pauseHandler);
        this.mediaEl.removeEventListener('playing', this.playingHandler);
        this.mediaEl.removeEventListener('progress', this.progressHandler);
        this.mediaEl.removeEventListener('seeked', this.seekHandler);
        this.mediaEl.removeEventListener('timeupdate', this.setTimeCode);
        this.mediaEl.removeEventListener('volumechange', this.updateVolumeIcon);
    }

    /**
     * Callback from the 'loadstart' event from the media element. Triggers a timer to measure the initial buffer fill.
     * @return {void}
     */
    handleLoadStart() {
        const tag = this.createTimerTag(MEDIA_METRIC.bufferFill);
        Timer.start(tag);
    }

    /**
     * Callback from the 'canplay' event from the media element. The first time this event is triggered we
     * calculate the initial buffer fill time.
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/canplay_event}
     * @emits MEDIA_METRIC_EVENTS.bufferFill
     * @return {void}
     */
    handleCanPlay() {
        const tag = this.createTimerTag(MEDIA_METRIC.bufferFill);
        Timer.stop(tag);

        // Only interested in the first event after 'loadstart' to determine the buffer fill
        this.mediaEl.removeEventListener('canplay', this.handleCanPlay);

        this.processBufferFillMetric();
    }

    /**
     * Abstract. Processes the buffer fill metric which represents the initial buffer time before playback begins
     * @emits MEDIA_METRIC_EVENTS.bufferFill
     * @return {void}
     */
    processBufferFillMetric() {}

    /**
     * Seeks forwards/backwards from current point
     *
     * @private
     * @param {number} increment - Increment in seconds. Negative to seek backwards, positive to seek forwards
     * @return {void}
     */
    quickSeek(increment) {
        let newTime = this.mediaEl.currentTime + increment;
        this.removePauseEventListener();
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
            case 'c':
            case 'shift+c':
                this.mediaControls.toggleSubtitles();
                break;
            default:
                return false;
        }
        this.mediaControls.show();
        return true;
    }

    /**
     * Converts from a youtube style timestamp to seconds
     *
     * @param {string} timestamp - the youtube style timestamp eg. "1h2m3s"
     * @return {number} - the time in seconds
     */
    convertTimestampToSeconds(timestamp) {
        let timeInSeconds = INITIAL_TIME_IN_SECONDS;
        // Supports optional decimal points
        const TIMESTAMP_REGEX = /^([0-9]+(\.[0-9]*)?[smh]?){1,3}$/;
        const HOUR_REGEX = /[0-9]+(\.[0-9]*)?h/;
        const MINUTE_REGEX = /[0-9]+(\.[0-9]*)?m/;
        const SECOND_REGEX = /[0-9]+(\.[0-9]*)?s/;

        if (!timestamp || !TIMESTAMP_REGEX.test(timestamp)) {
            return timeInSeconds;
        }

        // Gets the first match for all the units
        const hours = HOUR_REGEX.exec(timestamp);
        const minutes = MINUTE_REGEX.exec(timestamp);
        const seconds = SECOND_REGEX.exec(timestamp);

        /**
         * Validates a substring match and converts to float
         *
         * @param {string} match - the timestamp substring e.g. 1h, 2m, or 3s
         * @return {number} - the number for the given unit
         */
        const getValueOfMatch = match => {
            // Strip off unit (h, m, s) and convert to float
            const parsedMatch = parseFloat(match[0].slice(0, -1), 10);
            return Number.isNaN(parsedMatch) ? 0 : parsedMatch;
        };

        if (hours) {
            timeInSeconds += ONE_HOUR_IN_SECONDS * getValueOfMatch(hours);
        }

        if (minutes) {
            timeInSeconds += ONE_MINUTE_IN_SECONDS * getValueOfMatch(minutes);
        }

        if (seconds) {
            timeInSeconds += getValueOfMatch(seconds);
        }

        return timeInSeconds;
    }

    /**
     * Overrides the base method
     *
     * @override
     * @return {Array} - the array of metric names to be emitted only once
     */
    getMetricsWhitelist() {
        return [MEDIA_METRIC_EVENTS.bufferFill, MEDIA_METRIC_EVENTS.endPlayback];
    }

    /**
     * Utility to create a Timer tag name
     * @param {string} tagName - tag name
     */
    createTimerTag(tagName) {
        return Timer.createTag(this.options.file.id, tagName);
    }
}

export default MediaBaseViewer;
