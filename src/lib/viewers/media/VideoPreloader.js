import EventEmitter from 'events';
import Api from '../../api';
import {
    CLASS_BOX_PREVIEW_CONTENT,
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_BOX_PREVIEW_PRELOAD_CONTENT,
    CLASS_BOX_PREVIEW_PRELOAD_PLACEHOLDER,
    CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_VIDEO,
    CLASS_BOX_PREVIEW_VIDEO_PRELOAD_PLAY_OVERLAY,
    CLASS_HIDDEN,
    CLASS_INVISIBLE,
    CLASS_IS_TRANSPARENT,
    CLASS_IS_VISIBLE,
    MIN_VIDEO_WIDTH_PX,
    VIDEO_PLAYER_CONTROL_BAR_HEIGHT,
} from '../../constants';
import { ICON_PLAY_LARGE } from '../../icons';
import { handleRepresentationBlobFetch } from '../../util';
import fitFrameToViewport from './fitFrameToViewport';

class VideoPreloader extends EventEmitter {
    /** @property {Api} - Api layer used for XHR calls */
    api = new Api();

    /** @property {HTMLElement} - Viewer container */
    containerEl;

    /** @property {HTMLElement} - Preload image element */
    imageEl;

    /** @property {HTMLElement} - Preload placeholder element */
    placeholderEl;

    /** @property {HTMLElement} - Preload container element */
    preloadEl;

    /** @property {string} - Preload representation content URL */
    srcUrl;

    /** @property {string} - Class name for preload wrapper */
    wrapperClassName;

    /** @property {HTMLElement} - Preload wrapper element */
    wrapperEl;

    /** @property {boolean} - When true, never create/paint a new Instant Preview poster */
    blockPosterPaint = false;

    /**
     * [constructor]
     *
     * @param {Object} options - Preloader options
     * @param {Api} options.api - API Instance
     * @return {VideoPreloader} VideoPreloader instance
     */
    constructor({ api } = {}) {
        super();
        if (api) {
            this.api = api;
        }
        this.wrapperClassName = CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_VIDEO;
    }

    /**
     * Stop any in-flight or future poster from painting. Used once the video is ready
     * (or playback has dismissed Instant Preview) so a late JPG cannot overlay the video.
     * Does not hide an Instant Preview that is already painted — play still dismisses that.
     *
     * @return {void}
     */
    blockFuturePosterPaint() {
        this.blockPosterPaint = true;
    }

    /**
     * Shows a preload of the video by showing a thumbnail image. This should be called
     * while the full video loads to give the user visual feedback on the file as soon as possible.
     *
     * @param {string} preloadUrlWithAuth - URL for preload content with authorization query params
     * @param {HTMLElement} containerEl - Container element to append preload to
     * @param {Object} [options] - Optional options
     * @param {Object} [options.viewport] - { width, height } to use for sizing (same as video viewport to avoid jump)
     * @param {Function} [options.onImageClick] - Called when user clicks the preload image
     * @return {Promise} Promise to show preload
     */
    showPreload(preloadUrlWithAuth, containerEl, options = {}) {
        this.containerEl = containerEl;
        this.preloadOptions = options;

        if (this.shouldAbortPosterPaint()) {
            return Promise.resolve();
        }

        return this.api
            .get(preloadUrlWithAuth, { type: 'blob' })
            .then(handleRepresentationBlobFetch)
            .then(imgBlob => {
                if (this.checkVideoLoaded()) {
                    return;
                }

                this.srcUrl = URL.createObjectURL(imgBlob);

                this.wrapperEl = document.createElement('div');
                this.wrapperEl.className = this.wrapperClassName;
                this.wrapperEl.innerHTML = `
                <div class="${CLASS_BOX_PREVIEW_PRELOAD} ${CLASS_INVISIBLE}">
                    <div class="${CLASS_BOX_PREVIEW_PRELOAD_PLACEHOLDER}">
                        <img class="${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}" src="${this.srcUrl}" />
                        <div class="${CLASS_BOX_PREVIEW_VIDEO_PRELOAD_PLAY_OVERLAY}">${ICON_PLAY_LARGE}</div>
                    </div>
                </div>
            `.trim();

                // Video may have become ready while we built the DOM — do not attach an unpainted poster.
                if (this.checkVideoLoaded()) {
                    return;
                }

                this.containerEl.appendChild(this.wrapperEl);
                this.placeholderEl = this.wrapperEl.querySelector(`.${CLASS_BOX_PREVIEW_PRELOAD_PLACEHOLDER}`);
                this.preloadEl = this.wrapperEl.querySelector(`.${CLASS_BOX_PREVIEW_PRELOAD}`);
                this.imageEl = this.preloadEl.querySelector(`.${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}`);
                this.bindDOMListeners();

                // If image is already loaded (cached), show it immediately
                // This follows the same pattern as ImageViewer.js
                if (this.imageEl && this.imageEl.complete && this.imageEl.naturalHeight > 0) {
                    this.loadHandler();
                }
            })
            .catch(() => {
                // Silently fail if preload image can't be loaded
            });
    }

    /**
     * Hides the preload if it exists.
     *
     * @return {void}
     */
    hidePreload() {
        if (!this.wrapperEl) {
            return;
        }

        if (this.containerEl) {
            this.containerEl.style.width = '';
            this.containerEl.style.height = '';
        }

        this.unbindDOMListeners();
        this.wrapperEl.classList.add(CLASS_IS_TRANSPARENT);

        // Cleanup preload DOM after fade out
        this.wrapperEl.addEventListener('transitionend', this.cleanupPreload);

        // Cleanup preload DOM immediately if user interacts after the video is ready
        this.wrapperEl.addEventListener('click', this.cleanupPreload);
    }

    /**
     * Hides the play overlay on the preload thumbnail. Used for narrow videos where the
     * player renders its own play/seek cluster, so the thumbnail overlay would be redundant.
     *
     * @return {void}
     */
    hidePlayOverlay() {
        if (!this.wrapperEl) {
            return;
        }
        const overlay = this.wrapperEl.querySelector(`.${CLASS_BOX_PREVIEW_VIDEO_PRELOAD_PLAY_OVERLAY}`);
        if (overlay) {
            overlay.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Shows the play overlay on the preload thumbnail. Used when a video is no longer narrow
     * and the player's play/seek cluster is removed.
     *
     * @return {void}
     */
    showPlayOverlay() {
        if (!this.wrapperEl) {
            return;
        }
        const overlay = this.wrapperEl.querySelector(`.${CLASS_BOX_PREVIEW_VIDEO_PRELOAD_PLAY_OVERLAY}`);
        if (overlay) {
            overlay.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Swaps the play overlay for a loading spinner on the preload image.
     * Called when the user clicks play so they get immediate visual feedback
     * while the video buffers.
     *
     * @return {void}
     */
    showLoading() {
        if (!this.wrapperEl) {
            return;
        }

        const playOverlay = this.wrapperEl.querySelector(`.${CLASS_BOX_PREVIEW_VIDEO_PRELOAD_PLAY_OVERLAY}`);
        if (playOverlay) {
            playOverlay.classList.add(CLASS_HIDDEN);
        }

        if (this.imageClickHandler) {
            this.wrapperEl.removeEventListener('click', this.imageClickHandler);
            this.imageClickHandler = undefined;
        }
        this.wrapperEl.style.cursor = '';

        if (this.placeholderEl) {
            const spinner = document.createElement('div');
            spinner.className = 'bp-media-buffering-spinner';
            this.placeholderEl.appendChild(spinner);
        }
    }

    /**
     * Whether the poster is still the authoritative painted frame.
     * False once hide/dismiss starts (transparent fade) so resize uses video geometry.
     *
     * @return {boolean} true when the poster has painted and is not dismissing
     */
    isVisible() {
        return (
            !!this.preloadEl &&
            !!this.wrapperEl &&
            !this.preloadEl.classList.contains(CLASS_INVISIBLE) &&
            !this.wrapperEl.classList.contains(CLASS_IS_TRANSPARENT)
        );
    }

    /**
     * Cleans up preload DOM.
     *
     * @private
     * @return {void}
     */
    cleanupPreload = () => {
        if (this.wrapperEl) {
            if (this.wrapperEl.parentNode) {
                this.wrapperEl.parentNode.removeChild(this.wrapperEl);
            }
            this.wrapperEl = undefined;
        }

        this.preloadEl = undefined;
        this.imageEl = undefined;
        this.placeholderEl = undefined;

        if (this.srcUrl) {
            URL.revokeObjectURL(this.srcUrl);
            this.srcUrl = undefined;
        }
    };

    /**
     * Binds event listeners for preload
     *
     * @private
     * @return {void}
     */
    bindDOMListeners() {
        if (this.imageEl) {
            this.imageEl.addEventListener('load', this.loadHandler);
            this.imageEl.addEventListener('error', this.errorHandler);
        }
    }

    /**
     * Unbinds event listeners for preload
     *
     * @private
     * @return {void}
     */
    unbindDOMListeners() {
        if (this.imageEl) {
            this.imageEl.removeEventListener('load', this.loadHandler);
            this.imageEl.removeEventListener('error', this.errorHandler);
        }
        if (this.wrapperEl && this.imageClickHandler) {
            this.wrapperEl.removeEventListener('click', this.imageClickHandler);
            this.imageClickHandler = undefined;
        }
    }

    /**
     * Handler for when preload image loads successfully
     *
     * @private
     * @return {void}
     */
    loadHandler = () => {
        if (!this.preloadEl || !this.imageEl || !this.preloadEl.classList.contains(CLASS_INVISIBLE)) {
            return;
        }

        if (this.checkVideoLoaded()) {
            return;
        }

        this.sizeContainerToViewport(this.resolveViewport());
        this.preloadEl.classList.remove(CLASS_INVISIBLE);

        const mediaWrapper = this.containerEl?.closest('.bp-media');
        if (mediaWrapper) {
            mediaWrapper.classList.add(CLASS_IS_VISIBLE);
        }

        const onImageClick = this.preloadOptions?.onImageClick;
        if (onImageClick && this.wrapperEl) {
            this.wrapperEl.style.cursor = 'pointer';
            this.imageClickHandler = e => {
                e.preventDefault();
                e.stopPropagation();
                onImageClick();
            };
            this.wrapperEl.addEventListener('click', this.imageClickHandler);
        }

        this.emit('preload');
    };

    /**
     * Resolves the viewport to size against, preferring a live getter when provided
     * so layout changes after showPreload() are reflected at paint time.
     *
     * @private
     * @return {Object|undefined} viewport width/height
     */
    resolveViewport() {
        const { getViewport, viewport } = this.preloadOptions || {};
        if (typeof getViewport === 'function') {
            return getViewport();
        }
        return viewport;
    }

    /**
     * Sizes the target based on viewport dimensions and image aspect ratio to match video player sizing.
     * This prevents the thumbnail from appearing small and then jumping to the correct size.
     *
     * @param {Object} [viewportOverride] - Optional { width, height }; when provided, use instead of walking DOM (same as video viewport)
     * @return {void}
     */
    sizeContainerToViewport(viewportOverride) {
        if (!this.containerEl || !this.imageEl) {
            return;
        }

        let viewport;
        if (
            viewportOverride &&
            typeof viewportOverride.width === 'number' &&
            typeof viewportOverride.height === 'number'
        ) {
            viewport = { width: viewportOverride.width, height: viewportOverride.height };
        } else {
            let contentWrapper = this.containerEl;
            while (contentWrapper && contentWrapper.parentNode) {
                contentWrapper = contentWrapper.parentNode;
                if (contentWrapper.classList && contentWrapper.classList.contains(CLASS_BOX_PREVIEW_CONTENT)) {
                    break;
                }
            }

            if (
                !contentWrapper ||
                !contentWrapper.classList ||
                !contentWrapper.classList.contains(CLASS_BOX_PREVIEW_CONTENT)
            ) {
                contentWrapper = this.containerEl.parentNode;
                if (!contentWrapper) {
                    return;
                }
            }

            viewport = {
                height: contentWrapper.clientHeight - VIDEO_PLAYER_CONTROL_BAR_HEIGHT,
                width: contentWrapper.clientWidth,
            };
        }

        // Use natural dimensions if available (image has loaded), otherwise use current dimensions
        const imageWidth = this.imageEl.naturalWidth || this.imageEl.width || 1;
        const imageHeight = this.imageEl.naturalHeight || this.imageEl.height || 1;

        if (this.preloadOptions?.earlyPaint) {
            const { width, height } = fitFrameToViewport(imageWidth / imageHeight, viewport);
            this.containerEl.style.width = `${width}px`;
            this.containerEl.style.height = `${height}px`;
            return;
        }

        // Legacy path: enforce minimum width to match V1 / pre-early-paint V2 video sizing
        const containerWidth = Math.max(MIN_VIDEO_WIDTH_PX, viewport.width);
        const aspectRatio = imageWidth / imageHeight;
        let containerHeight = containerWidth / aspectRatio;
        let finalWidth = containerWidth;

        if (containerHeight > viewport.height) {
            containerHeight = viewport.height;
            finalWidth = containerHeight * aspectRatio;
            if (finalWidth < MIN_VIDEO_WIDTH_PX) {
                finalWidth = MIN_VIDEO_WIDTH_PX;
                containerHeight = finalWidth / aspectRatio;
            }
        }

        this.containerEl.style.width = `${finalWidth}px`;
        this.containerEl.style.height = `${containerHeight}px`;
    }

    /**
     * Handler for when preload image fails to load
     *
     * @private
     * @return {void}
     */
    errorHandler = () => {
        this.cleanupPreload();
    };

    /**
     * Whether Instant Preview should stop creating/painting a poster.
     * True once the viewer marks the video ready, while playing, or once metadata exists.
     *
     * @private
     * @return {boolean}
     */
    shouldAbortPosterPaint() {
        if (this.blockPosterPaint) {
            return true;
        }

        if (!this.containerEl) {
            return false;
        }

        const videoEl = this.containerEl.querySelector('video');
        if (!videoEl) {
            return false;
        }

        // Playing: never let a late poster land on top of playback.
        if (videoEl.paused === false) {
            return true;
        }

        // Metadata available: same gate Instant Preview has always used.
        return videoEl.readyState >= 1;
    }

    /**
     * Check if video is already loaded / poster paint should be aborted.
     * Unpainted poster DOM is removed immediately; an already-visible Instant Preview is left
     * for dismiss-on-play. Reveals the video when tearing down an unpainted poster.
     *
     * @private
     * @return {boolean} Whether poster create/paint should abort
     */
    checkVideoLoaded() {
        if (!this.shouldAbortPosterPaint()) {
            return false;
        }

        const painted = this.wrapperEl && this.preloadEl && !this.preloadEl.classList.contains(CLASS_INVISIBLE);

        if (painted) {
            // Instant Preview is already up — play/dismiss owns hiding it.
            return true;
        }

        // Never painted (or no DOM): drop it and make sure the video can show.
        if (this.wrapperEl) {
            this.cleanupPreload();
        }

        this.containerEl?.querySelector('video')?.classList.remove(CLASS_INVISIBLE);

        return true;
    }
}
export default VideoPreloader;
