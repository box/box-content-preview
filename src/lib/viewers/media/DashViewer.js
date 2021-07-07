import React from 'react';
import DashControls from './DashControls';
import fullscreen from '../../Fullscreen';
import getLanguageName from '../../lang';
import PreviewError from '../../PreviewError';
import Timer from '../../Timer';
import VideoBaseViewer from './VideoBaseViewer';
import { appendQueryParams, getProp } from '../../util';
import { ERROR_CODE, VIEWER_EVENT, MEDIA_METRIC, MEDIA_METRIC_EVENTS } from '../../events';
import { getRepresentation } from '../../file';
import { MEDIA_STATIC_ASSETS_VERSION, SUBTITLES_OFF } from '../../constants';
import './Dash.scss';

const CSS_CLASS_DASH = 'bp-media-dash';
const CSS_CLASS_HD = 'bp-media-controls-is-hd';
const SEGMENT_SIZE = 5;
const MAX_BUFFER = SEGMENT_SIZE * 12; // 60 sec
const MANIFEST = 'manifest.mpd';
const DEFAULT_VIDEO_WIDTH_PX = 854;
const DEFAULT_VIDEO_HEIGHT_PX = 480;

const SHAKA_CODE_ERROR_RECOVERABLE = 1;

class DashViewer extends VideoBaseViewer {
    /** @property {Object} - shakaExtern.TextDisplayer that displays auto-generated captions, if available */
    autoCaptionDisplayer;

    /** @property {Array<Object>} - Array of audio tracks for the video */
    audioTracks = [];

    /** @property {string} - ID of the selected audio track */
    selectedAudioTrack;

    /** @property {string} - Video playback quality */
    selectedQuality = 'sd';

    /** @property {string} - ID of the selected text track */
    selectedSubtitle = SUBTITLES_OFF;

    /** @property {Array<Object>} - Array of text tracks for the video */
    textTracks = [];

    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        this.api = options.api;
        // Bind context for callbacks
        this.adaptationHandler = this.adaptationHandler.bind(this);
        this.getBandwidthInterval = this.getBandwidthInterval.bind(this);
        this.handleAudioTrack = this.handleAudioTrack.bind(this);
        this.handleBuffering = this.handleBuffering.bind(this);
        this.handleQuality = this.handleQuality.bind(this);
        this.handleSubtitle = this.handleSubtitle.bind(this);
        this.loadeddataHandler = this.loadeddataHandler.bind(this);
        this.requestFilter = this.requestFilter.bind(this);
        this.restartPlayback = this.restartPlayback.bind(this);
        this.setAudioTrack = this.setAudioTrack.bind(this);
        this.setQuality = this.setQuality.bind(this);
        this.setSubtitle = this.setSubtitle.bind(this);
        this.shakaErrorHandler = this.shakaErrorHandler.bind(this);
        this.toggleSubtitles = this.toggleSubtitles.bind(this);
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        // stats
        this.bandwidthHistory = [];
        this.switchHistory = [];

        // tracks
        this.hdVideoId = -1;
        this.sdVideoId = -1;
        this.textTracks = []; // Must be sorted by representation id
        this.audioTracks = [];

        // dash specific class
        this.wrapperEl.classList.add(CSS_CLASS_DASH);
    }

    /**
     * [destructor]
     *
     * @override
     * @emits bandwidthHistory
     * @emits switchHistory
     * @return {void}
     */
    destroy() {
        // Log bandwidth history
        this.emit('bandwidthhistory', this.bandwidthHistory);
        this.emit('switchhistory', this.switchHistory);

        // Stop polling for filmstrip
        if (this.filmstripStatus) {
            this.filmstripStatus.destroy();
        }

        clearInterval(this.statsIntervalId);
        if (this.player) {
            this.player.destroy();
            this.player = undefined;
        }
        if (this.mediaControls) {
            this.mediaControls.removeListener('qualitychange', this.handleQuality);
            this.mediaControls.removeListener('subtitlechange', this.handleSubtitle);
            this.mediaControls.removeListener('audiochange', this.handleAudioTrack);
        }
        this.removeStats();
        super.destroy();
    }

    /**
     * Loads a media source.
     *
     * @override
     * @return {void}
     */
    load() {
        this.mediaUrl = this.options.representation.content.url_template;
        this.watermarkCacheBust = Date.now();

        this.addEventListenersForMediaLoad();

        return Promise.all([this.loadAssets(this.getJSAssets()), this.getRepStatus().getPromise()])
            .then(() => {
                this.loadDashPlayer();
                this.resetLoadTimeout();
            })
            .catch(this.handleAssetError);
    }

    /**
     * Prefetches assets for dash.
     *
     * @param {boolean} [options.assets] - Whether or not to prefetch static assets
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ assets = true, content = true }) {
        if (assets) {
            this.prefetchAssets(this.getJSAssets());
        }

        const { representation } = this.options;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            this.api.get(this.createContentUrlWithAuthParams(template, MANIFEST), { type: 'document' });
        }
    }

    /**
     * Returns shaka player assets.
     * Overriden by Video360.js
     *
     * @protected
     * @return {void}
     */
    getJSAssets() {
        return [`third-party/media/${MEDIA_STATIC_ASSETS_VERSION}/shaka-player.compiled.js`];
    }

    /**
     * Creates a new shaka player
     *
     * @private
     * @see {@link http://shaka-player-demo.appspot.com/docs/api/tutorial-network-and-buffering-config.html} for networking
     * @return {void}
     */
    loadDashPlayer() {
        /* global shaka */
        // Polyfill
        shaka.polyfill.installAll();
        this.adapting = true;
        this.player = new shaka.Player(this.mediaEl);
        this.player.addEventListener('adaptation', this.adaptationHandler);
        this.player.addEventListener('error', this.shakaErrorHandler);
        this.player.addEventListener('buffering', this.handleBuffering);
        this.player.configure({
            abr: {
                enabled: false,
            },
            streaming: {
                bufferingGoal: MAX_BUFFER,
                retryParameters: {
                    timeout: 0, // timeout in ms, after which we abort a request; 0 means never
                    maxAttempts: 100, // the maximum number of requests before we fail
                    baseDelay: 500, // the base delay in ms between retries
                    backoffFactor: 2, // the multiplicative backoff factor between retries
                    fuzzFactor: 0.5, // the fuzz factor to apply to each retry delay
                },
            },
        });
        this.player.getNetworkingEngine().registerRequestFilter(this.requestFilter);

        this.startLoadTimer();
        this.player.load(this.mediaUrl, this.startTimeInSeconds).catch(this.shakaErrorHandler);
    }

    /**
     * Handles the buffering events from shaka player
     *
     * @see {@link https://shaka-player-demo.appspot.com/docs/api/shaka.Player.html#.event:BufferingEvent}
     * @param {Object} object - BufferingEvent object
     * @param {boolean} object.buffering - Indicates whether the player is buffering or not
     */
    handleBuffering({ buffering }) {
        const tag = this.createTimerTag(MEDIA_METRIC.totalBufferLag);

        if (buffering) {
            Timer.start(tag);
        } else {
            Timer.stop(tag);
            this.metrics[MEDIA_METRIC.totalBufferLag] += Timer.get(tag).elapsed;
            Timer.reset(tag);
        }
    }

    /**
     * Processes the buffer fill metric which represents the initial buffer time before playback begins
     * @override
     * @emits MEDIA_METRIC_EVENTS.bufferFill
     * @return {void}
     */
    processBufferFillMetric() {
        const tag = this.createTimerTag(MEDIA_METRIC.bufferFill);
        const bufferFill = Timer.get(tag).elapsed;
        this.metrics[MEDIA_METRIC.bufferFill] = bufferFill;

        this.emitMetric(MEDIA_METRIC_EVENTS.bufferFill, bufferFill);
    }

    /**
     * Processes the media playback metrics
     * @override
     * @emits MEDIA_METRIC_EVENTS.endPlayback
     * @return {void}
     */
    processMetrics() {
        if (!this.loaded) {
            return;
        }

        const totalBufferLag = this.metrics[MEDIA_METRIC.totalBufferLag];
        const watchLength = this.determineWatchLength();

        this.metrics[MEDIA_METRIC.totalBufferLag] = totalBufferLag;
        this.metrics[MEDIA_METRIC.lagRatio] = totalBufferLag / watchLength;
        this.metrics[MEDIA_METRIC.duration] = this.mediaEl ? this.mediaEl.duration * 1000 : 0;
        this.metrics[MEDIA_METRIC.watchLength] = watchLength;

        this.emitMetric(MEDIA_METRIC_EVENTS.endPlayback, this.metrics[MEDIA_METRIC.lagRatio]);
    }

    /**
     * Determines the watch length, or how much of the media was consumed
     * @return {number} - The watch length in milliseconds
     */
    determineWatchLength() {
        if (!this.mediaEl || !this.mediaEl.played) {
            return -1;
        }

        const playedParts = this.mediaEl.played;
        let playLength = 0;
        for (let i = 0; i < playedParts.length; i += 1) {
            const start = playedParts.start(i);
            const end = playedParts.end(i);
            playLength += end - start;
        }

        return playLength * 1000;
    }

    /**
     * A networking filter to append representation URLs with tokens
     * Manifest type will use an asset name. Segments will not.
     *
     * @private
     * @param {string} type - Request type
     * @param {Request} request - Request to filter
     * @return {void}
     */
    requestFilter(type, request) {
        const asset = type === shaka.net.NetworkingEngine.RequestType.MANIFEST ? MANIFEST : undefined;
        /* eslint-disable no-param-reassign */
        request.uris = request.uris.map(uri => {
            let newUri = this.createContentUrlWithAuthParams(uri, asset);
            if (asset !== MANIFEST && this.options.file.watermark_info.is_watermarked) {
                newUri = appendQueryParams(newUri, { watermark_content: this.watermarkCacheBust });
            }
            return newUri;
        });
        /* eslint-enable no-param-reassign */
    }

    /**
     * Gets the active track
     *
     * @private
     * @return {Object|undefined} Active track or undefined if there is no active track
     */
    getActiveTrack() {
        const tracks = this.player.getVariantTracks();
        return tracks.find(track => track.active);
    }

    /**
     * Shows the loading indicator
     *
     * @override
     * @param {number} id - Rep id
     * @return {void}
     */
    showLoadingIcon(id) {
        const activeTrack = this.getActiveTrack();
        if (activeTrack.id !== id) {
            super.showLoadingIcon();
        }
    }

    /**
     * Given a videoId (e.g. hd video id), enables the track with that video ID
     * while maintaining the SAME AUDIO as the active track.
     *
     * @private
     * @param {number} videoId - The id of the video used in the variant (provided by Shaka)
     * @return {void}
     */
    enableVideoId(videoId) {
        const tracks = this.player.getVariantTracks();
        const activeTrack = this.getActiveTrack();
        const newTrack = tracks.find(track => track.videoId === videoId && track.audioId === activeTrack.audioId);
        if (newTrack && newTrack.id !== activeTrack.id) {
            this.showLoadingIcon(newTrack.id);
            this.player.selectVariantTrack(newTrack, true);
        }
    }

    /**
     * Given a an audio ID (e.g. english track audio ID), enables the track with that audio ID
     * while maintaining the SAME VIDEO as the active track.
     *
     * @private
     * @param {number} role - The role of the audio used in the variant (provided by Shaka)
     * @return {void}
     */
    enableAudioId(role) {
        const tracks = this.player.getVariantTracks();
        const activeTrack = this.getActiveTrack();
        // We select a track that has the desired audio role but maintains the same video ID as our currently active track.
        const newTrack = tracks.find(track => track.roles[0] === role && track.videoId === activeTrack.videoId);
        if (newTrack && newTrack.audioId !== activeTrack.audioId) {
            this.showLoadingIcon(newTrack.id);
            this.player.selectVariantTrack(newTrack, true);
        }
    }

    /**
     * Enables or disables automatic adaptation
     *
     * @private
     * @param {boolean} adapt - Enable or disable adaptation
     * @return {void}
     */
    enableAdaptation(adapt) {
        this.adapting = adapt;
        this.player.configure({ abr: { enabled: adapt } });
    }

    /**
     * Handler for subtitle
     *
     * @private
     * @emits subtitlechange
     * @return {void}
     */
    handleSubtitle() {
        const subtitleIdx = parseInt(this.cache.get('media-subtitles'), 10);

        // Auto-generated index 0 ==> turn auto-generated text track on
        if (this.autoCaptionDisplayer && subtitleIdx === 0) {
            // Manually set text visibility with the custom Shaka Text Displayer
            this.autoCaptionDisplayer.setTextVisibility(true);
            this.emit('subtitlechange', __('auto_generated'));

            // Valid non-auto-generated index ==> turn specified text track on
        } else if (this.textTracks[subtitleIdx] !== undefined) {
            const track = this.textTracks[subtitleIdx];
            this.player.selectTextTrack(track);
            this.player.setTextTrackVisibility(true);
            this.emit('subtitlechange', track.language);

            // Index -1 ==> turn subtitles/captions off
        } else {
            if (this.autoCaptionDisplayer) {
                this.autoCaptionDisplayer.setTextVisibility(false);
            }

            this.player.setTextTrackVisibility(false);
            this.emit('subtitlechange', null);
        }
    }

    /**
     * Handler for audio track
     *
     * @private
     * @emits audiochange
     * @return {void}
     */
    handleAudioTrack() {
        const audioIdx = parseInt(this.cache.get('media-audiotracks'), 10);
        const newAudioTrack = this.audioTracks[audioIdx];
        if (newAudioTrack !== undefined) {
            this.enableAudioId(newAudioTrack.role);
        }
    }

    /**
     * Handler for hd/sd/auto video
     *
     * @private
     * @emits qualitychange
     * @return {void}
     */
    handleQuality() {
        // If there is no HD rep, use the standard definition option
        const quality = this.hdVideoId !== -1 ? this.cache.get('media-quality') : 'sd';

        switch (quality) {
            case 'hd':
                this.enableAdaptation(false);
                this.enableVideoId(this.hdVideoId);
                break;
            case 'sd':
                this.enableAdaptation(false);
                this.enableVideoId(this.sdVideoId);
                break;
            case 'auto':
            default:
                this.enableAdaptation(true);
                break;
        }

        if (!this.getViewerOption('useReactControls')) {
            this.showGearHdIcon(this.getActiveTrack());
        }

        if (quality) {
            this.emit('qualitychange', quality);
        }
    }

    /**
     * Determines if the current track is playing HD video, then shows
     * or hides 'HD' next to the gear icon
     *
     * @param {Object} activeTrack - the currently playing track
     * @return {void}
     */
    showGearHdIcon(activeTrack = {}) {
        const isPlayingHD = activeTrack.videoId === this.hdVideoId;

        if (isPlayingHD) {
            this.wrapperEl.classList.add(CSS_CLASS_HD);
        } else {
            this.wrapperEl.classList.remove(CSS_CLASS_HD);
        }
    }

    /**
     * Determines whether the player is playing HD currently
     * @returns {Boolean}
     */
    isPlayingHD() {
        const activeTrack = this.getActiveTrack();
        return activeTrack.videoId === this.hdVideoId;
    }

    /**
     * Handles adaptation changes
     *
     * @private
     * @emits adaptation
     * @return {void}
     */
    adaptationHandler() {
        const activeTrack = this.getActiveTrack();

        if (!this.getViewerOption('useReactControls')) {
            this.showGearHdIcon(activeTrack);
        }

        if (!this.isLoaded()) {
            return;
        }
        if (this.adapting) {
            this.emit('adaptation', activeTrack.bandwidth);
        }
        this.hideLoadingIcon();

        if (this.getViewerOption('useReactControls')) {
            this.renderUI();
        }
    }

    /**
     * Determain whether is an expired token error
     *
     * @private
     * @param {Object} details - error details
     * @return {bool}
     */
    isExpiredTokenError({ details }) {
        // unauthorized error may be caused by token expired
        return details.code === shaka.util.Error.Code.BAD_HTTP_STATUS && details.data[1] === 401;
    }

    /**
     * Restart playback using new token
     *
     * @private
     * @param {string} newToken - new token
     * @return {void}
     */
    restartPlayback(newToken) {
        this.options.token = newToken;
        if (this.player.retryStreaming()) {
            this.retryTokenCount = 0;
        }
    }

    /**
     * Handles errors thrown by shaka player. See https://shaka-player-demo.appspot.com/docs/api/shaka.util.Error.html
     *
     * @private
     * @param {Object} shakaError - Error to handle
     * @return {void}
     */
    shakaErrorHandler(shakaError) {
        const normalizedShakaError = shakaError.detail ? shakaError.detail : shakaError;
        const error = new PreviewError(
            ERROR_CODE.SHAKA,
            __('error_refresh'),
            {
                code: normalizedShakaError.code,
                data: normalizedShakaError.data,
                severity: normalizedShakaError.severity,
            },
            `Shaka error. Code = ${normalizedShakaError.code}, Category = ${
                normalizedShakaError.category
            }, Severity = ${normalizedShakaError.severity}, Data = ${normalizedShakaError.data.toString()}`,
        );

        if (this.handleExpiredTokenError(error)) {
            return;
        }

        if (normalizedShakaError.severity > SHAKA_CODE_ERROR_RECOVERABLE) {
            // Anything greater than a recoverable error should be critical
            if (normalizedShakaError.code === shaka.util.Error.Code.HTTP_ERROR) {
                const downloadURL = normalizedShakaError.data[0];
                this.handleDownloadError(error, downloadURL);
                return;
            }

            // critical error
            this.triggerError(error);
        }
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @override
     * @return {void}
     */
    addEventListenersForMediaControls() {
        super.addEventListenersForMediaControls();
        this.mediaControls.addListener('qualitychange', this.handleQuality);
        this.mediaControls.addListener('subtitlechange', this.handleSubtitle);
        this.mediaControls.addListener('audiochange', this.handleAudioTrack);
    }

    /**
     * Loads captions/subtitles into the settings menu
     *
     * @return {void}
     */
    loadSubtitles() {
        // Load subtitles from video, if available
        this.textTracks = this.player.getTextTracks().sort((track1, track2) => track1.id - track2.id);

        if (this.textTracks.length > 0) {
            if (this.getViewerOption('useReactControls')) {
                this.initSubtitles();
            } else {
                this.mediaControls.initSubtitles(
                    this.textTracks.map(track => getLanguageName(track.language) || track.language),
                    getLanguageName(this.options.location.locale.substring(0, 2)),
                );
            }
        }
    }

    /**
     * Gets the subtitle track ID based on whether subtitles are being shown
     *
     * @returns {number}
     */
    getSubtitleId() {
        // If subtitles are being shown, then return the ID of the selected audio track. If not, then return
        // the subtitles off ID
        return this.cache.get('media-subtitles-toggle') ? this.selectedSubtitle : SUBTITLES_OFF;
    }

    /**
     * Initializes the subtitles to the appropriate text track, if applicable
     *
     * @return {void}
     */
    initSubtitles() {
        const clientLanguage = getLanguageName(this.options.location.locale.substring(0, 2));
        const showSubtitles = this.cache.get('media-subtitles-toggle');

        // If no entry in the cache (nor localstorage) default to showing CC
        if (showSubtitles === undefined) {
            this.cache.set('media-subtitles-toggle', true, true);
        }

        this.textTracks = this.textTracks.map(track => ({
            ...track,
            displayLanguage: getLanguageName(track.language) || track.language,
        }));

        // Do intelligent selection: Prefer user's language, fallback to English, then first subtitle in list
        // Use the previewer's locale to determine preferred language
        const clientTextTrack = this.textTracks.find(({ displayLanguage }) => displayLanguage === clientLanguage);
        // Fall back to English if user's language doesn't exist
        const englishTextTrack = this.textTracks.find(({ displayLanguage }) => displayLanguage === 'English');
        // Fall back to first subtitle in list
        const defaultTextTrack = this.textTracks[0];

        this.selectedSubtitle = (clientTextTrack || englishTextTrack || defaultTextTrack).id;

        this.setSubtitle(this.getSubtitleId());
    }

    /**
     * Loads auto-generated captions from skills using a shaka SimpleTextDisplayer
     * @TODO 07-07-18: Support both auto-generated captions and subtitles from videos
     *
     * @public
     * @param {Object} transcriptCard - transcript card from Box Skills
     * @return {void}
     */
    loadAutoGeneratedCaptions(transcriptCard) {
        // Avoid regenerating captions if the object has not changed
        if (this.transcript === transcriptCard) {
            return;
        }

        this.transcript = transcriptCard;
        const textCues = this.createTextCues(transcriptCard);

        // Don't do anything if there are no cues
        if (!textCues.length) {
            return;
        }

        // We know we are editing the transcript if we already have created an autoCaptionDisplayer
        if (this.autoCaptionDisplayer) {
            const areAutoCaptionsVisible = this.autoCaptionDisplayer.isTextVisible();
            this.autoCaptionDisplayer.destroy();
            this.setupAutoCaptionDisplayer(textCues);
            this.autoCaptionDisplayer.setTextVisibility(areAutoCaptionsVisible);
        } else {
            this.setupAutoCaptionDisplayer(textCues);

            if (this.getViewerOption('useReactControls')) {
                this.textTracks = [{ id: 0, language: __('auto_generated') }];
                this.initSubtitles();
            } else {
                // Update the subtitles/caption button to reflect auto-translation
                this.mediaControls.setLabel(this.mediaControls.subtitlesButtonEl, __('media_auto_generated_captions'));
                this.mediaControls.initSubtitles(
                    [__('auto_generated')],
                    getLanguageName(this.options.location.locale.substring(0, 2)),
                );
            }
        }
    }

    /**
     * Turns a Box Skills transcript card into an array of shaka text cues
     *
     * @param {Object} transcriptCard - transcript card from Box Skills
     * @return {Array} Array of text cues
     */
    createTextCues(transcriptCard) {
        const entries = getProp(transcriptCard, 'entries', []);
        return entries.map(entry => {
            // Set defaults if transcript data is malformed (start/end: 0s, text: '')
            const { appears = [{}], text = '' } = entry;
            const { start = 0, end = 0 } = Array.isArray(appears) && appears.length > 0 ? appears[0] : {};
            return new shaka.text.Cue(start, end, text);
        });
    }

    /**
     * Sets up the autoCaption displayer using a shaka SimpleTextDisplayer
     *
     * @public
     * @param {Array} textCues - Array of text cues which map text to a timestamp
     * @return {void}
     */
    setupAutoCaptionDisplayer(textCues) {
        this.autoCaptionDisplayer = new shaka.text.SimpleTextDisplayer(this.mediaEl);
        this.autoCaptionDisplayer.append(textCues);
        this.player.configure({ textDisplayFactory: this.autoCaptionDisplayer });
    }

    /**
     * Loads alternate audio streams
     *
     * @return {void}
     */
    loadAlternateAudio() {
        const variants = this.player.getVariantTracks().sort((track1, track2) => track1.audioId - track2.audioId);
        const audioIds = [];
        const uniqueAudioVariants = [];

        let i = 0;
        for (i = 0; i < variants.length; i += 1) {
            const audioTrack = variants[i];
            if (audioIds.indexOf(audioTrack.audioId) < 0) {
                audioIds.push(audioTrack.audioId);
                uniqueAudioVariants.push(audioTrack);
            }
        }

        this.audioTracks = uniqueAudioVariants.map(track => ({
            id: track.audioId,
            language: track.language,
            role: track.roles[0],
        }));

        if (this.audioTracks.length > 1) {
            // translate the language first
            const languages = this.audioTracks.map(track => getLanguageName(track.language) || track.language);
            this.selectedAudioTrack = this.audioTracks[0].id;

            if (!this.getViewerOption('useReactControls')) {
                this.mediaControls.initAlternateAudio(languages);
            }
        }
    }

    /**
     * Handler for meta data load for the media element.
     *
     * @override
     * @emits load
     * @return {void}
     */
    loadeddataHandler() {
        if (this.isDestroyed()) {
            return;
        }

        this.calculateVideoDimensions();
        if (this.getViewerOption('useReactControls')) {
            this.loadUIReact();
        } else {
            this.loadUI();
        }

        if (this.isAutoplayEnabled()) {
            this.autoplay();
        }

        this.resize();
        this.handleVolume();
        this.startBandwidthTracking();
        this.loadFilmStrip();
        this.loadSubtitles();
        this.loadAlternateAudio();
        this.showPlayButton();

        this.loaded = true;
        this.emit(VIEWER_EVENT.load);

        // Make media element visible after resize
        this.showMedia();
        if (this.getViewerOption('useReactControls')) {
            this.controls.controlsLayer.show();
            this.controls.controlsLayer.hide(); // Show controls briefly after content loads
        } else {
            this.mediaControls.show();
        }

        if (this.options.autoFocus) {
            this.mediaContainerEl.focus();
        }
    }

    /**
     * @inheritdoc
     */
    loadUI() {
        super.loadUI();

        if (this.hdVideoId !== -1) {
            this.mediaControls.enableHDSettings();
        }
    }

    /**
     * @inheritdoc
     */
    loadUIReact() {
        super.loadUIReact();

        const isHDSupported = this.hdVideoId !== -1;
        this.selectedQuality = isHDSupported ? this.cache.get('media-quality') || 'auto' : 'sd';
        this.setQuality(this.selectedQuality, false);
    }

    /**
     * Loads the film strip
     *
     * @private
     * @return {void}
     */
    loadFilmStrip() {
        const filmstrip = getRepresentation(this.options.file, 'filmstrip');
        const filmstripInterval = filmstrip && filmstrip.metadata && filmstrip.metadata.interval;

        if (filmstripInterval > 0) {
            const url = this.createContentUrlWithAuthParams(filmstrip.content.url_template);

            this.filmstripInterval = filmstripInterval;
            this.filmstripStatus = this.getRepStatus(filmstrip);

            if (this.getViewerOption('useReactControls')) {
                // Set the filmstrip url only after its rep is available
                this.filmstripStatus.getPromise().then(() => {
                    this.filmstripUrl = url;
                    this.renderUI();
                });

                this.renderUI();
            } else {
                this.mediaControls.initFilmstrip(url, this.filmstripStatus, this.aspect, filmstripInterval);
            }
        }
    }

    /**
     * Calculates the video dimension based on representations
     *
     * @private
     * @return {void}
     */
    calculateVideoDimensions() {
        const tracks = this.player.getVariantTracks();

        // Iterate over all available video representations and find the one that
        // seems the biggest so that the video player is set to the max size
        const hdRep = tracks.reduce((a, b) => (a.width > b.width ? a : b));
        const sdRep = tracks.reduce((a, b) => (a.width < b.width ? a : b));
        if (this.player.isAudioOnly()) {
            // There is only audio, no video
            this.videoWidth = DEFAULT_VIDEO_WIDTH_PX;
            this.videoHeight = DEFAULT_VIDEO_HEIGHT_PX;
        } else {
            this.videoWidth = hdRep.width;
            this.videoHeight = hdRep.height;
            this.sdVideoId = sdRep.videoId;

            // If there is an HD representation separate from the SD
            if (hdRep.videoId !== sdRep.videoId) {
                this.hdVideoId = hdRep.videoId;
            }
        }

        this.aspect = this.videoWidth / this.videoHeight;
    }

    /**
     * Resizes the video to be of fixed dimensions.
     * Should work in most common scenarios.
     *
     * @override
     * @return {void}
     */
    resize() {
        let width = this.videoWidth || 0;
        let height = this.videoHeight || 0;
        const viewport = {
            height: this.wrapperEl.clientHeight,
            width: this.wrapperEl.clientWidth,
        };

        // We need the width to be atleast wide enough for the controls
        // to not overflow and fit properly
        if (width < 420) {
            width = 420;
            height = width / this.aspect;
        }

        // Reset any prior set widths and heights
        // We are only going to modify the widths and not heights
        // This is because in Chrome its not possible to set a height
        // that larger than the current videoHeight.
        this.mediaEl.style.width = '';

        if (!fullscreen.isFullscreen(this.containerEl) && width <= viewport.width && height <= viewport.height) {
            // Case 1: The video ends up fitting within the viewport of preview
            // For this case, just set the video player dimensions to match the
            // actual video's dimenstions.
            if (this.aspect >= 1) {
                this.mediaEl.style.width = `${width}px`;
            } else {
                this.mediaEl.style.width = `${height * this.aspect}px`;
            }
        } else {
            // Case 2: The video is now in fullscreen and needs to be scaled
            // Case 3: The video overflows the viewport of preview
            // For this case, try fitting in the video by reducing
            // either its width or its height.

            // If video were to be stretched vertically, then figure out by how much and if that causes the width to overflow
            const percentIncreaseInHeightToFitViewport = (viewport.height - height) / height;
            const newWidthIfHeightUsed = width + width * percentIncreaseInHeightToFitViewport;

            // If video were to be stretched horizontally, then figure out how much and if that causes the height to overflow
            const percentIncreaseInWidthToFitViewport = (viewport.width - width) / width;
            const newHeightIfWidthUsed = height + height * percentIncreaseInWidthToFitViewport;

            // One of the two cases will end up fitting
            if (newHeightIfWidthUsed <= viewport.height) {
                this.mediaEl.style.width = `${viewport.width}px`;
            } else if (newWidthIfHeightUsed <= viewport.width) {
                this.mediaEl.style.width = `${viewport.height * this.aspect}px`;
            }
        }

        super.resize();
    }

    /**
     * Get bandwidth tracking stats
     *
     * @private
     * @return {void}
     */
    getBandwidthInterval() {
        if (this.isDestroyed() || !this.player || !this.player.getStats || this.mediaEl.paused || this.mediaEl.ended) {
            return;
        }

        const stats = this.player.getStats();
        const bandwidth = stats.estimatedBandwidth;

        // Streaming representation history
        const { switchHistory, streamBandwidth: stream } = stats;
        this.bandwidthHistory.push({ bandwidth, stream });
        this.switchHistory.push({ switchHistory, stream });

        // If stats element exists then show it visually
        if (this.statsEl) {
            this.statsEl.textContent = `${Math.round(bandwidth / 1000)} kbps`;
        }
    }

    /**
     * Tracks bandwidth
     *
     * @private
     * @return {void}
     */
    startBandwidthTracking() {
        this.statsIntervalId = setInterval(this.getBandwidthInterval, 3000);
    }

    /**
     * Removes the stats
     *
     * @private
     * @return {void}
     */
    removeStats() {
        if (this.statsEl && this.mediaContainerEl) {
            this.mediaContainerEl.removeChild(this.statsEl);
        }
        this.statsEl = undefined;
    }

    /**
     * Toggles the stats on or off
     *
     * @private
     * @return {void}
     */
    toggleStats() {
        // If we were showing the stats, hide them
        if (this.statsEl) {
            this.removeStats();
            return;
        }

        this.statsEl = this.mediaContainerEl.appendChild(document.createElement('div'));
        this.statsEl.className = 'bp-media-dash-stats';
        this.statsEl.textContent = '?!? kbps';
    }

    /**
     * Handles keyboard events for dash
     *
     * @override
     * @param {string} key - Keydown key
     * @return {boolean} Consumed or not
     */
    onKeydown(key) {
        if (key === 'Shift+I' && this.player) {
            this.toggleStats();
            return true;
        }

        return super.onKeydown(key);
    }

    /**
     * Updates the selected audio track
     * @param {string} audioTrackId - The selected audio track id
     * @return {void}
     */
    setAudioTrack(audioTrackId) {
        const newAudioTrack = this.audioTracks.find(({ id }) => audioTrackId === id);
        if (newAudioTrack) {
            this.enableAudioId(newAudioTrack.role);
            this.selectedAudioTrack = audioTrackId;
            this.renderUI();
        }
    }

    /**
     * Updates the selected quality and updates the player accordingly
     * @param {string} quality - 'sd', 'hd', or 'auto'
     * @param {boolean} [saveToCache] - Whether to save this value to the cache, defaults to true
     * @emits qualitychange
     * @return {void}
     */
    setQuality(quality, saveToCache = true) {
        const newQuality = quality !== 'sd' && quality !== 'hd' ? 'auto' : quality;
        this.cache.set('media-quality', newQuality, saveToCache);
        this.selectedQuality = newQuality;

        switch (newQuality) {
            case 'hd':
                this.enableAdaptation(false);
                this.enableVideoId(this.hdVideoId);
                break;
            case 'sd':
                this.enableAdaptation(false);
                this.enableVideoId(this.sdVideoId);
                break;
            case 'auto':
            default:
                this.enableAdaptation(true);
                break;
        }

        if (newQuality) {
            this.emit('qualitychange', newQuality);
        }

        this.renderUI();
    }

    /**
     * Updates the selected subtitle and updates the player accordingly
     * @param {number} subtitle - ID of the subtitle track
     * @emits subtitlechange
     * @return {void}
     */
    setSubtitle(subtitle) {
        const subtitleIndex = this.textTracks.findIndex(({ id }) => id === subtitle);

        if (subtitle !== SUBTITLES_OFF) {
            this.cache.set('media-subtitles', subtitle, true);
            this.cache.set('media-subtitles-toggle', true, true);
            this.selectedSubtitle = subtitle;
        } else {
            this.cache.set('media-subtitles-toggle', false, true);
        }

        // Auto-generated index 0 ==> turn auto-generated text track on
        if (this.autoCaptionDisplayer && subtitleIndex === 0) {
            // Manually set text visibility with the custom Shaka Text Displayer
            this.autoCaptionDisplayer.setTextVisibility(true);
            this.emit('subtitlechange', __('auto_generated'));

            // Valid non-auto-generated index ==> turn specified text track on
        } else if (this.textTracks[subtitleIndex] !== undefined) {
            const track = this.textTracks[subtitleIndex];
            this.player.selectTextTrack(track);
            this.player.setTextTrackVisibility(true);
            this.emit('subtitlechange', track.language);

            // Index -1 ==> turn subtitles/captions off
        } else {
            if (this.autoCaptionDisplayer) {
                this.autoCaptionDisplayer.setTextVisibility(false);
            }

            this.player.setTextTrackVisibility(false);
            this.emit('subtitlechange', null);
        }

        this.renderUI();
    }

    /**
     * Toggles the subtitles on or off
     * @param {boolean} showSubtitles - Boolean indicating whether to hide or show the subtitles
     * @return {void}
     */
    toggleSubtitles(showSubtitles) {
        this.setSubtitle(showSubtitles ? this.selectedSubtitle : SUBTITLES_OFF);
    }

    /**
     * @inheritdoc
     */
    renderUI() {
        // Extra guard for `render` is needed because Video360Viewer extends DashViewer
        // and creates and assigns the 360 control to this.controls which usually has
        // been reserved for new React controls
        if (!this.controls || !this.controls.render) {
            return;
        }

        this.controls.render(
            <DashControls
                aspectRatio={this.aspect}
                audioTrack={this.selectedAudioTrack}
                audioTracks={this.audioTracks}
                autoplay={this.isAutoplayEnabled()}
                bufferedRange={this.mediaEl.buffered}
                currentTime={this.mediaEl.currentTime}
                durationTime={this.mediaEl.duration}
                filmstripInterval={this.filmstripInterval}
                filmstripUrl={this.filmstripUrl}
                isAutoGeneratedSubtitles={!!this.autoCaptionDisplayer}
                isHDSupported={this.hdVideoId !== -1}
                isPlaying={!this.mediaEl.paused}
                isPlayingHD={this.isPlayingHD()}
                onAudioTrackChange={this.setAudioTrack}
                onAutoplayChange={this.setAutoplay}
                onFullscreenToggle={this.toggleFullscreen}
                onMuteChange={this.toggleMute}
                onPlayPause={this.togglePlay}
                onQualityChange={this.setQuality}
                onRateChange={this.setRate}
                onSubtitleChange={this.setSubtitle}
                onSubtitlesToggle={this.toggleSubtitles}
                onTimeChange={this.handleTimeupdateFromMediaControls}
                onVolumeChange={this.setVolume}
                quality={this.selectedQuality}
                rate={this.getRate()}
                subtitle={this.getSubtitleId()}
                subtitles={this.textTracks}
                volume={this.mediaEl.volume}
            />,
        );
    }
}

export default DashViewer;
