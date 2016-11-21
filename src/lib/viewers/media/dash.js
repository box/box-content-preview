import autobind from 'autobind-decorator';
import VideoBase from './video-base';
import cache from '../../cache';
import fullscreen from '../../fullscreen';
import { createContentUrl, getHeaders } from '../../util';
import RepStatus from '../../rep-status';
import './dash.scss';

const CSS_CLASS_DASH = 'box-preview-media-dash';
const CSS_CLASS_HD = 'box-preview-media-controls-is-hd';
const SEGMENT_SIZE = 5;
const MAX_BUFFER = SEGMENT_SIZE * 12; // 60 sec

const Box = global.Box || {};

@autobind
class Dash extends VideoBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @returns {Dash} Dash instance
     */
    constructor(container, options) {
        super(container, options);

        // stats
        this.bandwidthHistory = [];
        this.bufferingHistory = [];

        // dash specific class
        this.wrapperEl.classList.add(CSS_CLASS_DASH);
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        // Log bandwidth history
        this.emit('bandwidthHistory', this.bandwidthHistory);
        this.emit('bufferingHistory', this.bufferingHistory);

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
     * @param {string} mediaUrl The media url
     * @pubic
     * @returns {Promise} Promise to load the media
     */
    load(mediaUrl) {
        /* global shaka */

        // Polyfill
        shaka.polyfill.installAll();

        this.mediaUrl = mediaUrl;
        this.mediaEl.addEventListener('loadedmetadata', this.loadedmetadataHandler);
        this.loadDashPlayer();
        this.resetLoadTimeout();
    }

    /**
     * Creates a new shaka player
     *
     * @private
     * @returns {void}
     */
    loadDashPlayer() {
        this.adapting = true;
        this.player = new shaka.player.Player(this.mediaEl);
        this.player.addEventListener('adaptation', this.adaptationHandler);
        this.player.configure({
            streamBufferSize: MAX_BUFFER,
            enableAdaptation: true
        });
        this.player.load(this.createDashSource());
    }

    /**
     * Creates a new dash bandwidth estimator
     *
     * @private
     * @returns {void}
     */
    createEstimator() {
        const estimator = new shaka.util.EWMABandwidthEstimator();
        estimator.supportsCaching = () => true;
        return estimator;
    }

    /**
     * Creates a new dash player source
     *
     * @private
     * @returns {void}
     */
    createDashSource() {
        const source = new shaka.player.DashVideoSource(this.mediaUrl, null, this.createEstimator());
        source.setNetworkCallback(this.requestInterceptor());
        return source;
    }

    /**
     * An extension to fix representation URLs with shared names
     *
     * @private
     * @returns {Function} function to add shared name
     */
    requestInterceptor() {
        const { token, sharedLink, sharedLinkPassword } = this.options;
        return (url) => {
            return createContentUrl(url, token, sharedLink, sharedLinkPassword);
        };
    }

    /**
     * Handler for hd video
     *
     * @private
     * @param {number} id rep id
     * @returns {Object|undefined}
     */
    getVideoRepresentation(id) {
        const videoTracks = this.player.getVideoTracks();

        if (!videoTracks.length) {
            return undefined;
        }

        return videoTracks.find((track) => {
            return track.id === id;
        });
    }

    /**
     * Shows the loading indicator
     *
     * @private
     * @param {number} id rep id
     * @returns {void}
     */
    showLoadingIcon(id) {
        const rep = this.getVideoRepresentation(id);
        if (rep && !rep.active) {
            super.showLoadingIcon();
        }
    }

    /**
     * Handler for hd video
     *
     * @private
     * @returns {void}
     */
    enableHD() {
        this.enableAdaptation(false);
        this.showLoadingIcon(this.largestRepresentationId);
        this.player.selectVideoTrack(this.largestRepresentationId);
    }

    /**
     * Handler for sd video
     *
     * @private
     * @returns {void}
     */
    enableSD() {
        this.enableAdaptation(false);
        this.showLoadingIcon(this.largestRepresentationId + 1);
        this.player.selectVideoTrack(this.largestRepresentationId + 1);
    }

    /**
     * Handler for dd/sd/auto video
     *
     * @private
     * @param {boolean} [adapt] enable or disable adaptation
     * @returns {void}
     */
    enableAdaptation(adapt = true) {
        this.adapting = adapt;
        this.player.configure({ enableAdaptation: adapt });
    }

    /**
     * Handler for hd/sd/auto video
     *
     * @private
     * @returns {void}
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
     * @param {Object} adaptation video rep
     * @returns {void}
     */
    adaptationHandler(adaptation) {
        if (adaptation.contentType === 'video') {
            if (adaptation.bandwidth === this.maxBandwidth) {
                this.wrapperEl.classList.add(CSS_CLASS_HD);
            } else {
                this.wrapperEl.classList.remove(CSS_CLASS_HD);
            }
            if (this.adapting) {
                this.emit('adaptation', adaptation.bandwidth);
            }
            this.hideLoadingIcon();
        }
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @private
     * @returns {void}
     */
    addEventListenersForMediaControls() {
        super.addEventListenersForMediaControls();
        this.mediaControls.addListener('qualitychange', this.handleQuality);
    }

    /**
     * Handler for meta data load for the media element.
     *
     * @private
     * @returns {void}
     */
    loadedmetadataHandler() {
        if (this.isDestroyed()) {
            return;
        }

        this.calculateVideoDimensions();
        this.loadUI();
        this.loadFilmStrip();
        this.resize();
        this.showPlayButton();
        this.handleVolume();
        this.startBandwidthTracking();
        this.handleQuality(); // should come after gettings rep ids
        this.loaded = true;
        this.emit('load');
    }

    /**
     * Loads the film strip
     *
     * @private
     * @returns {void}
     */
    loadFilmStrip() {
        const { file, token, sharedLink, sharedLinkPassword } = this.options;
        const filmstrip = file.representations.entries.find((entry) => entry.representation === 'filmstrip');
        if (filmstrip) {
            const url = createContentUrl(filmstrip.links.content.url, token, sharedLink, sharedLinkPassword);
            this.filmstripStatus = new RepStatus(filmstrip, getHeaders({}, token, sharedLink, sharedLinkPassword));
            this.mediaControls.initFilmstrip(url, this.filmstripStatus, this.aspect);
        }
    }

    /**
     * Calculates the video dimension based on representations
     *
     * @private
     * @returns {void}
     */
    calculateVideoDimensions() {
        const videoTracks = this.player.getVideoTracks();

        if (videoTracks.length) {
            // Iterate over all available video representations and find the one that
            // seems the biggest so that the video player is set to the max size
            const largestRepresentation = videoTracks.reduce((a, b) => (a.width > b.width ? a : b));

            this.videoWidth = largestRepresentation.width;
            this.videoHeight = largestRepresentation.height;
            this.aspect = this.videoWidth / this.videoHeight;
            this.maxBandwidth = largestRepresentation.bandwidth;
            this.largestRepresentationId = largestRepresentation.id;
        }
    }

    /**
     * Resizes the video to be of fixed dimensions.
     * Should work in most common scenarios.
     *
     * @private
     * @returns {void}
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
     * Tracks bandwidth
     *
     * @private
     * @returns {void}
     */
    startBandwidthTracking() {
        this.statsIntervalId = setInterval(() => {
            if (this.isDestroyed() || !this.player || !this.player.getStats || this.mediaEl.paused || this.mediaEl.ended) {
                return;
            }

            const stats = this.player.getStats();
            const bandwidth = stats.estimatedBandwidth;

            // Streaming representation history
            let stream;
            if (stats.streamStats) {
                stream = stats.streamStats.videoBandwidth;
            }
            if (stream) {
                this.bandwidthHistory.push({ bandwidth, stream });
            }

            // Buffering history
            let buffered = 0;
            if (stats.bufferingHistory) {
                buffered = stats.bufferingHistory.length;
            }
            if (buffered && stream) {
                this.bufferingHistory.push({ buffered, stream });
            }

            // If stats element exists then show it visually
            if (this.statsEl) {
                this.statsEl.textContent = `${Math.round(bandwidth / 1000)} kbps`;
            }
        }, 3000);
    }

    /**
     * Removes the stats
     *
     * @private
     * @returns {void}
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
     * @returns {void}
     */
    toggleStats() {
        // If we were showing the stats, hide them
        if (this.statsEl) {
            this.removeStats();
            return;
        }

        this.statsEl = this.mediaContainerEl.appendChild(document.createElement('div'));
        this.statsEl.className = 'box-preview-media-dash-stats';
        this.statsEl.textContent = '?!? kbps';
    }

    /**
     * Handles keyboard events for media
     *
     * @private
     * @param {string} key keydown key
     * @returns {boolean} consumed or not
     */
    onKeydown(key) {
        if (key === 'Shift+I' && this.player) {
            this.toggleStats();
            return true;
        }

        return super.onKeydown(key);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Dash = Dash;
global.Box = Box;
export default Dash;
