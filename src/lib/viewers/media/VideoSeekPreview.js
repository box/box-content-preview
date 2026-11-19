import { CLASS_IS_VISIBLE } from '../../constants';

const CLASS_SEEK_PREVIEW = 'bp-media-seek-preview';
const CLASS_SEEK_PREVIEW_FRAME = 'bp-media-seek-preview-frame';
const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_FRAME_HEIGHT = 90;
// requestVideoFrameCallback may not fire for a paused video in every browser
const HIDE_FALLBACK_MS = 250;

/**
 * Covers the video with the filmstrip frame for a seek target that is not buffered yet,
 * then fades away once the video paints the real frame. Replaces the stale frame and
 * spinner the user would otherwise see while the segment downloads.
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

    /** @property {HTMLVideoElement} - Video element being previewed */
    mediaEl;

    /** @property {Function|undefined} - Called each time the preview is shown */
    onShow;

    /**
     * [constructor]
     *
     * @param {Object} options
     * @param {HTMLVideoElement} options.mediaEl - Video element to cover while seeking
     * @param {Function} [options.onShow] - Called each time the preview is shown
     * @return {VideoSeekPreview} VideoSeekPreview instance
     */
    constructor({ mediaEl, onShow }) {
        this.mediaEl = mediaEl;
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
     * Starts the fade back to the video.
     *
     * @return {void}
     */
    hide = () => {
        this.cancelPendingHide();
        this.el.classList.remove(CLASS_IS_VISIBLE);
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
     * Shows the filmstrip frame for the seek target when the video has to download it first.
     * Keeps updating while already visible so a drag across buffered ranges never shows a stale frame.
     *
     * @private
     * @return {void}
     */
    handleSeeking = () => {
        const time = this.mediaEl.currentTime;

        if (!this.isVisible() && this.isBuffered(time)) {
            return;
        }

        this.cancelPendingHide();

        if (!this.drawFrame(time)) {
            this.hide();
            return;
        }

        this.position();
        this.el.classList.add(CLASS_IS_VISIBLE);

        if (this.onShow) {
            this.onShow();
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
        if (!this.isVisible()) {
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
        const frameNumber = Math.floor(time / this.interval);
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

    /**
     * @private
     * @param {number} time - Time in seconds
     * @return {boolean} true if the video already has data for the given time
     */
    isBuffered(time) {
        const { buffered } = this.mediaEl;

        for (let i = 0; i < buffered.length; i += 1) {
            if (time >= buffered.start(i) && time < buffered.end(i)) {
                return true;
            }
        }

        return false;
    }
}

export default VideoSeekPreview;
