import './dash.scss';
import autobind from 'autobind-decorator';
import VideoBase from './video-base';
import cache from '../cache';
import fullscreen from '../fullscreen';
import Browser from '../browser';
import { createContentUrl, getHeaders } from '../util';
import RepStatus from '../rep-status';

const CSS_CLASS_DASH = 'box-preview-media-dash';
const CSS_CLASS_HIDDEN = 'box-preview-is-hidden';
const CSS_CLASS_HD = 'box-preview-media-controls-is-hd';
const SEGMENT_SIZE = 5;
const MAX_BUFFER = SEGMENT_SIZE * 12; // 60 sec

const Box = global.Box || {};

@autobind
class Dash extends VideoBase {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @returns {Dash} Dash instance
     */
    constructor(container, options) {
        super(container, options);

        // dash specific class
        this.wrapperEl.classList.add(CSS_CLASS_DASH);
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        if (this.player) {
            this.player.destroy();
        }
        if (this.mediaControls) {
            this.mediaControls.removeListener('qualitychange', this.handleQuality);
        }
        if (this.switchTo360El) {
            this.switchTo360El.removeEventListener('click', this.switchTo360);
        }
        super.destroy();
    }

    /**
     * Loads a media source.
     *
     * @param {String} mediaUrl The media url
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

        setTimeout(() => {
            if (!this.loaded) {
                this.emit('error');
            }
        }, 10000);
    }

    /**
     * Creates a new shaka player
     *
     * @private
     * @returns {void}
     */
    loadDashPlayer() {
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
        const token = this.options.token;

        return (url, headers) => {
            if (url && url.indexOf(token) === -1) {
                getHeaders(headers, token, this.options.sharedLink);
            }
        };
    }

    /**
     * Switches the viewer to 3D
     * @public
     * @returns {void}
     */
    switchTo360() {
        Box.Preview.disableViewers('Dash');
        Box.Preview.disableViewers('MP4');
        this.emit('reload');
    }

    /**
     * Handler for hd video
     *
     * @private
     * @returns {void}
     */
    enableHD() {
        this.enableAdaptation(false);
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
        this.player.selectVideoTrack(this.largestRepresentationId + 1);
    }

    /**
     * Handler for dd/sd/auto video
     *
     * @private
     * @param {Boolean|void} [adapt] enable or disable adaptation
     * @returns {void}
     */
    enableAdaptation(adapt = true) {
        this.player.configure({ enableAdaptation: adapt });
    }

    /**
     * Handler for hd/sd/auto video
     *
     * @private
     * @param {Boolean|void} [showLoadingIndicator] shows the loading crawler
     * @returns {void}
     */
    handleQuality(showLoadingIndicator = true) {
        const quality = cache.get('media-quality');

        if (showLoadingIndicator && !this.mediaEl.paused && !this.mediaEl.ended) {
            this.containerEl.classList.remove('box-preview-loaded');
        }

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
        super.loadedmetadataHandler();
        this.handleQuality(false);
    }

    /**
     * Loads the UI
     *
     * @private
     * @returns {void}
     */
    loadUI() {
        super.loadUI();
        this.calculateVideoDimensions();
        this.resize();
        this.loadFilmStrip();

        if (Browser.hasWebGL()) {
            this.switchTo360El = this.containerEl.querySelector('.box-preview-image-switch-360-icon');
            this.switchTo360El.classList.remove(CSS_CLASS_HIDDEN);
            this.switchTo360El.addEventListener('click', this.switchTo360);
        }
    }

    /**
     * Loads the film strip
     *
     * @private
     * @returns {void}
     */
    loadFilmStrip() {
        const filmstrip = this.options.file.representations.entries.find((entry) => entry.representation === 'filmstrip');
        if (filmstrip) {
            const url = createContentUrl(filmstrip.links.content.url, this.options.token, this.options.sharedLink);
            const status = new RepStatus(filmstrip, getHeaders({}, this.options.token, this.options.sharedLink));
            this.mediaControls.initFilmstrip(url, status, this.aspect);
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
        this.mediaEl.style.width = '';
        this.mediaEl.style.height = '';

        // Add a new width or height. Don't need to add both
        // since the video will auto adjust the other dimension accordingly.
        if (fullscreen.isFullscreen()) {
            // Case 1: Full screen mode, stretch the video
            // to fit the whole screen irrespective of its width and height.

            if (this.aspect >= 1) {
                this.mediaEl.style.width = `${viewport.width}px`;
            } else {
                this.mediaEl.style.height = `${viewport.height}px`;
            }
        } else if (width <= viewport.width && height <= viewport.height) {
            // Case 2: The video ends up fitting within the viewport of preview
            // For this case, just set the video player dimensions to match the
            // actual video's dimenstions.

            if (this.aspect >= 1) {
                this.mediaEl.style.width = `${width}px`;
            } else {
                this.mediaEl.style.height = `${height}px`;
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
                this.mediaEl.style.height = `${viewport.height}px`;
            }
        }

        super.resize();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Dash = Dash;
global.Box = Box;
export default Dash;
