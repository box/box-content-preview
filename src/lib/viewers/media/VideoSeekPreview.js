import { CLASS_IS_VISIBLE } from '../../constants';

const CLASS_SEEK_PREVIEW = 'bp-media-seek-preview';
const CLASS_SEEK_PREVIEW_FRAME = 'bp-media-seek-preview-frame';
const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_FRAME_HEIGHT = 90;
// Keeps times that are exact multiples of the interval in their own frame despite float error
const FRAME_TIME_EPSILON = 1e-6;
// Shaka makes its own short seeks: a 1ms nudge back to flush the decoder after an unbuffered seek, and
// jumps over gaps up to its 0.5s smallGapLimit. Seeks this close to the playhead (which timeupdate
// only reports every ~250ms) or to the frame already shown are adjustments, not user seeks.
const MIN_PREVIEW_SEEK_DISTANCE = 1;
// requestVideoFrameCallback may not fire for a paused video in every browser
const HIDE_FALLBACK_MS = 250;

/**
 * Covers the video with the dimmed filmstrip frame for the seek target, then fades away once
 * the video paints the real frame. Replaces the stale frame and spinner the user would
 * otherwise see while the segment downloads, and gives buffered seeks the same transition.
 */
class VideoSeekPreview {
    /** @property {HTMLCanvasElement} - Canvas the filmstrip frame is drawn into */
    canvasEl;

    /** @property {HTMLElement} - Overlay element positioned over the video */
    el;

    /** @property {number|undefined} - Pending requestVideoFrameCallback handle */
    frameCallbackId;

    /** @property {number|undefined} - Pending fallback hide timeout */
    hideTimeoutId;

    /** @property {HTMLImageElement|undefined} - Filmstrip sprite */
    imageEl;

    /** @property {number} - Seconds between filmstrip frames */
    interval = 0;

    /** @property {boolean} - Whether the filmstrip sprite has finished loading */
    isImageLoaded = false;

    /** @property {boolean} - Keeps the preview up while the user drags the scrubber */
    isScrubbing = false;

    /** @property {HTMLVideoElement} - Video element being previewed */
    mediaEl;

    /** @property {Function|undefined} - Called when the preview starts fading away */
    onHide;

    /** @property {Function|undefined} - Called when the preview starts covering the video */
    onShow;

    /** @property {number|undefined} - Last playhead position the video reported outside of a seek */
    settledTime;

    /** @property {number|undefined} - Time of the frame currently drawn */
    shownTime;

    /**
     * [constructor]
     *
     * @param {Object} options
     * @param {HTMLVideoElement} options.mediaEl - Video element to cover while seeking
     * @param {Function} [options.onHide] - Called when the preview starts fading away
     * @param {Function} [options.onShow] - Called when the preview starts covering the video
     * @return {VideoSeekPreview} VideoSeekPreview instance
     */
    constructor({ mediaEl, onHide, onShow }) {
        this.mediaEl = mediaEl;
        this.onHide = onHide;
        this.onShow = onShow;

        this.el = document.createElement('div');
        this.el.className = CLASS_SEEK_PREVIEW;
        this.el.setAttribute('aria-hidden', 'true');
        this.canvasEl = this.el.appendChild(document.createElement('canvas'));
        this.canvasEl.className = CLASS_SEEK_PREVIEW_FRAME;

        // Directly after the video so the spinner and controls still paint on top
        this.mediaEl.insertAdjacentElement('afterend', this.el);

        this.mediaEl.addEventListener('seeking', this.handleSeeking);
        this.mediaEl.addEventListener('seeked', this.handleSeeked);
        this.mediaEl.addEventListener('timeupdate', this.handleTimeupdate);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.cancelPendingHide();
        this.mediaEl.removeEventListener('seeking', this.handleSeeking);
        this.mediaEl.removeEventListener('seeked', this.handleSeeked);
        this.mediaEl.removeEventListener('timeupdate', this.handleTimeupdate);
        this.el.remove();

        if (this.imageEl) {
            this.imageEl.removeEventListener('load', this.handleImageLoad);
            this.imageEl = undefined;
        }
    }

    /**
     * Loads the filmstrip sprite used to draw preview frames.
     *
     * @param {string} url - Filmstrip URL (blob: URL, since the rep needs auth headers)
     * @param {number} interval - Seconds between filmstrip frames
     * @return {void}
     */
    setFilmstrip(url, interval) {
        this.interval = interval;
        this.isImageLoaded = false;
        this.imageEl = new Image();
        this.imageEl.addEventListener('load', this.handleImageLoad);
        this.imageEl.src = url;
    }

    /**
     * @return {boolean} true while the preview is covering the video
     */
    isVisible() {
        return this.el.classList.contains(CLASS_IS_VISIBLE);
    }

    /**
     * The conversion samples one sprite frame at the start of each interval, so seeking here lands on
     * the same picture the preview shows.
     *
     * @param {number} time - Time in seconds
     * @return {number} Start time of the filmstrip frame that covers the given time
     */
    getFrameTime(time) {
        if (!(this.interval > 0)) {
            return time;
        }

        return this.getFrameNumber(time) * this.interval;
    }

    /**
     * Covers the video with the filmstrip frame for the given time.
     *
     * @param {number} time - Time in seconds
     * @return {boolean} true if a frame is showing
     */
    showFrame(time) {
        const wasVisible = this.isVisible();

        this.cancelPendingHide();

        if (!this.drawFrame(time)) {
            return false;
        }

        this.shownTime = time;
        this.position();
        this.el.classList.add(CLASS_IS_VISIBLE);

        if (!wasVisible && this.onShow) {
            this.onShow();
        }

        return true;
    }

    /**
     * Holds the preview up until endScrub, even if an earlier seek finishes mid-drag.
     *
     * @return {void}
     */
    startScrub() {
        this.isScrubbing = true;
        this.cancelPendingHide();
    }

    /**
     * Releases the preview. Call after seeking to the scrub target so the preview fades once
     * that frame paints.
     *
     * @return {void}
     */
    endScrub() {
        this.isScrubbing = false;

        if (!this.mediaEl.seeking) {
            this.handleSeeked();
        }
    }

    /**
     * Starts the fade back to the video.
     *
     * @return {void}
     */
    hide = () => {
        const wasVisible = this.isVisible();

        this.cancelPendingHide();
        this.el.classList.remove(CLASS_IS_VISIBLE);

        if (wasVisible && this.onHide) {
            this.onHide();
        }
    };

    /**
     * Matches the overlay to the video's content box.
     *
     * @return {void}
     */
    position() {
        const { clientHeight, clientLeft, clientTop, clientWidth, offsetLeft, offsetTop } = this.mediaEl;

        Object.assign(this.el.style, {
            height: `${clientHeight}px`,
            left: `${offsetLeft + clientLeft}px`,
            top: `${offsetTop + clientTop}px`,
            width: `${clientWidth}px`,
        });
    }

    /**
     * @private
     * @return {void}
     */
    handleImageLoad = () => {
        this.isImageLoaded = true;
    };

    /**
     * Shows the filmstrip frame for the seek target.
     *
     * @private
     * @return {void}
     */
    handleSeeking = () => {
        const { currentTime } = this.mediaEl;
        const isVisible = this.isVisible();
        const isAdjustment =
            Math.abs(currentTime - this.settledTime) < MIN_PREVIEW_SEEK_DISTANCE ||
            (isVisible && Math.abs(currentTime - this.shownTime) < MIN_PREVIEW_SEEK_DISTANCE);

        if (isAdjustment) {
            if (isVisible) {
                this.cancelPendingHide();
            }
            return;
        }

        if (!this.showFrame(currentTime)) {
            this.hide();
        }
    };

    /**
     * @private
     * @return {void}
     */
    handleTimeupdate = () => {
        if (!this.mediaEl.seeking) {
            this.settledTime = this.mediaEl.currentTime;
        }
    };

    /**
     * 'seeked' means the frame is decoded, not necessarily painted, so wait for the next
     * presented frame before fading out.
     *
     * @private
     * @return {void}
     */
    handleSeeked = () => {
        if (!this.isVisible() || this.isScrubbing) {
            return;
        }

        this.cancelPendingHide();

        if (typeof this.mediaEl.requestVideoFrameCallback === 'function') {
            this.frameCallbackId = this.mediaEl.requestVideoFrameCallback(this.hide);
        }

        this.hideTimeoutId = setTimeout(this.hide, HIDE_FALLBACK_MS);
    };

    /**
     * @private
     * @return {void}
     */
    cancelPendingHide() {
        if (this.frameCallbackId !== undefined) {
            if (typeof this.mediaEl.cancelVideoFrameCallback === 'function') {
                this.mediaEl.cancelVideoFrameCallback(this.frameCallbackId);
            }
            this.frameCallbackId = undefined;
        }

        if (this.hideTimeoutId !== undefined) {
            clearTimeout(this.hideTimeoutId);
            this.hideTimeoutId = undefined;
        }
    }

    /**
     * @private
     * @param {number} time - Time in seconds
     * @return {number} Index of the filmstrip frame that covers the given time
     */
    getFrameNumber(time) {
        return Math.floor(time / this.interval + FRAME_TIME_EPSILON);
    }

    /**
     * Draws the filmstrip frame for the given time. Uses the same sprite layout as FilmstripV2:
     * 100 frames per row, each 90px tall.
     *
     * @private
     * @param {number} time - Time in seconds
     * @return {boolean} true if a frame was drawn
     */
    drawFrame(time) {
        if (!this.isImageLoaded || !this.imageEl || !(this.interval > 0)) {
            return false;
        }

        const { naturalHeight, naturalWidth } = this.imageEl;
        const frameWidth = Math.floor(naturalWidth / FILMSTRIP_FRAMES_PER_ROW);
        const frameNumber = this.getFrameNumber(time);
        const sourceX = (frameNumber % FILMSTRIP_FRAMES_PER_ROW) * frameWidth;
        const sourceY = Math.floor(frameNumber / FILMSTRIP_FRAMES_PER_ROW) * FILMSTRIP_FRAME_HEIGHT;

        if (!frameWidth || sourceY + FILMSTRIP_FRAME_HEIGHT > naturalHeight) {
            return false;
        }

        const context = this.canvasEl.getContext('2d');
        if (!context) {
            return false;
        }

        if (this.canvasEl.width !== frameWidth || this.canvasEl.height !== FILMSTRIP_FRAME_HEIGHT) {
            this.canvasEl.width = frameWidth;
            this.canvasEl.height = FILMSTRIP_FRAME_HEIGHT;
        }

        context.drawImage(
            this.imageEl,
            sourceX,
            sourceY,
            frameWidth,
            FILMSTRIP_FRAME_HEIGHT,
            0,
            0,
            frameWidth,
            FILMSTRIP_FRAME_HEIGHT,
        );

        return true;
    }
}

export default VideoSeekPreview;
