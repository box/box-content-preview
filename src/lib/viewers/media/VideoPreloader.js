import EventEmitter from 'events';
import Api from '../../api';
import {
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_BOX_PREVIEW_PRELOAD_CONTENT,
    CLASS_BOX_PREVIEW_PRELOAD_PLACEHOLDER,
    CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_VIDEO,
    CLASS_INVISIBLE,
    CLASS_IS_TRANSPARENT,
    CLASS_IS_VISIBLE,
} from '../../constants';
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
     * @return {Promise} Promise to show preload
     */
    showPreload(preloadUrlWithAuth, containerEl) {
        this.containerEl = containerEl;

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

        this.unbindDOMListeners();
        this.wrapperEl.classList.add(CLASS_IS_TRANSPARENT);

        // Cleanup preload DOM after fade out
        this.wrapperEl.addEventListener('transitionend', this.cleanupPreload);

        // Cleanup preload DOM immediately if user interacts after the video is ready
        this.wrapperEl.addEventListener('click', this.cleanupPreload);
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

        // Show preload element after image is loaded
        this.preloadEl.classList.remove(CLASS_INVISIBLE);

        // Make media wrapper visible so thumbnail can be seen
        // The media wrapper (bp-media) is hidden by default and only shown when video is ready
        // We need to show it early so the thumbnail is visible
        // Note: We don't set container dimensions - they will be set by resize() when video is ready
        // The preload wrapper is absolutely positioned (top:0, right:0, bottom:0, left:0) and will
        // fill the container regardless of its size. The container will be properly sized when
        // calculateVideoDimensions() and resize() are called in loadeddataHandler().
        if (this.containerEl && this.containerEl.parentNode) {
            const mediaWrapper = this.containerEl.parentNode;
            if (mediaWrapper && mediaWrapper.classList && mediaWrapper.classList.contains('bp-media')) {
                mediaWrapper.classList.add(CLASS_IS_VISIBLE);
            }
        }

        // Emit message that preload has occurred
        this.emit('preload');
    };

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
