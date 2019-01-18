import isFinite from 'lodash/isFinite';
import VirtualScroller from './VirtualScroller';

const CLASS_BOX_PREVIEW_THUMBNAIL = 'bp-thumbnail';
const CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE = 'bp-thumbnail-image';
const CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED = 'bp-thumbnail-image-loaded';
const CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED = 'bp-thumbnail-is-selected';
const CLASS_BOX_PREVIEW_THUMBNAIL_PAGE_NUMBER = 'bp-thumbnail-page-number';
const DEFAULT_THUMBNAILS_SIDEBAR_WIDTH = 150;
const THUMBNAIL_WIDTH_MAX = 210;
const THUMBNAIL_MARGIN = 15;

class ThumbnailsSidebar {
    /** @property {HTMLElement} - The anchor element for this ThumbnailsSidebar */
    anchorEl;

    /** @property {number} - The width : height ratio of the pages of the document */
    pageRatio;

    /** @property {number} - The currently viewed page */
    currentPage;

    /** @property {Array<HTMLElement>} - The list of currently rendered thumbnail elements */
    currentThumbnails;

    /** @property {PDfViewer} - The PDFJS viewer instance */
    pdfViewer;

    /** @property {number} - The percentage (0-1) to scale down from the full page to thumbnail size */
    scale;

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
        this.currentThumbnails = [];

        this.createPlaceholderThumbnail = this.createPlaceholderThumbnail.bind(this);
        this.requestThumbnailImage = this.requestThumbnailImage.bind(this);
        this.createThumbnailImage = this.createThumbnailImage.bind(this);
        this.generateThumbnailImages = this.generateThumbnailImages.bind(this);
        this.thumbnailClickHandler = this.thumbnailClickHandler.bind(this);
        this.getThumbnailDataURL = this.getThumbnailDataURL.bind(this);
        this.createImageEl = this.createImageEl.bind(this);

        this.anchorEl.addEventListener('click', this.thumbnailClickHandler);
    }

    /**
     * Method to handle the click events in the Thumbnails Sidebar
     *
     * @param {Event} evt - Mouse click event
     * @return {void}
     */
    thumbnailClickHandler(evt) {
        const { target } = evt;

        // Only care about clicks on the thumbnail element itself.
        // The image and page number have pointer-events: none so
        // any click should be the thumbnail element itself.
        if (target.classList.contains(CLASS_BOX_PREVIEW_THUMBNAIL)) {
            // Get the page number
            const { bpPageNum: pageNumStr } = target.dataset;
            const pageNum = Number.parseInt(pageNumStr, 10);

            if (this.onClickHandler) {
                this.onClickHandler(pageNum);
            }
        }

        evt.preventDefault();
        evt.stopImmediatePropagation();
    }

    /**
     * Destroys the thumbnails sidebar
     *
     * @return {void}
     */
    destroy() {
        if (this.virtualScroller) {
            this.virtualScroller.destroy();
            this.virtualScroller = null;
        }

        this.thumbnailImageCache = null;
        this.pdfViewer = null;
        this.currentThumbnails = [];
        this.currentPage = null;

        this.anchorEl.removeEventListener('click', this.thumbnailClickHandler);
    }

    /**
     * Initializes the Thumbnails Sidebar
     *
     * @param {Object} [options] - options for the Thumbnails Sidebar
     * @return {void}
     */
    init(options) {
        this.virtualScroller = new VirtualScroller(this.anchorEl);

        if (options) {
            // Click handler for when a thumbnail is clicked
            this.onClickHandler = options.onClick;

            // Specify the current page to be selected
            this.currentPage = options.currentPage || 1;
        }

        // Get the first page of the document, and use its dimensions
        // to set the thumbnails size of the thumbnails sidebar
        this.pdfViewer.pdfDocument.getPage(1).then((page) => {
            const { width, height } = page.getViewport(1);

            // If the dimensions of the page are invalid then don't proceed further
            if (!(isFinite(width) && width > 0 && isFinite(height) && height > 0)) {
                // eslint-disable-next-line
                console.error('Page dimensions invalid when initializing the thumbnails sidebar');
                return;
            }

            // Amount to scale down from fullsize to thumbnail size
            this.scale = DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / width;
            // Width : Height ratio of the page
            this.pageRatio = width / height;
            const scaledViewport = page.getViewport(this.scale);

            this.virtualScroller.init({
                totalItems: this.pdfViewer.pagesCount,
                itemHeight: scaledViewport.height,
                containerHeight: this.anchorEl.parentNode.clientHeight,
                margin: THUMBNAIL_MARGIN,
                renderItemFn: this.createPlaceholderThumbnail,
                onScrollEnd: this.generateThumbnailImages,
                onInit: this.generateThumbnailImages
            });
        });
    }

    /**
     * Generates the thumbnail images that are not yet created
     *
     * @param {Object} currentListInfo - VirtualScroller info object which contains startOffset, endOffset, and the thumbnail elements
     * @return {void}
     */
    generateThumbnailImages({ items, startOffset }) {
        if (!isFinite(startOffset) || startOffset < 0) {
            return;
        }

        this.currentThumbnails = items;

        items.forEach((thumbnailEl, index) => {
            if (thumbnailEl.classList.contains(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED)) {
                return;
            }

            this.requestThumbnailImage(index + startOffset, thumbnailEl);
        });
    }

    /**
     * Creates the placeholder thumbnail with page indication. This element will
     * not yet have the image of the page
     *
     * @param {number} itemIndex - The item index into the overall list (0 indexed)
     * @return {HTMLElement} - thumbnail button element
     */
    createPlaceholderThumbnail(itemIndex) {
        const thumbnailEl = document.createElement('button');
        const pageNum = itemIndex + 1;

        thumbnailEl.className = CLASS_BOX_PREVIEW_THUMBNAIL;
        thumbnailEl.setAttribute('type', 'button');
        thumbnailEl.dataset.bpPageNum = pageNum;
        thumbnailEl.appendChild(this.createPageNumber(pageNum));

        if (pageNum === this.currentPage) {
            thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
        }

        return thumbnailEl;
    }

    /**
     * Request the thumbnail image to be made
     *
     * @param {number} itemIndex - the item index in the overall list (0 indexed)
     * @param {HTMLElement} thumbnailEl - the thumbnail button element
     * @return {void}
     */
    requestThumbnailImage(itemIndex, thumbnailEl) {
        requestAnimationFrame(() => {
            this.createThumbnailImage(itemIndex).then((imageEl) => {
                thumbnailEl.appendChild(imageEl);
                thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED);
            });
        });
    }

    /**
     * Make a thumbnail image element
     *
     * @param {number} itemIndex - the item index for the overall list (0 indexed)
     * @return {Promise} - promise reolves with the image HTMLElement
     */
    createThumbnailImage(itemIndex) {
        // If this page has already been cached, use it
        if (this.thumbnailImageCache[itemIndex]) {
            return Promise.resolve(this.thumbnailImageCache[itemIndex]);
        }

        return this.getThumbnailDataURL(itemIndex + 1)
            .then(this.createImageEl)
            .then((imageEl) => {
                // Cache this image element for future use
                this.thumbnailImageCache[itemIndex] = imageEl;

                return imageEl;
            });
    }

    /**
     * Given a page number, generates the image data URL for the image of the page
     * @param {number} pageNum  - The page number of the document
     * @return {string} The data URL of the page image
     */
    getThumbnailDataURL(pageNum) {
        const canvas = document.createElement('canvas');

        return this.pdfViewer.pdfDocument
            .getPage(pageNum)
            .then((page) => {
                const { width, height } = page.getViewport(1);
                // Get the current page w:h ratio in case it differs from the first page
                const curPageRatio = width / height;

                let canvasWidth;
                // Handle the case where the current page's w:h ratio is less than the
                // `pageRatio` which means that this page is probably more portrait than
                // landscape
                if (curPageRatio < this.pageRatio) {
                    // Set the canvas height to that of the thumbnail max height
                    canvas.height = THUMBNAIL_WIDTH_MAX / this.pageRatio;
                    // Find the canvas width based on the curent page ratio
                    canvasWidth = canvas.height * curPageRatio;
                    canvas.width = canvasWidth;
                } else {
                    // In case the current page ratio is same as the first page
                    // or in case it's larger (which means that it's wider), keep
                    // the width at the max thumbnail width
                    canvasWidth = THUMBNAIL_WIDTH_MAX;
                    canvas.width = canvasWidth;
                    // Find the height based on the current page ratio
                    canvas.height = THUMBNAIL_WIDTH_MAX / curPageRatio;
                }

                // The amount for which to scale down the current page
                const scale = canvasWidth / width;
                return page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: page.getViewport(scale)
                });
            })
            .then(() => canvas.toDataURL());
    }

    /**
     * Creates the image element
     * @param {string} dataUrl - The image data URL for the thumbnail
     * @return {HTMLElement} - The image element
     */
    createImageEl(dataUrl) {
        const imageEl = document.createElement('img');
        imageEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE);
        imageEl.src = dataUrl;

        // Add the height and width to the image to be the same as the thumbnail
        // so that the css `object-fit` rule will work
        imageEl.style.width = `${DEFAULT_THUMBNAILS_SIDEBAR_WIDTH}px`;
        imageEl.style.height = `${DEFAULT_THUMBNAILS_SIDEBAR_WIDTH / this.pageRatio}px`;

        return imageEl;
    }

    /**
     * Creates a page number element
     *
     * @param {number} pageNumber - Page number of the document
     * @return {HTMLElement} - A div containing the page number
     */
    createPageNumber(pageNumber) {
        const pageNumberEl = document.createElement('div');
        pageNumberEl.className = CLASS_BOX_PREVIEW_THUMBNAIL_PAGE_NUMBER;
        pageNumberEl.textContent = `${pageNumber}`;
        return pageNumberEl;
    }

    /**
     * Sets the currently selected page
     *
     * @param {number} pageNumber - The page number to set to selected
     * @return {void}
     */
    setCurrentPage(pageNumber) {
        const parsedPageNumber = parseInt(pageNumber, 10);

        if (parsedPageNumber >= 1 && parsedPageNumber <= this.pdfViewer.pagesCount) {
            this.currentPage = parsedPageNumber;
            this.applyCurrentPageSelection();
        }
    }

    /**
     * Based on current page selection, checks the currently
     * visible thumbnails to toggle the appropriate class
     *
     * @return {void}
     */
    applyCurrentPageSelection() {
        this.currentThumbnails.forEach((thumbnailEl) => {
            const parsedPageNum = Number.parseInt(thumbnailEl.dataset.bpPageNum, 10);
            if (parsedPageNum === this.currentPage) {
                thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
            } else {
                thumbnailEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
            }
        });
    }
}

export default ThumbnailsSidebar;
