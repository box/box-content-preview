import isFinite from 'lodash/isFinite';
import noop from 'lodash/noop';
import BoundedCache from './BoundedCache';

export const CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE = 'bp-thumbnail-image';
export const THUMBNAIL_TOTAL_WIDTH = 150; // 190px sidebar width - 40px margins
export const THUMBNAIL_IMAGE_WIDTH = THUMBNAIL_TOTAL_WIDTH * 2; // Multiplied by a scaling factor so that we render the image at a higher resolution

function createRejectedTask(message) {
    return { cancel: noop, promise: Promise.reject(new Error(message)) };
}

class Thumbnail {
    /** @property {PDfViewer} - The PDFJS viewer instance */
    pdfViewer;

    /** @property {Object} - Cache for the thumbnail image elements */
    thumbnailImageCache;

    /** @property {Set} - Active PDF.js render tasks */
    renderTasks;

    preloader;

    /**
     * [constructor]
     *
     * @param {PDFViewer} pdfViewer - the PDFJS viewer
     */
    constructor(pdfViewer, preloader) {
        this.preloader = preloader;
        this.createImageEl = this.createImageEl.bind(this);
        this.createThumbnailImage = this.createThumbnailImage.bind(this);
        this.getThumbnailDataURL = this.getThumbnailDataURL.bind(this);
        this.renderPageImage = this.renderPageImage.bind(this);
        this.pdfViewer = pdfViewer;
        this.thumbnailImageCache = new BoundedCache();
        this.renderTasks = new Set();
    }

    /**
     * Destroys the thumbnails sidebar
     *
     * @return {void}
     */
    destroy() {
        if (this.renderTasks) {
            this.renderTasks.forEach(task => task.cancel());
            this.renderTasks.clear();
            this.renderTasks = null;
        }
        if (this.thumbnailImageCache) {
            this.thumbnailImageCache.destroy();
            this.thumbnailImageCache = null;
        }
        this.pdfViewer = null;
        this.preloader = null;
    }

    /**
     * Initializes the Thumbnails Sidebar
     *
     * @return {Promise}
     */
    init() {
        // Get the first page of the document, and use its dimensions
        // to set the thumbnails size of the thumbnails sidebar

        if (this.preloader?.imageDimensions) {
            const { width, height } = this.preloader.imageDimensions;
            this.scale = THUMBNAIL_TOTAL_WIDTH / width;
            this.pageRatio = width / height;
            this.thumbnailHeight = Math.ceil(height * this.scale);
            return Promise.resolve(this.thumbnailHeight);
        }

        const pdfDocument = this.pdfViewer?.pdfDocument;
        if (!pdfDocument) {
            return Promise.resolve(null);
        }

        return pdfDocument.getPage(1).then(page => {
            if (!this.thumbnailImageCache) {
                return null;
            }

            const rotation = ((this.pdfViewer.pagesRotation || 0) + page.rotate) % 360;
            const viewport = page.getViewport({ scale: 1, rotation });
            if (!viewport) {
                return Promise.resolve(null);
            }
            const { width, height } = viewport;

            // If the dimensions of the page are invalid then don't proceed further
            if (!(isFinite(width) && width > 0 && isFinite(height) && height > 0)) {
                // eslint-disable-next-line
                console.error('Page dimensions invalid when initializing the thumbnails sidebar');
                return Promise.resolve(null);
            }

            // Amount to scale down from full-size to thumbnail size
            this.scale = THUMBNAIL_TOTAL_WIDTH / width;
            // Width : Height ratio of the page
            this.pageRatio = width / height;
            const scaledViewport = page.getViewport({ scale: this.scale, rotation });
            this.thumbnailHeight = Math.ceil(scaledViewport.height);
            return Promise.resolve(this.thumbnailHeight);
        });
    }

    /**
     * Creates the image element
     * @param {string} dataUrl - The image data URL for the thumbnail
     * @return {HTMLElement} - The image element
     */
    createImageEl(dataUrl, thumbOptions) {
        const imageEl =
            thumbOptions && thumbOptions.createImgTag ? document.createElement('img') : document.createElement('div');

        if (thumbOptions && thumbOptions.createImgTag) {
            imageEl.src = `${dataUrl}`;
            return imageEl;
        }
        imageEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE);
        imageEl.style.backgroundImage = `url('${dataUrl}')`;

        // Add the height and width to the image to be the same as the thumbnail
        // so that the css `background-image` rules will work
        imageEl.style.width = `${THUMBNAIL_TOTAL_WIDTH}px`;
        imageEl.style.height = `${this.thumbnailHeight}px`;

        return imageEl;
    }

    /**
     * Make a thumbnail image element
     *
     * @param {number} itemIndex - the item index for the overall list (0 indexed)
     * @return {Promise} - promise reolves with the image HTMLElement or null if generation is in progress
     */
    createThumbnailImage(itemIndex, thumbOptions) {
        if (!this.thumbnailImageCache) {
            return Promise.resolve(null);
        }

        const cacheEntry = this.getImageFromCache(itemIndex);
        // If this thumbnail has already been cached, use it
        if (cacheEntry && cacheEntry.image) {
            return Promise.resolve(cacheEntry.image);
        }

        // If this thumbnail has already been requested, resolve with null
        if (cacheEntry && cacheEntry.inProgress) {
            return Promise.resolve(null);
        }

        // Update the cache entry to be in progress
        this.thumbnailImageCache.set(itemIndex, { ...cacheEntry, inProgress: true });
        return this.getThumbnailDataURL(itemIndex + 1, thumbOptions)
            .then(dataUrl => {
                if (!this.thumbnailImageCache) {
                    return null;
                }
                if (!dataUrl) {
                    this.thumbnailImageCache.set(itemIndex, { ...cacheEntry, inProgress: false });
                    return null;
                }

                const imageEl = this.createImageEl(dataUrl, thumbOptions);
                // Cache this image element for future use
                this.thumbnailImageCache.set(itemIndex, { inProgress: false, image: imageEl });

                return imageEl;
            })
            .catch(() => {
                if (!this.thumbnailImageCache) {
                    return null;
                }

                this.thumbnailImageCache.set(itemIndex, { ...this.getImageFromCache(itemIndex), inProgress: false });
                throw new Error('Thumbnail generation failed');
            });
    }

    /**
     * Make a thumbnail image element
     *
     * @param {number} itemIndex - the item index for the overall list (0 indexed)
     * @return {Promise} - promise reolves with the image HTMLElement or null if generation is in progress
     */
    getImageFromCache(itemIndex) {
        return this.thumbnailImageCache?.get(itemIndex) || null;
    }

    /**
     * Renders a page image without caching it.
     * @param {number} pageNum - The page number of the document (1 indexed)
     * @param {Object} thumbOptions - Thumbnail render options
     * @return {Object} A cancellable render task
     */
    renderPageImage(pageNum, thumbOptions) {
        const pdfDocument = this.pdfViewer?.pdfDocument;
        if (!pdfDocument) {
            return createRejectedTask('PDF document not ready');
        }

        const thumbnailImageWidth =
            thumbOptions && thumbOptions.thumbMaxWidth ? thumbOptions.thumbMaxWidth : THUMBNAIL_IMAGE_WIDTH;
        if (!isFinite(thumbnailImageWidth) || thumbnailImageWidth <= 0) {
            return createRejectedTask('Invalid thumbnail render dimensions');
        }

        const canvas = document.createElement('canvas');
        let isCancelled = false;
        let pdfRenderTask = null;
        let pdfPage = null;
        const task = {
            cancel: () => {
                if (isCancelled) {
                    return;
                }
                isCancelled = true;
                pdfRenderTask?.cancel();
            },
            promise: null,
        };

        task.promise = pdfDocument
            .getPage(pageNum)
            .then(page => {
                if (isCancelled || !this.thumbnailImageCache) {
                    return null;
                }
                pdfPage = page;

                const rotation = ((this.pdfViewer.pagesRotation || 0) + page.rotate) % 360;
                const viewport = page.getViewport({ scale: 1, rotation });
                if (
                    !viewport ||
                    !isFinite(viewport.width) ||
                    viewport.width <= 0 ||
                    !isFinite(viewport.height) ||
                    viewport.height <= 0
                ) {
                    return Promise.reject(new Error('Invalid page viewport'));
                }
                const { width, height } = viewport;
                const currentPageRatio = width / height;

                // More-portrait pages are constrained by the first page's height budget.
                if (currentPageRatio < this.pageRatio) {
                    canvas.height = Math.ceil(thumbnailImageWidth / this.pageRatio);
                    canvas.width = canvas.height * currentPageRatio;
                } else {
                    canvas.width = thumbnailImageWidth;
                    canvas.height = Math.ceil(thumbnailImageWidth / currentPageRatio);
                }
                const { width: canvasWidth } = canvas;
                const scale = canvasWidth / width;
                pdfRenderTask = page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: page.getViewport({ scale, rotation }),
                });

                return pdfRenderTask.promise.then(() => {
                    if (isCancelled || !this.thumbnailImageCache) {
                        return null;
                    }

                    return {
                        dataUrl: canvas.toDataURL(),
                        height: canvas.height,
                        width: canvas.width,
                    };
                });
            })
            .catch(error => {
                if (isCancelled) {
                    return null;
                }
                throw error;
            })
            .finally(() => {
                canvas.width = 0;
                canvas.height = 0;
                this.renderTasks?.delete(task);
                this.releasePageResources(pdfPage);
            });

        this.renderTasks.add(task);
        return task;
    }

    /**
     * Notifies PDF.js that a thumbnail render has settled, mirroring PDF.js's own
     * PDFThumbnailView: the PDFViewer's thumbnailrendered handler calls pdfPage.cleanup()
     * for pages its buffer no longer holds, releasing their decoded resources. Buffered
     * pages keep their resources, and cleanup of pages rendering elsewhere is deferred via
     * PDF.js's pending-cleanup flag. No-ops for viewers without an event bus.
     *
     * This matters for content whose decoded data lives in the JS heap (e.g. image masks)
     * and for viewers without OffscreenCanvas support; bitmap-backed images in Chrome are
     * already released by PDF.js for thumbnail-only pages (see PREVIEW-1548 investigation).
     *
     * @param {PDFPageProxy|null} pdfPage - The PDF.js page proxy, or null if the page was never loaded
     * @return {void}
     */
    releasePageResources(pdfPage) {
        if (!pdfPage) {
            return;
        }

        this.pdfViewer?.eventBus?.dispatch('thumbnailrendered', {
            source: this,
            pageNumber: pdfPage.pageNumber,
            pdfPage,
        });
    }

    /**
     * Given a page number, generates the image data URL for the image of the page
     * @param {number} pageNum  - The page number of the document
     * @return {string} The data URL of the page image
     */
    getThumbnailDataURL(pageNum, thumbOptions) {
        if (this.preloader?.preloadedImages?.[pageNum]) {
            return Promise.resolve(this.preloader.preloadedImages[pageNum]);
        }

        return this.renderPageImage(pageNum, thumbOptions).promise.then(result => result?.dataUrl || null);
    }
}

export default Thumbnail;
