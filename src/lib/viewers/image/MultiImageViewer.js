import React from 'react';
import ImageBaseViewer from './ImageBaseViewer';
import MultiImageControls from './MultiImageControls';
import { CLASS_INVISIBLE, CLASS_MULTI_IMAGE_PAGE, CLASS_IS_SCROLLABLE } from '../../constants';
import { pageNumberFromScroll } from '../../util';
import './MultiImage.scss';

const PADDING_BUFFER = 100;
const CSS_CLASS_IMAGE = 'bp-images';
const CSS_CLASS_IMAGE_WRAPPER = 'bp-images-wrapper';
const ZOOM_UPDATE_PAN_DELAY = 50;

class MultiImageViewer extends ImageBaseViewer {
    /** @property {Image[]} - List of images rendered sequentially */
    singleImageEls = [];

    /** @inheritdoc */
    constructor(options) {
        super(options);

        this.finishLoading = this.finishLoading.bind(this);
        this.handleAssetAndRepLoad = this.handleAssetAndRepLoad.bind(this);
        this.handleMultiImageDownloadError = this.handleMultiImageDownloadError.bind(this);
        this.handlePageSubmit = this.handlePageSubmit.bind(this);
        this.handlePageChangeFromScroll = this.handlePageChangeFromScroll.bind(this);
        this.scrollHandler = this.scrollHandler.bind(this);
        this.setPage = this.setPage.bind(this);
        this.updatePannability = this.updatePannability.bind(this);
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

        this.wrapperEl = this.createViewer(document.createElement('div'));
        this.wrapperEl.className = `${CSS_CLASS_IMAGE_WRAPPER} ${CLASS_IS_SCROLLABLE}`;
        this.wrapperEl.tabIndex = '0';

        this.imageEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.imageEl.classList.add(CSS_CLASS_IMAGE);

        this.singleImageEls.push(this.imageEl.appendChild(document.createElement('img')));
        this.loadTimeout = 60000;

        // Defaults the current page number to 1
        this.currentPageNumber = 1;
        this.previousScrollTop = 0;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.singleImageEls && this.singleImageEls.length > 0) {
            this.singleImageEls.forEach((el, index) => {
                this.unbindImageListeners(index);
            });
        }

        super.destroy();
    }

    /**
     * Loads the images.
     *
     * @param {Array} imageUrls - Urls for images
     * @return {Promise} Promise to load bunch of images
     */
    load() {
        super.load();

        // Hides images until content is loaded
        this.imageEl.classList.add(CLASS_INVISIBLE);
        this.bindImageListeners(0);
        this.bindDOMListeners();

        return this.getRepStatus()
            .getPromise()
            .then(this.handleAssetAndRepLoad)
            .catch(this.handleAssetError);
    }

    /**
     * Handles the load event for the first image.
     *
     * @return {void}
     */

    finishLoading() {
        super.finishLoading();
        this.setOriginalImageSizes();
    }

    /**
     * Loads the multipart image for viewing
     *
     * @override
     * @return {void}
     */
    handleAssetAndRepLoad() {
        const template = this.options.representation.content.url_template;
        this.imageUrls = this.constructImageUrls(template);

        // Start load timer
        this.startLoadTimer();

        this.imageUrls.forEach((imageUrl, index) => this.setupImageEls(imageUrl, index));

        this.wrapperEl.addEventListener('scroll', this.scrollHandler, true);

        super.handleAssetAndRepLoad();
    }

    /**
     * Generates a list of image urls from the given template.
     *
     * @param {string} template - Base URL for images
     * @return {string[]} Array of image URLs
     */
    constructImageUrls(template) {
        const { viewer, representation } = this.options;
        const { metadata } = representation;
        const asset = viewer.ASSET;
        this.pagesCount = metadata.pages;

        const urlBase = this.createContentUrlWithAuthParams(template, asset);
        const urls = [];
        for (let pageNum = 1; pageNum <= this.pagesCount; pageNum += 1) {
            urls.push(urlBase.replace('{page}', pageNum));
        }

        return urls;
    }

    /**
     * Sets up each image El.
     *
     * @param {Object} imageUrl - Image URL.
     * @param {number} index - Index in the image URL array.
     * @return {void}
     */
    setupImageEls(imageUrl, index) {
        // first page is created in setup(), so we don't need create it here
        if (index !== 0) {
            this.singleImageEls[index] = this.imageEl.appendChild(document.createElement('img'));
            this.bindImageListeners(index);
        }

        // Set page number. Page is index + 1.
        this.singleImageEls[index].setAttribute('data-page-number', index + 1);
        this.singleImageEls[index].classList.add(CLASS_MULTI_IMAGE_PAGE);
        this.singleImageEls[index].src = imageUrl;
    }

    /**
     * Sets the original image width and height on the img element. Can be removed when
     * naturalHeight and naturalWidth attributes work correctly in IE 11.
     *
     * @protected
     * @return {Promise} A promise that is resolved if the original image dimensions were set.
     */
    setOriginalImageSizes() {
        const promises = [];

        this.singleImageEls.forEach(imageEl => {
            promises.push(super.setOriginalImageSize(imageEl));
        });

        return Promise.all(promises);
    }

    /**
     * Updates pannability state and cursor.
     *
     * @private
     * @return {void}
     */
    updatePannability() {
        if (!this.wrapperEl) {
            return;
        }

        this.isPannable = this.imageEl.clientWidth > this.wrapperEl.clientWidth;
        this.didPan = false;
        this.updateCursor();
    }

    /**
     * Handles zoom
     *
     * @private
     * @param {string} [type] - Type of zoom in|out|reset
     * @return {void}
     */
    zoom(type) {
        let newWidth;
        const viewportWidth = this.imageEl.parentNode.clientWidth;
        const imageContainerWidth = this.imageEl.clientWidth;

        switch (type) {
            case 'in':
                newWidth = imageContainerWidth + PADDING_BUFFER;
                break;

            case 'out':
                newWidth = imageContainerWidth - PADDING_BUFFER;
                break;

            default:
                newWidth = viewportWidth;
                break;
        }

        this.imageEl.style.width = `${newWidth}px`;

        // Fix the scroll position of the image to be centered
        this.imageEl.parentNode.scrollLeft = (this.imageEl.parentNode.scrollWidth - viewportWidth) / 2;

        this.setScale(this.imageEl.offsetWidth, this.imageEl.offsetHeight);
        this.emit('zoom');

        // Give the browser some time to render before updating pannability
        setTimeout(this.updatePannability, ZOOM_UPDATE_PAN_DELAY);

        // Set current page to previously opened page or first page
        this.setPage(this.currentPageNumber);
    }

    /**
     * @inheritdoc
     */
    setScale(width, height) {
        // Grab the first page image dimensions
        const imageEl = this.singleImageEls[0];
        this.scale = width ? width / imageEl.naturalWidth : height / imageEl.naturalHeight;
        this.renderUI();
        this.emit('scale', { scale: this.scale });
    }

    /**
     * Handles page submit by setting page and then setting focus
     *
     * @override
     * @return {void}
     */
    handlePageSubmit(page) {
        this.setPage(page);
        this.wrapperEl.focus();
    }

    /**
     * Load controls
     *
     * @override
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.renderUI();
    }

    /**
     * Render controls
     *
     * @override
     * @return {void}
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        this.controls.render(
            <MultiImageControls
                onFullscreenToggle={this.toggleFullscreen}
                onPageChange={this.setPage}
                onPageSubmit={this.handlePageSubmit}
                onZoomIn={this.zoomIn}
                onZoomOut={this.zoomOut}
                pageCount={this.pagesCount}
                pageNumber={this.currentPageNumber}
                scale={this.scale}
            />,
        );
    }

    /**
     * Passes the error and download URL to the download error handler.
     *
     * @param {Error} err - Download error
     * @return {void}
     */
    handleMultiImageDownloadError(err) {
        this.singleImageEls.forEach((el, index) => {
            this.unbindImageListeners(index);
        });

        // Since we're using the src to get the hostname, we can always use the src of the first page
        const { src } = this.singleImageEls[0];

        // Clear any images we may have started to load.
        this.singleImageEls = [];

        this.handleDownloadError(err, src);
    }

    /**
     * Binds error and load event listeners for an image element.
     *
     * @param {number} index - Index of image to bind listeners to
     * @return {void}
     */
    bindImageListeners(index) {
        if (index === 0) {
            this.singleImageEls[index].addEventListener('load', this.finishLoading);
        }

        this.singleImageEls[index].addEventListener('error', this.handleMultiImageDownloadError);
    }

    /**
     * Unbinds error and load event listeners for an image element.
     *
     * @param {number} index - Index of image to unbind listeners from
     * @return {void}
     */
    unbindImageListeners(index) {
        if (index === 0) {
            this.singleImageEls[index].removeEventListener('load', this.finishLoading);
        }

        this.singleImageEls[index].removeEventListener('error', this.handleMultiImageDownloadError);
    }

    /**
     * Go to previous page
     *
     * @return {void}
     */
    previousPage() {
        this.setPage(this.currentPageNumber - 1);
    }

    /**
     * Go to next page
     *
     * @return {void}
     */
    nextPage() {
        this.setPage(this.currentPageNumber + 1);
    }

    /**
     * Go to specified page
     *
     * @param {number} pageNumber - Page to navigate to
     * @return {void}
     */
    setPage(pageNumber) {
        if (!this.isValidPageChange(pageNumber)) {
            return;
        }

        this.singleImageEls[pageNumber - 1].scrollIntoView();
        this.updateCurrentPage(pageNumber);
    }

    /**
     * Updates the current page
     *
     * @param {number} pageNumber - Page to set
     * @return {void}
     */

    updateCurrentPage(pageNumber) {
        if (!this.isValidPageChange(pageNumber)) {
            return;
        }

        this.currentPageNumber = pageNumber;

        this.renderUI();

        this.emit('pagefocus', {
            pageNumber,
        });
    }

    /**
     * Determines if the requested page change is valid
     *
     * @private
     * @param {number} pageNumber - Requested page number
     * @return {void}
     */
    isValidPageChange(pageNumber) {
        return pageNumber >= 1 && pageNumber <= this.pagesCount && pageNumber !== this.currentPageNumber;
    }

    /**
     * Handles scroll event in the wrapper element
     *
     * @private
     * @return {void}
     */
    scrollHandler() {
        if (this.scrollCheckHandler) {
            return;
        }
        const imageScrollHandler = this.handlePageChangeFromScroll;
        this.scrollCheckHandler = window.requestAnimationFrame(imageScrollHandler);
    }

    /**
     * Handles page changes due to scrolling
     *
     * @private
     * @return {void}
     */
    handlePageChangeFromScroll() {
        const pageChange = pageNumberFromScroll(
            this.currentPageNumber,
            this.previousScrollTop,
            this.singleImageEls[this.currentPageNumber - 1],
            this.wrapperEl,
        );

        this.updateCurrentPage(pageChange);

        this.scrollCheckHandler = null;
        this.previousScrollTop = this.wrapperEl.scrollTop;
    }
}

export default MultiImageViewer;
