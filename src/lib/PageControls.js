import EventEmitter from 'events';
import fullscreen from './Fullscreen';
import Browser from './Browser';
import { decodeKeydown } from './util';
import { ICON_DROP_DOWN, ICON_DROP_UP } from './icons/icons';

const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
const CONTROLS_PAGE_NUM_WRAPPER_CLASS = 'bp-page-num-wrapper';
const CONTROLS_CURRENT_PAGE = 'bp-current-page';
const CONTROLS_PAGE_NUM_INPUT_CLASS = 'bp-page-num-input';
const CONTROLS_TOTAL_PAGES = 'bp-total-pages';
const PAGE_NUM = 'bp-page-num';
const PREV_PAGE = 'bp-previous-page';
const NEXT_PAGE = 'bp-next-page';

const pageNumTemplate = `
    <div class='${CONTROLS_PAGE_NUM_WRAPPER_CLASS}'>
        <span class=${CONTROLS_CURRENT_PAGE}>1</span>
        <input type='number' pattern='[0-9]*' min='1'  value='' size='3' class='${CONTROLS_PAGE_NUM_INPUT_CLASS}' />
        <span class='bp-page-num-divider'>&nbsp;/&nbsp;</span>
        <span class='${CONTROLS_TOTAL_PAGES}'>1</span>
    </div>`.replace(/>\s*</g, '><');

class PageControls extends EventEmitter {
    /** @property {Controls} - Controls object */
    controls;

    /** @property {HTMLElement} - Controls element */
    controlsEl;

    /** @property {HTMLElement} - File content element */
    contentEl;

    /** @property {HTMLElement} - Total pages element */
    totalPagesEl;

    /** @property {HTMLElement} - Current page element */
    currentPageEl;

    /** @property {HTMLElement} - Page number input element */
    pageNumInputEl;
    /**
     * [constructor]
     *
     * @param {HTMLElement} controls - Viewer controls
     * @param {HTMLElement} contentEl - The content element of the file

     * @return {Controls} Instance of controls
     */
    constructor(controls, contentEl) {
        super();

        this.controls = controls;
        this.controlsEl = controls.controlsEl;

        this.contentEl = contentEl;

        this.pageNumInputBlurHandler = this.pageNumInputBlurHandler.bind(this);
        this.pageNumInputKeydownHandler = this.pageNumInputKeydownHandler.bind(this);
        this.setPreviousPage = this.setPreviousPage.bind(this);
        this.showPageNumInput = this.showPageNumInput.bind(this);
        this.setNextPage = this.setNextPage.bind(this);
    }

    /**
     * Add the page controls
     *
     * @param {number} currentPageNumber - Current page number
     * @param {number} pagesCount - Number of total pages
     * @return {void}
     */
    add(currentPageNumber, pagesCount) {
        this.controls.add(
            __('previous_page'),
            this.setPreviousPage,
            `bp-previous-page-icon ${PREV_PAGE}`,
            ICON_DROP_UP
        );
        this.controls.add(__('enter_page_num'), this.showPageNumInput, PAGE_NUM, pageNumTemplate);
        this.controls.add(__('next_page'), this.setNextPage, `bp-next-page-icon ${NEXT_PAGE}`, ICON_DROP_DOWN);

        const pageNumEl = this.controlsEl.querySelector(`.${PAGE_NUM}`);
        this.totalPagesEl = pageNumEl.querySelector(`.${CONTROLS_TOTAL_PAGES}`);
        this.totalPagesEl.textContent = pagesCount;
        this.currentPageEl = pageNumEl.querySelector(`.${CONTROLS_CURRENT_PAGE}`);
        this.currentPageEl.textContent = currentPageNumber;
        this.pageNumInputEl = pageNumEl.querySelector(`.${CONTROLS_PAGE_NUM_INPUT_CLASS}`);

        this.checkPaginationButtons();
    }

    /**
     * Replaces the page number display with an input box that allows the user to type in a page number
     *
     * @private
     * @return {void}
     */
    showPageNumInput() {
        // show the input box with the current page number selected within it
        this.controlsEl.classList.add(SHOW_PAGE_NUM_INPUT_CLASS);

        this.pageNumInputEl.value = this.getCurrentPageNumber();
        this.pageNumInputEl.focus();
        this.pageNumInputEl.select();

        // finish input when input is blurred or enter key is pressed
        this.pageNumInputEl.addEventListener('blur', this.pageNumInputBlurHandler);
        this.pageNumInputEl.addEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
     * Hide the page number input
     *
     * @private
     * @return {void}
     */
    hidePageNumInput() {
        this.controlsEl.classList.remove(SHOW_PAGE_NUM_INPUT_CLASS);
        this.pageNumInputEl.removeEventListener('blur', this.pageNumInputBlurHandler);
        this.pageNumInputEl.removeEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
     * Disables or enables previous/next pagination buttons depending on
     * current page number.
     *
     * @return {void}
     */
    checkPaginationButtons() {
        const pageNumButtonEl = this.controlsEl.querySelector(`.${PAGE_NUM}`);
        const previousPageButtonEl = this.controlsEl.querySelector(`.${PREV_PAGE}`);
        const nextPageButtonEl = this.controlsEl.querySelector(`.${NEXT_PAGE}`);

        // Safari disables keyboard input in fullscreen before Safari 10.1
        const isSafariFullscreen = Browser.getName() === 'Safari' && fullscreen.isFullscreen(this.controlsEl);

        // Disable page number selector if there is only one page or less
        if (pageNumButtonEl) {
            if (this.getTotalPages() <= 1 || isSafariFullscreen) {
                pageNumButtonEl.disabled = true;
            } else {
                pageNumButtonEl.disabled = false;
            }
        }

        // Disable previous page if on first page, otherwise enable
        if (previousPageButtonEl) {
            if (this.getCurrentPageNumber() === 1) {
                previousPageButtonEl.disabled = true;
            } else {
                previousPageButtonEl.disabled = false;
            }
        }

        // Disable next page if on last page, otherwise enable
        if (nextPageButtonEl) {
            if (this.getCurrentPageNumber() === this.getTotalPages()) {
                nextPageButtonEl.disabled = true;
            } else {
                nextPageButtonEl.disabled = false;
            }
        }
    }

    /**
     * Update page number in page control widget.
     *
     * @public
     * @param {number} pageNumber - Number of page to update to
     * @return {void}
     */
    updateCurrentPage(pageNumber) {
        if (this.pageNumInputEl) {
            this.pageNumInputEl.value = pageNumber;
        }

        if (this.currentPageEl) {
            this.setCurrentPageNumber(pageNumber);
        }

        this.checkPaginationButtons();
    }

    /**
     * Emits a message to the viewer to decrement the current page.
     *
     * @private
     * @return {void}
     */
    setPreviousPage() {
        this.emit('pagechange', this.getCurrentPageNumber() - 1);
    }

    /**
     * Emits a message to the viewer to increment the current page.
     *
     * @private
     * @return {void}
     */
    setNextPage() {
        this.emit('pagechange', this.getCurrentPageNumber() + 1);
    }

    /**
     * Gets the page number for the file.
     *
     * @private
     * @return {number} Number of pages
     */
    getCurrentPageNumber() {
        return parseInt(this.currentPageEl.textContent, 10);
    }

    /**
     * Sets the number of pages for the file.
     *
     * @private
     * @param {number} pageNumber - Number to set
     * @return {number} Number of pages
     */
    setCurrentPageNumber(pageNumber) {
        this.currentPageEl.textContent = pageNumber;
    }

    /**
     * Gets the number of pages for the file.
     *
     * @private
     * @return {number} Number of pages
     */
    getTotalPages() {
        return parseInt(this.totalPagesEl.textContent, 10);
    }

    /**
     * Blur handler for page number input.
     *
     * @private
     * @param  {Event} event Blur event
     * @return {void}
     */
    pageNumInputBlurHandler(event) {
        const { target } = event;
        const pageNumber = parseInt(target.value, 10);

        if (!Number.isNaN(pageNumber)) {
            this.emit('pagechange', pageNumber);
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
                this.contentEl.focus();
                // The keycode of the 'next' key on Android Chrome is 9, which maps to 'Tab'.
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
                this.contentEl.focus();

                event.stopPropagation();
                event.preventDefault();
                break;

            default:
                break;
        }
    }
}

export default PageControls;
