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

        // Clear inline styles we set on the container to restore natural flexbox sizing
        // This prevents the video controls from being off-screen after video loads
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
        if (!this.preloadEl || !this.imageEl) {
            return;
        }

        this.sizeContainerToViewport(this.preloadOptions?.viewport);

        this.preloadEl.classList.remove(CLASS_INVISIBLE);

        if (this.containerEl && this.containerEl.parentNode) {
            const mediaWrapper = this.containerEl.parentNode;
            if (mediaWrapper && mediaWrapper.classList && mediaWrapper.classList.contains('bp-media')) {
                mediaWrapper.classList.add(CLASS_IS_VISIBLE);
            }
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
     * Sizes the container based on viewport dimensions and image aspect ratio to match video player sizing.
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

        // Apply minimum width to match video sizing logic
        // This ensures controls don't overflow
        const containerWidth = Math.max(MIN_VIDEO_WIDTH_PX, viewport.width);

        // Calculate container height based on image aspect ratio
        // Use natural dimensions if available (image has loaded), otherwise use current dimensions
        const imageWidth = this.imageEl.naturalWidth || this.imageEl.width || 1;
        const imageHeight = this.imageEl.naturalHeight || this.imageEl.height || 1;
        const aspectRatio = imageWidth / imageHeight;

        // Calculate height based on width and aspect ratio
        let containerHeight = containerWidth / aspectRatio;
        let finalWidth = containerWidth;

        // Ensure height doesn't exceed viewport height
        if (containerHeight > viewport.height) {
            containerHeight = viewport.height;
            // If height is constrained, recalculate width to maintain aspect ratio
            finalWidth = containerHeight * aspectRatio;
            // Ensure we still meet minimum width requirement
            if (finalWidth < MIN_VIDEO_WIDTH_PX) {
                finalWidth = MIN_VIDEO_WIDTH_PX;
                containerHeight = finalWidth / aspectRatio;
            }
        }

        // Set container dimensions
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
     * Check if video is already loaded - if so, hide the preload.
     *
     * @private
     * @return {boolean} Whether video is already loaded
     */
    checkVideoLoaded() {
        // If video element exists and has loaded metadata, hide the preload
        if (this.containerEl) {
            const videoEl = this.containerEl.querySelector('video');
            if (videoEl && videoEl.readyState >= 1) {
                this.hidePreload();
                return true;
            }
        }

        return false;
    }
}

export default VideoPreloader;
