import autobind from 'autobind-decorator';
import ImageBaseViewer from './ImageBaseViewer';
import PageControls from '../../PageControls';
import './MultiImage.scss';
import { ICON_FILE_IMAGE, ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT } from '../../icons/icons';
import { CLASS_INVISIBLE } from '../../constants';

const PADDING_BUFFER = 100;
const CSS_CLASS_IMAGE = 'bp-images';
const CSS_CLASS_IMAGE_WRAPPER = 'bp-images-wrapper';
const ZOOM_UPDATE_PAN_DELAY = 50;

@autobind
class MultiImageViewer extends ImageBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = ICON_FILE_IMAGE;

        // Call super() to set up common layout
        super.setup();

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.classList.add(CSS_CLASS_IMAGE_WRAPPER);

        this.imageEl = this.wrapperEl.appendChild(document.createElement('div'));
        this.imageEl.classList.add(CSS_CLASS_IMAGE);

        this.singleImageEls = [this.imageEl.appendChild(document.createElement('img'))];
        this.loadTimeout = 60000;

        // Defaults the current page number to 1
        this.currentPageNumber = 1;
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
        this.setup();
        super.load();

        // Hides images until content is loaded
        this.imageEl.classList.add(CLASS_INVISIBLE);
        this.bindImageListeners(0);
        this.bindDOMListeners();

        return this.getRepStatus()
            .getPromise()
            .then(() => {
                const template = this.options.representation.content.url_template;
                this.imageUrls = this.constructImageUrls(template);

                this.imageUrls.forEach((imageUrl, index) => this.setupImageEls(imageUrl, index));

                this.wrapperEl.addEventListener('scroll', this.scrollHandler, true);
            })
            .catch(this.handleAssetError);
    }

    /**
     * Generates a list of image urls from the given template.
     *
     * @param {string} template - Base URL for images
     * @return {string[]} Array of image URLs
     */
    constructImageUrls(template) {
        const { viewer, representation } = this.options;
        const metadata = representation.metadata;
        const asset = viewer.ASSET;
        this.pagesCount = metadata.pages;

        const urlBase = this.createContentUrlWithAuthParams(template, asset);
        const urls = [];
        for (let pageNum = 1; pageNum <= this.pagesCount; pageNum++) {
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
        this.singleImageEls[index].classList.add('page');

        this.singleImageEls[index].src = imageUrl;
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
        this.emit('scale', { scale: this.scale });
    }

    /**
     * Adds UI controls
     *
     * @override
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.pageControls.checkPaginationButtons(this.currentPageNumber, this.pagesCount);
    }

    /**
     * Binds listeners for document controls. Overridden.
     *
     * @protected
     * @return {void}
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.pageControls = new PageControls(this.controls, this.prevPage, this.nextPage);
        this.pageControls.init(this.pagesCount);
        this.pageControls.addListener('setpage', this.setPage);

        this.controls.add(
            __('enter_fullscreen'),
            this.toggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN
        );
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
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

        this.singleImageEls[index].addEventListener('error', this.errorHandler);
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

        this.singleImageEls[index].removeEventListener('error', this.errorHandler);
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
     * @param {number} pageNum - Page to navigate to
     * @return {void}
     */
    setPage(pageNum) {
        if (pageNum < 1 || pageNum > this.pagesCount) {
            return;
        }

        this.currentPageNumber = pageNum;
        this.singleImageEls[pageNum - 1].scrollIntoView();
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

        if (!this.scrollState) {
            const currentPageEl = this.singleImageEls[this.currentPageNumber - 1];
            this.scrollState = {
                down: false,
                lastY: currentPageEl.scrollTop
            };
        }

        const imageScrollHandler = this.isSingleImageElScrolled.bind(this);
        this.scrollCheckHandler = window.requestAnimationFrame(imageScrollHandler);
    }

    /**
     * Updates page number if the single image has been scrolled past
     *
     * @private
     * @return {void}
     */
    isSingleImageElScrolled() {
        this.scrollCheckHandler = null;
        const currentY = this.wrapperEl.scrollTop;
        const lastY = this.scrollState.lastY;

        if (currentY !== lastY) {
            this.scrollState.isScrollingDown = currentY > lastY;
        }
        this.scrollState.lastY = currentY;
        this.updatePageChange();
    }

    /**
     * Updates page number in the page controls
     *
     * @private
     * @param {number} pageNum - Page just navigated to
     * @return {void}
     */
    pagechangeHandler(pageNum) {
        this.currentPageNumber = pageNum;
        this.pageControls.updateCurrentPage(pageNum);
        this.emit('pagefocus', this.currentPageNumber);
    }

    /**
     * Update the page number based on scroll direction. Only increment if
     * wrapper is scrolled down past at least half of the current page element.
     * Only decrement page if wrapper is scrolled up past at least half of the
     * previous page element
     *
     * @private
     * @return {void}
     */
    updatePageChange() {
        let pageNum = this.currentPageNumber;
        const currentPageEl = this.singleImageEls[this.currentPageNumber - 1];
        const wrapperScrollOffset = this.scrollState.lastY;
        const currentPageMiddleY = currentPageEl.offsetTop + currentPageEl.clientHeight / 2;
        const isScrolledToBottom = wrapperScrollOffset + this.wrapperEl.clientHeight >= this.wrapperEl.scrollHeight;

        if (
            this.scrollState.isScrollingDown &&
            currentPageEl.nextSibling &&
            (wrapperScrollOffset > currentPageMiddleY || isScrolledToBottom)
        ) {
            // Increment page
            const nextPage = currentPageEl.nextSibling;
            pageNum = parseInt(nextPage.dataset.pageNumber, 10);
        } else if (!this.scrollState.isScrollingDown && currentPageEl.previousSibling) {
            const prevPage = currentPageEl.previousSibling;
            const prevPageMiddleY = prevPage.offsetTop + prevPage.clientHeight / 2;

            // Decrement page
            if (prevPageMiddleY > wrapperScrollOffset) {
                pageNum = parseInt(prevPage.dataset.pageNumber, 10);
            }
        }

        this.pagechangeHandler(pageNum);
    }
}

export default MultiImageViewer;
