import VideoBaseViewer from './VideoBaseViewer';
import fullscreen from '../../Fullscreen';
import { appendQueryParams, get } from '../../util';
import { getRepresentation } from '../../file';
import { MEDIA_STATIC_ASSETS_VERSION } from '../../constants';
import './Dash.scss';
import getLanguageName from '../../lang';
import { VIEWER_EVENT } from '../../events';

const CSS_CLASS_DASH = 'bp-media-dash';
const CSS_CLASS_HD = 'bp-media-controls-is-hd';
const SEGMENT_SIZE = 5;
const MAX_BUFFER = SEGMENT_SIZE * 12; // 60 sec
const MANIFEST = 'manifest.mpd';
const DEFAULT_VIDEO_WIDTH_PX = 854;
const DEFAULT_VIDEO_HEIGHT_PX = 480;

class DashViewer extends VideoBaseViewer {
    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for callbacks
        this.loadeddataHandler = this.loadeddataHandler.bind(this);
        this.adaptationHandler = this.adaptationHandler.bind(this);
        this.shakaErrorHandler = this.shakaErrorHandler.bind(this);
        this.requestFilter = this.requestFilter.bind(this);
        this.handleQuality = this.handleQuality.bind(this);
        this.handleSubtitle = this.handleSubtitle.bind(this);
        this.handleAudioTrack = this.handleAudioTrack.bind(this);
        this.getBandwidthInterval = this.getBandwidthInterval.bind(this);
    }

    /**
     * @inheritdoc
     */
    setup() {
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
        this.setup();
        this.mediaUrl = this.options.representation.content.url_template;
        this.watermarkCacheBust = Date.now();
        this.mediaEl.addEventListener('loadeddata', this.loadeddataHandler);

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
            get(this.createContentUrlWithAuthParams(template, MANIFEST), 'any');
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
        this.player.configure({
            abr: {
                enabled: true
            },
            streaming: {
                bufferingGoal: MAX_BUFFER,
                retryParameters: {
                    timeout: 0, // timeout in ms, after which we abort a request; 0 means never
                    maxAttempts: 100, // the maximum number of requests before we fail
                    baseDelay: 500, // the base delay in ms between retries
                    backoffFactor: 2, // the multiplicative backoff factor between retries
                    fuzzFactor: 0.5 // the fuzz factor to apply to each retry delay
                }
            }
        });
        this.player.getNetworkingEngine().registerRequestFilter(this.requestFilter);
        this.player.load(this.mediaUrl);
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
        request.uris = request.uris.map((uri) => {
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
        return tracks.find((track) => track.active);
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
        const newTrack = tracks.find((track) => track.videoId === videoId && track.audioId === activeTrack.audioId);
        if (newTrack && newTrack.id !== activeTrack.id) {
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
        if (this.textTracks[subtitleIdx] !== undefined) {
            const track = this.textTracks[subtitleIdx];
            this.player.selectTextTrack(track);
            this.player.setTextTrackVisibility(true);
            this.emit('subtitlechange', track.language);
        } else {
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
        if (this.audioTracks[audioIdx] !== undefined) {
            const track = this.audioTracks[audioIdx];
            this.player.selectAudioLanguage(track.language, track.role);
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

        if (quality) {
            this.emit('qualitychange', quality);
        }
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
        if (activeTrack.videoId === this.hdVideoId) {
            this.wrapperEl.classList.add(CSS_CLASS_HD);
        } else {
            this.wrapperEl.classList.remove(CSS_CLASS_HD);
        }

        if (!this.isLoaded()) {
            return;
        }
        if (this.adapting) {
            this.emit('adaptation', activeTrack.bandwidth);
        }
        this.hideLoadingIcon();
    }

    /**
     * Handles errors thrown by shaka player. See https://shaka-player-demo.appspot.com/docs/api/shaka.util.Error.html
     *
     * @private
     * @param {Object} shakaError - Error to handle
     * @return {void}
     */
    shakaErrorHandler(shakaError) {
        const error = new Error(
            `Shaka error. Code = ${shakaError.detail.code}, Category = ${shakaError.detail.category}, Severity = ${
                shakaError.detail.severity
            }, Data = ${shakaError.detail.data.toString()}`
        );
        error.displayMessage = __('error_refresh');

        if (shakaError.detail.severity > 1) {
            // critical error
            this.emit('error', error);
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
        this.textTracks = this.player.getTextTracks().sort((track1, track2) => track1.id - track2.id);
        if (this.textTracks.length > 0) {
            this.mediaControls.initSubtitles(
                this.textTracks.map((track) => getLanguageName(track.language) || track.language),
                getLanguageName(this.options.location.locale.substring(0, 2))
            );
        }
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
        for (i = 0; i < variants.length; i++) {
            const audioTrack = variants[i];
            if (audioIds.indexOf(audioTrack.audioId) < 0) {
                audioIds.push(audioTrack.audioId);
                uniqueAudioVariants.push(audioTrack);
            }
        }

        this.audioTracks = uniqueAudioVariants.map((track) => ({
            language: track.language,
            role: track.roles[0]
        }));

        if (this.audioTracks.length > 1) {
            // translate the language first
            const languages = this.audioTracks.map((track) => getLanguageName(track.language) || track.language);
            this.mediaControls.initAlternateAudio(languages);
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

        if (this.isAutoplayEnabled()) {
            this.autoplay();
        }

        this.calculateVideoDimensions();
        this.loadUI();
        this.loadFilmStrip();
        this.resize();
        this.handleVolume();
        this.startBandwidthTracking();
        this.handleQuality(); // should come after gettings rep ids
        this.loadSubtitles();
        this.loadAlternateAudio();
        this.showPlayButton();

        this.loaded = true;
        this.emit(VIEWER_EVENT.load);

        // Make media element visible after resize
        this.showMedia();
        this.mediaControls.show();
        this.mediaContainerEl.focus();
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
     * Loads the film strip
     *
     * @private
     * @return {void}
     */
    loadFilmStrip() {
        const filmstrip = getRepresentation(this.options.file, 'filmstrip');
        if (filmstrip && filmstrip.metadata && filmstrip.metadata.interval > 0) {
            const url = this.createContentUrlWithAuthParams(filmstrip.content.url_template);
            this.filmstripStatus = this.getRepStatus(filmstrip);
            this.mediaControls.initFilmstrip(url, this.filmstripStatus, this.aspect, filmstrip.metadata.interval);
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
            width: this.wrapperEl.clientWidth
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

        if (!fullscreen.isFullscreen(this.containerEl) && (width <= viewport.width && height <= viewport.height)) {
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
}

export default DashViewer;
