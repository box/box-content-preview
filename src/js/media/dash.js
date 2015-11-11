'use strict';

import '../../css/media/dash.css';
import autobind from 'autobind-decorator';
import VideoBase from './video-base';
import cache from '../cache';
import 'file?name=shaka-player.js!../../third-party/media/shaka-player.js';

const CSS_CLASS_DASH = 'box-preview-media-dash';
const CSS_CLASS_HD = 'box-preview-media-is-hd';
const MEDIA_LOAD_TIMEOUT_IN_MILLIS = 10000;
const SEGMENT_SIZE = 5;
const MAX_BUFFER = SEGMENT_SIZE * 3

let Box = global.Box || {};
let document = global.document;
let shaka = global.shaka;

@autobind
class Dash extends VideoBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container DOM node
     * @param {object} [options] some options
     * @returns {Dash}
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
        super.destroy();
    }

    /**
     * Loads a media source.
     *
     * @param {String} mediaUrl The media url
     * @pubic
     * @returns {Promise}
     */
    load(mediaUrl, filmstripUrl, posterUrl) {

        this.mediaUrl = mediaUrl;
        this.filmstripUrl = filmstripUrl;
        this.posterUrl = posterUrl;

        return new Promise((resolve, reject) => {

            // For media elements meta data load signifies a load event
            this.mediaEl.addEventListener('loadedmetadata', () => {
                resolve(this);
                this.loadedmetadataHandler();
            });

            this.loadDashPlayer();

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, MEDIA_LOAD_TIMEOUT_IN_MILLIS);
        });
    }

    loadDashPlayer() {
        this.player = new shaka.player.Player(this.mediaEl);
        this.player.addEventListener('adaptation', this.adaptationHandler);
        this.player.enableAdaptation(true);
        this.player.configure({
            streamBufferSize: MAX_BUFFER
        });
        this.player.load(this.createDashSource());
    }

    createEstimator() {
        let estimator = new shaka.util.EWMABandwidthEstimator();
        estimator.supportsCaching = function() {
            return true;
        };
        return estimator;
    }

    createDashSource() {
        let source = new shaka.player.DashVideoSource(this.mediaUrl, null, this.createEstimator());
        source.setNetworkCallback(this.requestInterceptor());
        return source;
    }

    /**
     * Calculates the video dimension based on representations
     *
     * @private
     * @returns {void}
     */
    calculateVideoDimensions() {

        let videoTracks = this.player.getVideoTracks();

        if (videoTracks.length) {

            // Iterate over all available video representations and find the one that
            // seems the biggest so that the video player is set to the max size
            let potentiallyCachedHDVideos = cache.get('potentiallyCachedHDVideos') || {};

            let largestRepresentation = videoTracks.reduce(function(a, b) {
                return a.width > b.width ? a : b;
            });

            this.videoWidth = largestRepresentation.width;
            this.videoHeight = largestRepresentation.height;
            this.aspect = this.videoWidth / this.videoHeight;
            this.maxBandwidth = largestRepresentation.bandwidth;
            this.largestRepresentationId = largestRepresentation.id;

            // If this file was flagged for HD in a prior preview, then force HD
            // This takes advantage of the fact that some segments may be cached
            if (potentiallyCachedHDVideos[this.mediaUrl]) {
                this.player.enableAdaptation(false);
                this.player.selectVideoTrack(largestRepresentationId);
            }
        }
    }

    /**
     * An extension to fix representation URLs with shared names
     *
     * @private
     * @returns {Function} function to add shared name
     */
    requestInterceptor() {
        let query;

        if (this.options.sharedName) {
            query = 'shared_name=' + this.options.sharedName;
        }

        return (url, headers) => {
            return (!query || url.indexOf(query) > -1) ? url : url + '?' + query;
        };
    }

    /**
     * Changes video adaptation
     *
     * @returns {void}
     */
    hdHandler() {
        this.player.enableAdaptation(false);

        let potentiallyCachedHDVideos = cache.get('potentiallyCachedHDVideos') || {};

        if (this.wrapperEl.classList.contains(CSS_CLASS_HD)) {
            this.player.selectVideoTrack(this.largestRepresentationId + 1);
            // If we are switching to SD, unflag this file to be HD on subsequent views
            delete potentiallyCachedHDVideos[this.mediaUrl];
        } else {
            this.player.selectVideoTrack(this.largestRepresentationId);
            // If we are switching to HD, flag this file to be HD on subsequent views as we may have cached segments
            potentiallyCachedHDVideos[this.mediaUrl] = true;
        }

        cache.set('potentiallyCachedHDVideos', potentiallyCachedHDVideos);
    }

    /**
     * Handles adaptation changes
     *
     * @param {Object} adaptation
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

        this.mediaControls.on('togglehd', () => {
            this.hdHandler();
        });
    }

    /**
     * Loads the controls
     *
     * @private
     * @returns {void}
     */
    loadUI() {
        super.loadUI();
        this.calculateVideoDimensions();

        if (this.options.sharedName) {
            this.filmstripUrl = this.filmstripUrl + '?' + 'shared_name=' + this.options.sharedName;
        }
        this.mediaControls.initFilmstrip(this.filmstripUrl);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Dash = Dash;
global.Box = Box;
export default Dash;
