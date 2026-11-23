import { CLASS_IS_VISIBLE } from '../../constants';
import { isTimeBuffered } from '../controls/media/utils';

const CLASS_SEEK_PREVIEW = 'bp-media-seek-preview';
const CLASS_SEEK_PREVIEW_DIMMED = 'bp-is-dimmed';
const CLASS_SEEK_PREVIEW_IMMEDIATE = 'bp-is-immediate';
const CLASS_SEEK_PREVIEW_SHARP = 'bp-is-sharp';
const CLASS_SEEK_PREVIEW_FRAME = 'bp-media-seek-preview-frame';
const CLASS_SEEK_PREVIEW_FRAME_BASE = 'bp-media-seek-preview-frame-base';
const FILMSTRIP_FRAMES_PER_ROW = 100;
const FILMSTRIP_FRAME_HEIGHT = 90;
// Caps how long the overlay waits for the next painted frame after 'seeked'
const HIDE_FALLBACK_MS = 100;
// Brief delay before covering the video on a seek so disk-cached chunks resolve without flashing
const SHOW_DELAY_MS = 80;

export type Options = {
    /** Full-resolution frame at a time, if one is available; the filmstrip is used otherwise */
    getFrame?: (time: number) => HTMLCanvasElement | undefined;
    /** Video element to cover while seeking */
    mediaEl: HTMLVideoElement;
    /** Called when the preview starts fading away */
    onHide?: () => void;
    /** Called when the preview starts covering the video */
    onShow?: () => void;
};

/**
 * Covers the video with the filmstrip frame for an unbuffered seek target, dims it while the segment
 * downloads, brightens it once the target is buffered, and fades it away once the video paints the
 * real frame. Replaces the stale frame and spinner the user would otherwise see. Buffered and fast
 * cached seeks are left alone.
 */
export default class VideoSeekPreview {
    /** Unblurred copy of the frame that keeps the blurred frame's edges solid */
    baseCanvasEl: HTMLCanvasElement;

    /** Blurred filmstrip frame drawn over the video */
    canvasEl: HTMLCanvasElement;

    /** Animation frame that dims a newly shown preview */
    dimFrameId?: number;

    /** Overlay container placed directly after the video */
    el: HTMLDivElement;

    /** Time of the frame currently drawn */
    frameTime?: number;

    getFrame?: (time: number) => HTMLCanvasElement | undefined;

    /** Video frame callback that hides the preview once the real frame paints */
    frameCallbackId?: number;

    /** Animation frame that hides the preview after a paused seek */
    hideFrameId?: number;

    /** Fallback timeout that hides the preview if no frame callback fires */
    hideTimeoutId?: number;

    /** Filmstrip sprite sheet */
    imageEl?: HTMLImageElement;

    /** Seconds between filmstrip frames */
    interval = 0;

    /** Whether the filmstrip has loaded and frames can be drawn */
    isImageLoaded = false;

    /** Keeps the preview up while the user drags the scrubber */
    isScrubbing = false;

    /** Video element the preview covers */
    mediaEl: HTMLVideoElement;

    onHide?: () => void;

    onShow?: () => void;

    /** Delay before an unbuffered seek shows the preview */
    showTimeoutId?: number;

    constructor({ getFrame, mediaEl, onHide, onShow }: Options) {
        this.getFrame = getFrame;
        this.mediaEl = mediaEl;
        this.onHide = onHide;
        this.onShow = onShow;

        this.el = document.createElement('div');
        this.el.className = CLASS_SEEK_PREVIEW;
        this.el.setAttribute('aria-hidden', 'true');
        this.baseCanvasEl = this.el.appendChild(document.createElement('canvas'));
        this.baseCanvasEl.className = `${CLASS_SEEK_PREVIEW_FRAME} ${CLASS_SEEK_PREVIEW_FRAME_BASE}`;
        this.canvasEl = this.el.appendChild(document.createElement('canvas'));
        this.canvasEl.className = CLASS_SEEK_PREVIEW_FRAME;

        // Directly after the video so the spinner and controls still paint on top
        this.mediaEl.insertAdjacentElement('afterend', this.el);

        this.mediaEl.addEventListener('seeking', this.handleSeeking);
        this.mediaEl.addEventListener('seeked', this.handleSeeked);
        this.mediaEl.addEventListener('loadeddata', this.handleMediaReady);
        this.mediaEl.addEventListener('canplay', this.handleMediaReady);
    }

    destroy(): void {
        this.cancelPending();
        this.cancelPendingDim();
        this.mediaEl.removeEventListener('seeking', this.handleSeeking);
        this.mediaEl.removeEventListener('seeked', this.handleSeeked);
        this.mediaEl.removeEventListener('loadeddata', this.handleMediaReady);
        this.mediaEl.removeEventListener('canplay', this.handleMediaReady);
        this.el.remove();

        if (this.imageEl) {
            this.imageEl.removeEventListener('load', this.handleImageLoad);
            this.imageEl = undefined;
        }
    }

    /**
     * @param url - Filmstrip URL (blob: URL, since the rep needs auth headers)
     * @param interval - Seconds between filmstrip frames
     */
    setFilmstrip(url: string, interval: number): void {
        this.interval = interval;
        this.isImageLoaded = false;
        this.imageEl = new Image();
        this.imageEl.addEventListener('load', this.handleImageLoad);
        this.imageEl.src = url;
    }

    isVisible(): boolean {
        return this.el.classList.contains(CLASS_IS_VISIBLE);
    }

    /**
     * @param time - Time in seconds
     * @return true if a frame is showing
     */
    showFrame(time: number): boolean {
        const wasVisible = this.isVisible();

        this.cancelPending();

        if (!this.drawFrame(time)) {
            return false;
        }
        this.frameTime = time;

        this.position();
        this.el.classList.remove(CLASS_SEEK_PREVIEW_IMMEDIATE);
        this.el.classList.add(CLASS_IS_VISIBLE);

        if (!this.el.classList.contains(CLASS_SEEK_PREVIEW_DIMMED) && this.dimFrameId === undefined) {
            // Dim on the next frame so it transitions from full brightness instead of snapping
            this.dimFrameId = requestAnimationFrame(() => {
                this.dimFrameId = undefined;
                this.el.classList.add(CLASS_SEEK_PREVIEW_DIMMED);
            });
        }

        if (!wasVisible && this.onShow) {
            this.onShow();
        }

        return true;
    }

    // Redraws the visible frame, e.g. once the real frame for it is ready
    redraw(): void {
        if (this.isVisible() && this.frameTime !== undefined) {
            this.drawFrame(this.frameTime);
        }
    }

    // Stops seek completion from hiding the preview until endScrub
    startScrub(): void {
        this.isScrubbing = true;
        this.cancelPending();
    }

    // Call after seeking to the scrub target so the preview fades once that frame paints
    endScrub(): void {
        this.isScrubbing = false;

        if (!this.mediaEl.seeking) {
            this.handleSeeked();
        }
    }

    /**
     * @param options.immediate - Skip the fade-out transition (e.g. when entering buffered video)
     */
    hide({ immediate = false }: { immediate?: boolean } = {}): void {
        const wasVisible = this.isVisible();

        this.cancelPending();
        this.cancelPendingDim();
        this.el.classList.toggle(CLASS_SEEK_PREVIEW_IMMEDIATE, immediate);
        this.el.classList.remove(CLASS_IS_VISIBLE, CLASS_SEEK_PREVIEW_DIMMED);

        if (wasVisible && this.onHide) {
            this.onHide();
        }
    }

    // Matches the overlay to the video's content box
    position(): void {
        const { clientHeight, clientLeft, clientTop, clientWidth, offsetLeft, offsetTop } = this.mediaEl;

        Object.assign(this.el.style, {
            height: `${clientHeight}px`,
            left: `${offsetLeft + clientLeft}px`,
            top: `${offsetTop + clientTop}px`,
            width: `${clientWidth}px`,
        });
    }

    handleImageLoad = (): void => {
        this.isImageLoaded = true;
    };

    // Buffered targets hide the preview immediately. A visible preview switches frames at once;
    // otherwise it waits SHOW_DELAY_MS.
    handleSeeking = (): void => {
        // 'seeking' fires asynchronously, so during a drag it can report a position the scrubber has already left
        if (this.isScrubbing) {
            return;
        }

        const time = this.mediaEl.currentTime;

        this.cancelPending();

        if (this.isTimeBuffered(time)) {
            this.hide({ immediate: true });
            return;
        }

        if (this.isVisible()) {
            if (!this.showFrame(time)) {
                this.hide();
            }
            return;
        }

        this.showTimeoutId = window.setTimeout(() => {
            const { currentTime } = this.mediaEl;
            if (!this.isTimeBuffered(currentTime)) {
                this.showFrame(currentTime);
            }
        }, SHOW_DELAY_MS);
    };

    isTimeBuffered(time: number): boolean {
        return isTimeBuffered(this.mediaEl.buffered, time);
    }

    cancelPendingDim(): void {
        if (this.dimFrameId !== undefined) {
            cancelAnimationFrame(this.dimFrameId);
            this.dimFrameId = undefined;
        }
    }

    cancelPending(): void {
        window.clearTimeout(this.showTimeoutId);
        window.clearTimeout(this.hideTimeoutId);

        if (this.hideFrameId !== undefined) {
            cancelAnimationFrame(this.hideFrameId);
            this.hideFrameId = undefined;
        }

        if (this.frameCallbackId !== undefined) {
            this.mediaEl.cancelVideoFrameCallback?.(this.frameCallbackId);
            this.frameCallbackId = undefined;
        }
    }

    // Undims as soon as the target is buffered, even if 'seeked' has not fired yet
    handleMediaReady = (): void => {
        if (!this.isScrubbing && this.isTimeBuffered(this.mediaEl.currentTime)) {
            this.undim();
        }
    };

    undim(): void {
        this.cancelPendingDim();
        this.el.classList.remove(CLASS_SEEK_PREVIEW_DIMMED);
    }

    // 'seeked' means the frame is decoded, not necessarily painted, so wait for the next presented frame
    handleSeeked = (): void => {
        this.cancelPending();

        if (!this.isVisible() || this.isScrubbing) {
            return;
        }

        this.undim();

        if (this.mediaEl.paused) {
            this.hideFrameId = requestAnimationFrame(() => this.hide());
        } else if (typeof this.mediaEl.requestVideoFrameCallback === 'function') {
            this.frameCallbackId = this.mediaEl.requestVideoFrameCallback(() => this.hide());
        }

        this.hideTimeoutId = window.setTimeout(() => this.hide(), HIDE_FALLBACK_MS);
    };

    drawFrame(time: number): boolean {
        const frame = this.getFrame?.(time);
        this.el.classList.toggle(CLASS_SEEK_PREVIEW_SHARP, !!frame);

        if (frame) {
            return this.drawToCanvases(frame, 0, 0, frame.width, frame.height);
        }

        return this.drawFilmstripFrame(time);
    }

    // Uses the same sprite layout as FilmstripV2
    drawFilmstripFrame(time: number): boolean {
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

        return this.drawToCanvases(this.imageEl, sourceX, sourceY, frameWidth, FILMSTRIP_FRAME_HEIGHT);
    }

    drawToCanvases(
        source: CanvasImageSource,
        sourceX: number,
        sourceY: number,
        width: number,
        height: number,
    ): boolean {
        const context = this.canvasEl.getContext('2d');
        if (!context) {
            return false;
        }

        [this.baseCanvasEl, this.canvasEl].forEach(canvasEl => {
            if (canvasEl.width !== width || canvasEl.height !== height) {
                canvasEl.width = width;
                canvasEl.height = height;
            }
        });

        context.drawImage(source, sourceX, sourceY, width, height, 0, 0, width, height);

        const baseContext = this.baseCanvasEl.getContext('2d');
        if (baseContext) {
            baseContext.drawImage(this.canvasEl, 0, 0);
        }

        return true;
    }
}
