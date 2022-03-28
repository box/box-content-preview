import VirtualScroller from './VirtualScroller';
import { decodeKeydown } from './util';
import Thumbnail from './Thumbnail';

const CLASS_BOX_PREVIEW_THUMBNAIL = 'bp-thumbnail';
const CLASS_BOX_PREVIEW_THUMBNAIL_NAV = 'bp-thumbnail-nav';
const CLASS_BOX_PREVIEW_THUMBNAIL_IMAGE_LOADED = 'bp-thumbnail-image-loaded';
const CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED = 'bp-thumbnail-is-selected';
const CLASS_BOX_PREVIEW_THUMBNAIL_PAGE_NUMBER = 'bp-thumbnail-page-number';
export const THUMBNAIL_TOTAL_WIDTH = 150; // 190px sidebar width - 40px margins
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

    /** @property {Boolean} - Whether the sidebar is open or not */
    isOpen;

    /** @property {PDfViewer} - The PDFJS viewer instance */
    pdfViewer;

    /** @property {number} - The percentage (0-1) to scale down from the full page to thumbnail size */
    scale;

    /** @property {Thumbnail} */
    thumbnail;

    virtualScroller;

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
        this.thumbnail = new Thumbnail(this.pdfViewer);
        this.isOpen = false;

        this.createPlaceholderThumbnail = this.createPlaceholderThumbnail.bind(this);
        this.generateThumbnailImages = this.generateThumbnailImages.bind(this);
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
        const thumbnailEl = target.parentNode;
        const thumbnailPage = parseInt(thumbnailEl.dataset.bpPageNum, 10);

        if (this.onThumbnailSelect) {
            this.onThumbnailSelect(thumbnailPage);
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

        this.thumbnail.init().then(thumbnailHeight => {
            if (thumbnailHeight) {
                this.virtualScroller.init({
                    initialRowIndex: this.currentPage - 1,
                    totalItems: this.pdfViewer.pagesCount,
                    itemHeight: thumbnailHeight,
                    containerHeight: this.getContainerHeight(),
                    margin: THUMBNAIL_MARGIN,
                    renderItemFn: this.createPlaceholderThumbnail,
                    onScrollEnd: this.generateThumbnailImages,
                    onInit: this.generateThumbnailImages,
                });
            }
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
        thumbnailEl.setAttribute('role', 'button');
        thumbnailEl.appendChild(this.createPageNumber(pageNum));

        const thumbnailNav = this.createThumbnailNav();
        thumbnailEl.appendChild(thumbnailNav);

        if (pageNum === this.currentPage) {
            thumbnailEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
            thumbnailEl.setAttribute('aria-current', true);
        }

        // If image is already in cache, then use it instead of waiting for
        // the second render image pass
        const cachedImage = this.thumbnail.getImageFromCache(itemIndex);
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
            this.thumbnail.createThumbnailImage(itemIndex).then(imageEl => {
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
                thumbnailEl.setAttribute('aria-current', true);
            } else {
                thumbnailEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAIL_IS_SELECTED);
                thumbnailEl.removeAttribute('aria-current');
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
