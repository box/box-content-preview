import VirtualScroller from './VirtualScroller';

const DEFAULT_THUMBNAILS_SIDEBAR_WIDTH = 150;
const THUMBNAIL_WIDTH_MAX = 210;
const THUMBNAIL_MARGIN = 15;

class ThumbnailsSidebar {
    /** @property {HTMLElement} - The anchor element for this ThumbnailsSidebar */
    anchorEl;

    /** @property {PDfViewer} - The PDFJS viewer instance */
    pdfViewer;

    /** @property {Object} - Cache for the thumbnail image elements */
    thumbnailImageCache;

    /**
     * [constructor]
     *
     * @param {HTMLElement} element - the HTMLElement that will anchor the thumbnail sidebar
     * @param {PDFViewer} pdfViewer - the PDFJS viewer
     */
    constructor(element, pdfViewer) {
        this.anchorEl = element;
        this.pdfViewer = pdfViewer;
        this.thumbnailImageCache = {};

        this.renderBasicThumbnail = this.renderBasicThumbnail.bind(this);
        this.requestThumbnailImage = this.requestThumbnailImage.bind(this);
        this.makeThumbnailImage = this.makeThumbnailImage.bind(this);
        this.renderThumbnailImages = this.renderThumbnailImages.bind(this);
    }

    /**
     * Destroys the thumbnails sidebar
     *
     * @return {void}
     */
    destroy() {
        if (this.virtualScroller) {
            this.virtualScroller.destroy();
        }

        this.thumbnailImageCache = null;
        this.virtualScroller = null;
        this.pdfViewer = null;
    }

    /**
     * Initializes the Thumbnails Sidebar
     *
     * @return {void}
     */
    init() {
        this.virtualScroller = new VirtualScroller(this.anchorEl);

        // Get the first page of the document, and use its dimensions
        // to set the thumbnails size of the thumbnails sidebar
        this.pdfViewer.pdfDocument.getPage(1).then((page) => {
            const desiredWidth = DEFAULT_THUMBNAILS_SIDEBAR_WIDTH;
            const viewport = page.getViewport(1);
            this.scale = desiredWidth / viewport.width;
            this.pageRatio = viewport.width / viewport.height;
            const scaledViewport = page.getViewport(this.scale);

            this.virtualScroller.init({
                totalItems: this.pdfViewer.pagesCount,
                itemHeight: scaledViewport.height,
                containerHeight: this.anchorEl.parentNode.clientHeight,
                margin: THUMBNAIL_MARGIN,
                renderItemFn: (itemIndex) => this.renderBasicThumbnail(itemIndex),
                onScrollEnd: this.renderThumbnailImages,
                onInit: this.renderThumbnailImages
            });
        });
    }

    /**
     * Renders the thumbnail images
     *
     * @param {Object} data - VirtualScroller data object which contains startOffset, endOffset, and the thumbnail elements
     * @return {void}
     */
    renderThumbnailImages(data) {
        data.items.forEach((thumbnail, index) => {
            if (thumbnail.classList.contains('bp-thumbnail-image-loaded')) {
                return;
            }

            this.requestThumbnailImage(index + data.startOffset, thumbnail);
        });
    }

    /**
     * Renders the basic thumbnail with page indication
     *
     * @param {number} itemIndex - The item index into the overall list (0 indexed)
     * @return {HTMLElement} - thumbnail button element
     */
    renderBasicThumbnail(itemIndex) {
        const thumbnail = document.createElement('button');
        thumbnail.className = 'bp-thumbnail';
        thumbnail.appendChild(this.createPageNumber(itemIndex + 1));
        return thumbnail;
    }

    /**
     * Request the thumbnail image to be made
     *
     * @param {number} itemIndex - the item index in the overall list (0 indexed)
     * @param {HTMLElement} thumbnail - the thumbnail button element
     * @return {void}
     */
    requestThumbnailImage(itemIndex, thumbnail) {
        requestAnimationFrame(() => {
            if (!this.anchorEl.contains(thumbnail)) {
                return;
            }

            this.makeThumbnailImage(itemIndex).then((imageEl) => {
                this.thumbnailImageCache[itemIndex] = imageEl;
                thumbnail.appendChild(imageEl);
                thumbnail.classList.add('bp-thumbnail-image-loaded');
            });
        });
    }

    /**
     * Make a thumbnail image
     *
     * @param {number} itemIndex - the item index for the overall list (0 indexed)
     * @return {Promise} - promise reolves with the image HTMLElement
     */
    makeThumbnailImage(itemIndex) {
        if (this.thumbnailImageCache[itemIndex]) {
            return Promise.resolve(this.thumbnailImageCache[itemIndex]);
        }

        const canvas = document.createElement('canvas');

        return this.pdfViewer.pdfDocument
            .getPage(itemIndex + 1)
            .then((page) => {
                const viewport = page.getViewport(1);
                canvas.width = THUMBNAIL_WIDTH_MAX;
                canvas.height = THUMBNAIL_WIDTH_MAX / this.pageRatio;
                const scale = THUMBNAIL_WIDTH_MAX / viewport.width;
                return page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: page.getViewport(scale)
                });
            })
            .then(() => {
                const image = document.createElement('img');
                image.src = canvas.toDataURL();
                image.style.maxWidth = '100%';
                return image;
            });
    }

    /**
     * Creates a page number element
     *
     * @param {number} pageNumber - Page number of the document
     * @return {HTMLElement} - A div containing the page number
     */
    createPageNumber(pageNumber) {
        const pageNumberEl = document.createElement('div');
        pageNumberEl.className = 'bp-thumbnail-page-number';
        pageNumberEl.textContent = `${pageNumber}`;
        return pageNumberEl;
    }
}

export default ThumbnailsSidebar;
