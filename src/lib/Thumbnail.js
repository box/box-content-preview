import isFinite from 'lodash/isFinite';
import BoundedCache from './BoundedCache';

export const CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE = 'bp-thumbnail-image';
export const THUMBNAIL_TOTAL_WIDTH = 150; // 190px sidebar width - 40px margins
export const THUMBNAIL_IMAGE_WIDTH = THUMBNAIL_TOTAL_WIDTH * 2; // Multiplied by a scaling factor so that we render the image at a higher resolution

class Thumbnail {
    /** @property {PDfViewer} - The PDFJS viewer instance */
    pdfViewer;

    /** @property {Object} - Cache for the thumbnail image elements */
    thumbnailImageCache;

    /**
     * [constructor]
     *
     * @param {PDFViewer} pdfViewer - the PDFJS viewer
     */
    constructor(pdfViewer) {
        this.createImageEl = this.createImageEl.bind(this);
        this.createThumbnailImage = this.createThumbnailImage.bind(this);
        this.getThumbnailDataURL = this.getThumbnailDataURL.bind(this);
        this.pdfViewer = pdfViewer;
        this.thumbnailImageCache = new BoundedCache();
    }

    /**
     * Destroys the thumbnails sidebar
     *
     * @return {void}
     */
    destroy() {
        if (this.thumbnailImageCache) {
            this.thumbnailImageCache.destroy();
            this.thumbnailImageCache = null;
        }
        this.pdfViewer = null;
    }

    /**
     * Initializes the Thumbnails Sidebar
     *
     * @return {Promise}
     */
    init() {
        // Get the first page of the document, and use its dimensions
        // to set the thumbnails size of the thumbnails sidebar
        return this.pdfViewer.pdfDocument.getPage(1).then(page => {
            const { width, height } = page.getViewport({ scale: 1 });

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
            const scaledViewport = page.getViewport({ scale: this.scale });
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
                return this.createImageEl(dataUrl, thumbOptions);
            })
            .then(imageEl => {
                // Cache this image element for future use
                this.thumbnailImageCache.set(itemIndex, { inProgress: false, image: imageEl });

                return imageEl;
            });
    }

    /**
     * Make a thumbnail image element
     *
     * @param {number} itemIndex - the item index for the overall list (0 indexed)
     * @return {Promise} - promise reolves with the image HTMLElement or null if generation is in progress
     */
    getImageFromCache(itemIndex) {
        return this.thumbnailImageCache.get(itemIndex);
    }

    /**
     * Given a page number, generates the image data URL for the image of the page
     * @param {number} pageNum  - The page number of the document
     * @return {string} The data URL of the page image
     */
    getThumbnailDataURL(pageNum, thumbOptions) {
        const canvas = document.createElement('canvas');
        const thumbnailImageWidth =
            thumbOptions && thumbOptions.thumbMaxWidth ? thumbOptions.thumbMaxWidth : THUMBNAIL_IMAGE_WIDTH;

        return this.pdfViewer.pdfDocument
            .getPage(pageNum)
            .then(page => {
                const { width, height } = page.getViewport({ scale: 1 });
                // Get the current page w:h ratio in case it differs from the first page
                const curPageRatio = width / height;

                // Handle the case where the current page's w:h ratio is less than the
                // `pageRatio` which means that this page is probably more portrait than
                // landscape
                if (curPageRatio < this.pageRatio) {
                    // Set the canvas height to that of the thumbnail max height
                    canvas.height = Math.ceil(thumbnailImageWidth / this.pageRatio);
                    // Find the canvas width based on the current page ratio
                    canvas.width = canvas.height * curPageRatio;
                } else {
                    // In case the current page ratio is same as the first page
                    // or in case it's larger (which means that it's wider), keep
                    // the width at the max thumbnail width
                    canvas.width = thumbnailImageWidth;
                    // Find the height based on the current page ratio
                    canvas.height = Math.ceil(thumbnailImageWidth / curPageRatio);
                }
                // The amount for which to scale down the current page
                const { width: canvasWidth } = canvas;
                const scale = canvasWidth / width;
                return page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: page.getViewport({ scale }),
                }).promise;
            })
            .then(() => canvas.toDataURL());
    }
}

export default Thumbnail;
