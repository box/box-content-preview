import isFinite from 'lodash/isFinite';
import VirtualScroller from './VirtualScroller';
import BoundedCache from './BoundedCache';
import { decodeKeydown } from './util';

const CLASS_BOX_PREVIEW_THUMBNAIL = 'bp-thumbnail';
const CLASS_BOX_PREVIEW_THUMBNAIL_NAV = 'bp-thumbnail-nav';
const CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE = 'bp-thumbnail-image';
const CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED = 'bp-thumbnail-image-loaded';
const CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED = 'bp-thumbnail-is-selected';
const CLASS_BOX_PREVIEW_THUMBNAIL_PAGE_NUMBER = 'bp-thumbnail-page-number';
export const DEFAULT_THUMBNAILS_SIDEBAR_WIDTH = 154; // 225px sidebar width - 25px margin right, - 40px for page number - 6px for border
const THUMBNAIL_IMAGE_WIDTH = DEFAULT_THUMBNAILS_SIDEBAR_WIDTH * 2; // Multiplied by a scaling factor so that we render the image at a higher resolution
const THUMBNAIL_MARGIN = 15;
const BORDER_WIDTH = 6;

class ThumbnailsSidebar {
    /** @property {HTMLElement} - The anchor element for this ThumbnailsSidebar */
    anchorEl;

    /** @property {number} - The width : height ratio of the pages of the document */
    pageRatio;

    /** @property {number} - The currently viewed page */
    currentPage;

    /** @property {Array<HTMLElement>} - The list of currently rendered thumbnail elements */
    currentThumbnails;

    /** @property {Boolean} - Whether the sidebar is open or not */
    isOpen;

    /** @property {PDfViewer} - The PDFJS viewer instance */
    pdfViewer;

    /** @property {number} - The percentage (0-1) to scale down from the full page to thumbnail size */
    scale;

    /** @property {Object} - Cache for the thumbnail image elements */
    thumbnailImageCache;

    /** @property {Array<number>} - The ID values returned by the call to window.requestAnimationFrame() */
    animationFrameRequestIds;

    /**
     * [constructor]
     *
     * @param {HTMLElement} element - the HTMLElement that will anchor the thumbnail sidebar
     * @param {PDFViewer} pdfViewer - the PDFJS viewer
     */
    constructor(element, pdfViewer) {
        this.animationFrameRequestIds = [];
        this.anchorEl = element;
        this.currentThumbnails = [];
        this.pdfViewer = pdfViewer;
        this.thumbnailImageCache = new BoundedCache();
        this.isOpen = false;

        this.createImageEl = this.createImageEl.bind(this);
        this.createPlaceholderThumbnail = this.createPlaceholderThumbnail.bind(this);
        this.createThumbnailImage = this.createThumbnailImage.bind(this);
        this.generateThumbnailImages = this.generateThumbnailImages.bind(this);
        this.getThumbnailDataURL = this.getThumbnailDataURL.bind(this);
        this.renderNextThumbnailImage = this.renderNextThumbnailImage.bind(this);
        this.requestThumbnailImage = this.requestThumbnailImage.bind(this);
        this.thumbnailClickHandler = this.thumbnailClickHandler.bind(this);
        this.onKeydown = this.onKeydown.bind(this);

        this.anchorEl.addEventListener('click', this.thumbnailClickHandler);
        this.anchorEl.addEventListener('keydown', this.onKeydown);
    }

    /**
     * Method to handle the click events in the Thumbnails Sidebar
     *
     * @param {Event} event - Mouse click event
     * @return {void}
     */
    thumbnailClickHandler(event) {
        const { target } = event;

        // Only care about clicks on the thumbnail element itself.
        // The image and page number have pointer-events: none so
        // any click should be the thumbnail element itself.
        if (target.classList.contains(CLASS_BOX_PREVIEW_THUMBNAIL_NAV)) {
            const thumbnailEl = target.parentNode;
            // Get the page number
            const { bpPageNum: pageNumStr } = thumbnailEl.dataset;
            const pageNum = parseInt(pageNumStr, 10);

            if (this.onThumbnailSelect) {
                this.onThumbnailSelect(pageNum);
            }
        }

        // IE 11 will focus a div when it's parent has a tabindex, so we focus the anchorEl to avoid
        // a loss of focus when elements are deleted by the Virtual Scroller.
        this.anchorEl.focus();

        event.preventDefault();
        event.stopImmediatePropagation();
    }

    /**
     * Method to handle keyboard events in the Thumbnails Sidebar
     *
     * @param {Object} event - Key event
     * @return {void}
     */
    onKeydown(event) {
        const key = decodeKeydown(event);
        let consumed = false;
        let nextSelectedPage = this.currentPage;

        if (key === 'ArrowUp') {
            nextSelectedPage -= 1;
            consumed = true;
        } else if (key === 'ArrowDown') {
            nextSelectedPage += 1;
            consumed = true;
        }

        if (consumed) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }

        if (this.onThumbnailSelect) {
            this.onThumbnailSelect(nextSelectedPage);
        }
    }

    /**
     * Destroys the thumbnails sidebar
     *
     * @return {void}
     */
    destroy() {
        if (this.animationFrameRequestIds.length > 0) {
            this.animationFrameRequestIds.forEach(id => cancelAnimationFrame(id));
        }

        if (this.virtualScroller) {
            this.virtualScroller.destroy();
            this.virtualScroller = null;
        }

        if (this.thumbnailImageCache) {
            this.thumbnailImageCache.destroy();
            this.thumbnailImageCache = null;
        }

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
            this.onThumbnailSelect = options.onSelect;

            // Specify the current page to be selected
            this.currentPage = options.currentPage || 1;

            // Specify whether the sidebar is open to start
            this.isOpen = !!options.isOpen;
        }

        // Get the first page of the document, and use its dimensions
        // to set the thumbnails size of the thumbnails sidebar
        this.pdfViewer.pdfDocument.getPage(1).then(page => {
            const { width, height } = page.getViewport({ scale: 1 });

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
            const scaledViewport = page.getViewport({ scale: this.scale });
            this.thumbnailHeight = Math.ceil(scaledViewport.height);

            this.virtualScroller.init({
                initialRowIndex: this.currentPage - 1,
                totalItems: this.pdfViewer.pagesCount,
                itemHeight: this.thumbnailHeight + BORDER_WIDTH,
                containerHeight: this.getContainerHeight(),
                margin: THUMBNAIL_MARGIN,
                renderItemFn: this.createPlaceholderThumbnail,
                onScrollEnd: this.generateThumbnailImages,
                onInit: this.generateThumbnailImages,
            });
        });
    }

    /**
     * Generates the thumbnail images that are not yet created
     *
     * @param {Object} currentListInfo - VirtualScroller info object which contains startOffset, endOffset, and the thumbnail elements
     * @return {void}
     */
    generateThumbnailImages({ items }) {
        this.currentThumbnails = items;

        // Serially renders the thumbnails one by one as needed
        this.renderNextThumbnailImage();
    }

    /**
     * Requests the next thumbnail image that needs rendering
     *
     * @return {void}
     */
    renderNextThumbnailImage() {
        // Iterates over the current thumbnails and requests rendering of the first
        // thumbnail it encounters that does not have an image loaded, starting with
        // the visible thumbnails first.
        const visibleThumbnails = this.virtualScroller.getVisibleItems();
        const nextThumbnailEl = visibleThumbnails
            .concat(this.currentThumbnails)
            .find(thumbnailEl => !thumbnailEl.classList.contains(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED));

        if (nextThumbnailEl) {
            const parsedPageNum = parseInt(nextThumbnailEl.dataset.bpPageNum, 10);
            this.requestThumbnailImage(parsedPageNum - 1, nextThumbnailEl);
        }
    }

    /**
     * Creates the placeholder thumbnail with page indication. This element will
     * not yet have the image of the page
     *
     * @param {number} itemIndex - The item index into the overall list (0 indexed)
     * @return {HTMLElement} - thumbnail element
     */
    createPlaceholderThumbnail(itemIndex) {
        const thumbnailEl = document.createElement('div');
        const pageNum = itemIndex + 1;

        thumbnailEl.className = CLASS_BOX_PREVIEW_THUMBNAIL;
        thumbnailEl.dataset.bpPageNum = pageNum;
        thumbnailEl.appendChild(this.createPageNumber(pageNum));

        const thumbnailNav = this.createThumbnailNav();
        thumbnailEl.appendChild(thumbnailNav);

        if (pageNum === this.currentPage) {
            thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
        }

        // If image is already in cache, then use it instead of waiting for
        // the second render image pass
        const cachedImage = this.thumbnailImageCache.get(itemIndex);
        if (cachedImage && !cachedImage.inProgress) {
            thumbnailNav.appendChild(cachedImage.image);
            thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED);
        }

        // Add placeholder items to our list of current thumbnails so they can be selected
        this.currentThumbnails.push(thumbnailEl);

        return thumbnailEl;
    }

    /**
     * Creates the thumbnail navigation element
     * @return {HTMLElement} - thumbnail anchor element
     */
    createThumbnailNav() {
        const thumbnailNav = document.createElement('div');
        thumbnailNav.className = CLASS_BOX_PREVIEW_THUMBNAIL_NAV;
        thumbnailNav.setAttribute('role', 'button');
        return thumbnailNav;
    }

    /**
     * Request the thumbnail image to be made
     *
     * @param {number} itemIndex - the item index in the overall list (0 indexed)
     * @param {HTMLElement} thumbnailEl - the thumbnail element
     * @return {void}
     */
    requestThumbnailImage(itemIndex, thumbnailEl) {
        const requestId = requestAnimationFrame(() => {
            this.animationFrameRequestIds = this.animationFrameRequestIds.filter(id => id !== requestId);
            this.createThumbnailImage(itemIndex).then(imageEl => {
                // Promise will resolve with null if create image request was already in progress
                if (imageEl) {
                    // Appends to the thumbnail nav element
                    thumbnailEl.lastChild.appendChild(imageEl);
                    thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED);
                }

                // After generating the thumbnail image, render the next one
                this.renderNextThumbnailImage();
            });
        });

        this.animationFrameRequestIds.push(requestId);
    }

    /**
     * Make a thumbnail image element
     *
     * @param {number} itemIndex - the item index for the overall list (0 indexed)
     * @return {Promise} - promise reolves with the image HTMLElement or null if generation is in progress
     */
    createThumbnailImage(itemIndex) {
        const cacheEntry = this.thumbnailImageCache.get(itemIndex);

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

        return this.getThumbnailDataURL(itemIndex + 1)
            .then(this.createImageEl)
            .then(imageEl => {
                // Cache this image element for future use
                this.thumbnailImageCache.set(itemIndex, { inProgress: false, image: imageEl });

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
            .then(page => {
                const { width, height } = page.getViewport({ scale: 1 });
                // Get the current page w:h ratio in case it differs from the first page
                const curPageRatio = width / height;

                // Handle the case where the current page's w:h ratio is less than the
                // `pageRatio` which means that this page is probably more portrait than
                // landscape
                if (curPageRatio < this.pageRatio) {
                    // Set the canvas height to that of the thumbnail max height
                    canvas.height = Math.ceil(THUMBNAIL_IMAGE_WIDTH / this.pageRatio);
                    // Find the canvas width based on the curent page ratio
                    canvas.width = canvas.height * curPageRatio;
                } else {
                    // In case the current page ratio is same as the first page
                    // or in case it's larger (which means that it's wider), keep
                    // the width at the max thumbnail width
                    canvas.width = THUMBNAIL_IMAGE_WIDTH;
                    // Find the height based on the current page ratio
                    canvas.height = Math.ceil(THUMBNAIL_IMAGE_WIDTH / curPageRatio);
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

    /**
     * Creates the image element
     * @param {string} dataUrl - The image data URL for the thumbnail
     * @return {HTMLElement} - The image element
     */
    createImageEl(dataUrl) {
        const imageEl = document.createElement('div');
        imageEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE);
        imageEl.style.backgroundImage = `url('${dataUrl}')`;

        // Add the height and width to the image to be the same as the thumbnail
        // so that the css `background-image` rules will work
        imageEl.style.width = `${DEFAULT_THUMBNAILS_SIDEBAR_WIDTH}px`;
        imageEl.style.height = `${this.thumbnailHeight}px`;

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
            this.virtualScroller.scrollIntoView(parsedPageNumber - 1);
        }
    }

    /**
     * Based on current page selection, checks the currently
     * visible thumbnails to toggle the appropriate class
     *
     * @return {void}
     */
    applyCurrentPageSelection() {
        this.currentThumbnails.forEach(thumbnailEl => {
            const parsedPageNum = parseInt(thumbnailEl.dataset.bpPageNum, 10);
            if (parsedPageNum === this.currentPage) {
                thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
            } else {
                thumbnailEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
            }
        });
    }

    /**
     * Toggles the thumbnails sidebar
     * @return {void}
     */
    toggle() {
        if (!this.anchorEl) {
            return;
        }

        if (!this.isOpen) {
            this.toggleOpen();
        } else {
            this.toggleClose();
        }
    }

    /**
     * Toggles the sidebar open. This will scroll the current page into view
     * @return {void}
     */
    toggleOpen() {
        if (!this.virtualScroller) {
            return;
        }

        this.isOpen = true;

        this.virtualScroller.scrollIntoView(this.currentPage - 1);
    }

    /**
     * Toggles the sidebar closed
     * @return {void}
     */
    toggleClose() {
        this.isOpen = false;
    }

    /**
     * Resizes the thumbnails sidebar
     * @return {void}
     */
    resize() {
        if (!this.virtualScroller) {
            return;
        }

        this.virtualScroller.resize(this.getContainerHeight());
    }

    /**
     * Gets the available container height
     * @return {number|null} - The height in pixels of the container or null if the anchorEl does not exist
     */
    getContainerHeight() {
        if (!this.anchorEl) {
            return null;
        }

        return this.anchorEl.parentNode.clientHeight;
    }
}

export default ThumbnailsSidebar;
