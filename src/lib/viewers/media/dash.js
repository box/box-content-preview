import autobind from 'autobind-decorator';
import VideoBase from './video-base';
import cache from '../../Cache';
import fullscreen from '../../Fullscreen';
import { get } from '../../util';
import { getRepresentation } from '../../file';
import './dash.scss';

const CSS_CLASS_DASH = 'bp-media-dash';
const CSS_CLASS_HD = 'bp-media-controls-is-hd';
const SEGMENT_SIZE = 5;
const MAX_BUFFER = SEGMENT_SIZE * 12; // 60 sec
const MANIFEST = 'manifest.mpd';

@autobind
class Dash extends VideoBase {
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
        this.hdRepresentation = {};
        this.sdRepresentation = {};

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
        this.mediaEl.addEventListener('loadeddata', this.loadeddataHandler);

        return Promise.all([this.loadAssets(this.getJSAssets()), this.getRepStatus().getPromise()]).then(() => {
            this.loadDashPlayer();
            this.resetLoadTimeout();
        }).catch(this.handleAssetError);
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

        const representation = this.options.representation;
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
        return ['third-party/media/shaka-player.compiled.js'];
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
        this.player.configure({
            abr: {
                enabled: true
            },
            streaming: {
                bufferingGoal: MAX_BUFFER,
                retryParameters: {
                    timeout: 0,       // timeout in ms, after which we abort a request; 0 means never
                    maxAttempts: 100, // the maximum number of requests before we fail
                    baseDelay: 500,   // the base delay in ms between retries
                    backoffFactor: 2, // the multiplicative backoff factor between retries
                    fuzzFactor: 0.5   // the fuzz factor to apply to each retry delay
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
     * @return {void}
     */
    requestFilter(type, request) {
        const asset = type === shaka.net.NetworkingEngine.RequestType.MANIFEST ? MANIFEST : undefined;
        /* eslint-disable no-param-reassign */
        request.uris = request.uris.map((uri) => this.createContentUrlWithAuthParams(uri, asset));
        /* eslint-enable no-param-reassign */
    }

    /**
     * Gets the active track
     *
     * @private
     * @return {Object|undefined}
     */
    getActiveTrack() {
        const tracks = this.player.getTracks();
        return tracks.find((track) => track.active);
    }

    /**
     * Shows the loading indicator
     *
     * @override
     * @param {number} id - rep id
     * @return {void}
     */
    showLoadingIcon(id) {
        const activeTrack = this.getActiveTrack();
        if (activeTrack.id !== id) {
            super.showLoadingIcon();
        }
    }

    /**
     * Handler for hd video
     *
     * @private
     * @return {void}
     */
    enableHD() {
        this.showLoadingIcon(this.hdRepresentation.id);
        this.player.selectTrack(this.hdRepresentation, true);
    }

    /**
     * Handler for sd video
     *
     * @private
     * @return {void}
     */
    enableSD() {
        this.showLoadingIcon(this.sdRepresentation.id);
        this.player.selectTrack(this.sdRepresentation, true);
    }

    /**
     * Enables or disables automatic adaptation
     *
     * @private
     * @param {boolean} [adapt] - enable or disable adaptation
     * @return {void}
     */
    enableAdaptation(adapt = true) {
        this.adapting = adapt;
        this.player.configure({ abr: { enabled: adapt } });
    }

    /**
     * Handler for hd/sd/auto video
     *
     * @private
     * @emits qualitychange
     * @return {void}
     */
    handleQuality() {
        const quality = cache.get('media-quality');

        switch (quality) {
            case 'hd':
                this.enableHD();
                break;
            case 'sd':
                this.enableSD();
                break;
            case 'auto':
            default:
                this.enableAdaptation();
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
        if (activeTrack.id === this.hdRepresentation.id) {
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
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @override
     * @return {void}
     */
    addEventListenersForMediaControls() {
        super.addEventListenersForMediaControls();
        this.mediaControls.addListener('qualitychange', this.handleQuality);
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
        this.loadUI();
        this.loadFilmStrip();
        this.resize();
        this.handleVolume();
        this.startBandwidthTracking();
        this.handleQuality(); // should come after gettings rep ids
        this.showPlayButton();

        this.loaded = true;
        this.emit('load');

        // Make media element visible after resize
        this.showMedia();
    }

    /**
     * Loads the film strip
     *
     * @private
     * @return {void}
     */
    loadFilmStrip() {
        const filmstrip = getRepresentation(this.options.file, 'filmstrip');
        if (filmstrip) {
            const url = this.createContentUrlWithAuthParams(filmstrip.content.url_template);
            this.filmstripStatus = this.getRepStatus(filmstrip);
            this.mediaControls.initFilmstrip(url, this.filmstripStatus, this.aspect);
        }
    }

    /**
     * Calculates the video dimension based on representations
     *
     * @private
     * @return {void}
     */
    calculateVideoDimensions() {
        const tracks = this.player.getTracks();

        // Iterate over all available video representations and find the one that
        // seems the biggest so that the video player is set to the max size
        const hdRepresentation = tracks.reduce((a, b) => (a.width > b.width ? a : b));
        const sdRepresentation = tracks.reduce((a, b) => (a.width < b.width ? a : b));

        this.videoWidth = hdRepresentation.width;
        this.videoHeight = hdRepresentation.height;
        this.aspect = this.videoWidth / this.videoHeight;
        this.hdRepresentation = hdRepresentation;
        this.sdRepresentation = sdRepresentation;
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
        const viewport = this.wrapperEl.getBoundingClientRect();

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

        // Add a new width or height. Don't need to add both
        // since the video will auto adjust the other dimension accordingly.
        if (fullscreen.isFullscreen(this.containerEl)) {
            // Case 1: Full screen mode, stretch the video
            // to fit the whole screen irrespective of its width and height.

            if (this.aspect >= 1) {
                this.mediaEl.style.width = `${viewport.width}px`;
            } else {
                this.mediaEl.style.width = `${viewport.height * this.aspect}px`;
            }
        } else if (width <= viewport.width && height <= viewport.height) {
            // Case 2: The video ends up fitting within the viewport of preview
            // For this case, just set the video player dimensions to match the
            // actual video's dimenstions.

            if (this.aspect >= 1) {
                this.mediaEl.style.width = `${width}px`;
            } else {
                this.mediaEl.style.width = `${height * this.aspect}px`;
            }
        } else {
            // Case 3: The video overflows the viewport of preview
            // For this case, try fitting in the video by reducing
            // either its width or its height.

            // If video were to be stretched vertically, then figure out by how much and if that causes the width to overflow
            const percentIncreaseInHeightToFitViewport = (viewport.height - height) / height;
            const newWidthIfHeightUsed = width + (width * percentIncreaseInHeightToFitViewport);

            // If video were to be stretched horizontally, then figure out how much and if that causes the height to overflow
            const percentIncreaseInWidthToFitViewport = (viewport.width - width) / width;
            const newHeightIfWidthUsed = height + (height * percentIncreaseInWidthToFitViewport);

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
        const stream = stats.streamBandwidth;
        const switchHistory = stats.switchHistory;
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

export default Dash;
