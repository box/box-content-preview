import autobind from 'autobind-decorator';
import ImageBaseViewer from './ImageBaseViewer';
import Browser from '../../Browser';
import './MultiImage.scss';
import {
    ICON_FILE_IMAGE,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_DROP_DOWN,
    ICON_DROP_UP
} from '../../icons/icons';
import { CLASS_INVISIBLE } from '../../constants';
import { decodeKeydown } from '../../util';

const PADDING_BUFFER = 100;
const CSS_CLASS_IMAGE = 'bp-images';
const CSS_CLASS_IMAGE_WRAPPER = 'bp-images-wrapper';
const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
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
        this.controls.initPageNumEl(this.pagesCount);
        this.controls.checkPaginationButtons(this.currentPageNumber, this.pagesCount);
    }

    /**
     * Binds listeners for document controls. Overridden.
     *
     * @protected
     * @return {void}
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.controls.add(
            __('previous_page'),
            this.previousPage,
            'bp-image-previous-page-icon bp-previous-page',
            ICON_DROP_UP
        );
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'bp-page-num', this.controls.pageNumTemplate);
        this.controls.add(__('next_page'), this.nextPage, 'bp-image-next-page-icon bp-next-page', ICON_DROP_DOWN);

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
     * Go to specified page
     *
     * @param {number} pageNum - Page to navigate to
     * @return {void}
     */
    setPage(pageNum) {
        if (pageNum <= 0 || pageNum > this.pagesCount) {
            return;
        }

        this.currentPageNumber = pageNum;
        this.singleImageEls[pageNum].scrollIntoView();
        this.updateCurrentPage(pageNum);

        this.emit('pagefocus', pageNum);
    }

    /**
     * Update page number in page control widget.
     *
     * @private
     * @param {number} pageNum - Number of page to update to
     * @return {void}
     */
    updateCurrentPage(pageNum) {
        let truePageNum = pageNum;
        const pagesCount = this.pagesCount;

        // refine the page number to fall within bounds
        if (pageNum > pagesCount) {
            truePageNum = pagesCount;
        } else if (pageNum < 1) {
            truePageNum = 1;
        }

        if (!this.controls) {
            return;
        }

        if (this.controls.pageNumInputEl) {
            this.controls.pageNumInputEl.value = truePageNum;
        }

        if (this.controls.currentPageEl) {
            this.controls.currentPageEl.textContent = truePageNum;
        }

        this.controls.checkPaginationButtons(this.currentPageNumber, this.pagesCount);
    }

    /**
     * Replaces the page number display with an input box that allows the user to type in a page number
     *
     * @private
     * @return {void}
     */
    showPageNumInput() {
        // show the input box with the current page number selected within it
        this.controls.controlsEl.classList.add(SHOW_PAGE_NUM_INPUT_CLASS);

        this.controls.pageNumInputEl.value = this.controls.currentPageEl.textContent;
        this.controls.pageNumInputEl.focus();
        this.controls.pageNumInputEl.select();

        // finish input when input is blurred or enter key is pressed
        this.controls.pageNumInputEl.addEventListener('blur', this.pageNumInputBlurHandler);
        this.controls.pageNumInputEl.addEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
     * Hide the page number input
     *
     * @private
     * @return {void}
     */
    hidePageNumInput() {
        this.controls.controlsEl.classList.remove(SHOW_PAGE_NUM_INPUT_CLASS);
        this.controls.pageNumInputEl.removeEventListener('blur', this.pageNumInputBlurHandler);
        this.controls.pageNumInputEl.removeEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
     * Blur handler for page number input.
     *
     * @param  {Event} event Blur event
     * @return {void}
     * @private
     */
    pageNumInputBlurHandler(event) {
        const target = event.target;
        const pageNum = parseInt(target.value, 10);

        if (!isNaN(pageNum)) {
            this.setPage(pageNum);
        }

        this.hidePageNumInput();
    }

    /**
     * Keydown handler for page number input.
     *
     * @private
     * @param {Event} event - Keydown event
     * @return {void}
     */
    pageNumInputKeydownHandler(event) {
        const key = decodeKeydown(event);

        switch (key) {
            case 'Enter':
            case 'Tab':
                // The keycode of the 'next' key on Android Chrome is 9, which maps to 'Tab'.
                this.singleImageEls[this.currentPageNumber].focus();
                // We normally trigger the blur handler by blurring the input
                // field, but this doesn't work for IE in fullscreen. For IE,
                // we blur the page behind the controls - this unfortunately
                // is an IE-only solution that doesn't work with other browsers
                if (Browser.getName() !== 'Explorer') {
                    event.target.blur();
                }

                event.stopPropagation();
                event.preventDefault();
                break;

            case 'Escape':
                this.hidePageNumInput();
                this.singleImageEls[this.currentPageNumber].focus();

                event.stopPropagation();
                event.preventDefault();
                break;

            default:
                break;
        }
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
}

export default MultiImageViewer;
