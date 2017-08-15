import EventEmitter from 'events';
import fullscreen from './Fullscreen';
import Browser from './Browser';
import { decodeKeydown } from './util';
import { ICON_DROP_DOWN, ICON_DROP_UP } from './icons/icons';

const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
const pageNumTemplate = `
    <div class='bp-page-num-wrapper'>
        <span class='bp-current-page'>1</span>
        <input type='number' pattern='[0-9]*' min='1'  value='' size='3' class='bp-page-num-input' />
        <span class='bp-page-num-divider'>&nbsp;/&nbsp;</span>
        <span class='bp-total-pages'>1</span>
    </div>`.replace(/>\s*</g, '><');

class PageControls extends EventEmitter {
    /**
     * [constructor]
     *
     * @param {HTMLElement} container - The container
     * @param {Function} previousPage - Previous page handler
     * @param {Function} nextPage - Next page handler
     * @return {Controls} Instance of controls
     */
    constructor(controls, previousPage, nextPage) {
        super();

        this.controls = controls;
        this.controlsEl = controls.controlsEl;
        this.currentPageEl = controls.currentPageEl;
        this.pageNumInputEl = controls.pageNumInputEl;

        this.controls.add(__('previous_page'), previousPage, 'bp-previous-page-icon bp-previous-page', ICON_DROP_UP);
        this.controls.add(__('enter_page_num'), this.showPageNumInput.bind(this), 'bp-page-num', pageNumTemplate);
        this.controls.add(__('next_page'), nextPage, 'bp-next-page-icon bp-next-page', ICON_DROP_DOWN);
    }

    /**
     * Initializes page number selector.
     *
     * @private
     * @param {number} pagesCount - Total number of page
     * @return {void}
     */
    init(pagesCount) {
        const pageNumEl = this.controlsEl.querySelector('.bp-page-num');
        this.pagesCount = pagesCount;

        // Update total page number
        const totalPageEl = pageNumEl.querySelector('.bp-total-pages');
        totalPageEl.textContent = pagesCount;

        // Keep reference to page number input and current page elements
        this.pageNumInputEl = pageNumEl.querySelector('.bp-page-num-input');
        this.pageNumInputEl.setAttribute('max', pagesCount);

        this.currentPageEl = pageNumEl.querySelector('.bp-current-page');
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

        this.pageNumInputEl.value = this.currentPageEl.textContent;
        this.pageNumInputEl.focus();
        this.pageNumInputEl.select();

        // finish input when input is blurred or enter key is pressed
        this.pageNumInputEl.addEventListener('blur', this.pageNumInputBlurHandler.bind(this));
        this.pageNumInputEl.addEventListener('keydown', this.pageNumInputKeydownHandler.bind(this));
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
    checkPaginationButtons(currentPageNum, pagesCount) {
        const pageNumButtonEl = this.controlsEl.querySelector('.bp-page-num');
        const previousPageButtonEl = this.controlsEl.querySelector('.bp-previous-page');
        const nextPageButtonEl = this.controlsEl.querySelector('.bp-next-page');

        // Safari disables keyboard input in fullscreen before Safari 10.1
        const isSafariFullscreen = Browser.getName() === 'Safari' && fullscreen.isFullscreen(this.controlsEl);

        // Disable page number selector if there is only one page or less
        if (pageNumButtonEl) {
            if (pagesCount <= 1 || isSafariFullscreen) {
                pageNumButtonEl.disabled = true;
            } else {
                pageNumButtonEl.disabled = false;
            }
        }

        // Disable previous page if on first page, otherwise enable
        if (previousPageButtonEl) {
            if (currentPageNum === 1) {
                previousPageButtonEl.disabled = true;
            } else {
                previousPageButtonEl.disabled = false;
            }
        }

        // Disable next page if on last page, otherwise enable
        if (nextPageButtonEl) {
            if (currentPageNum === pagesCount) {
                nextPageButtonEl.disabled = true;
            } else {
                nextPageButtonEl.disabled = false;
            }
        }
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

        // refine the page number to fall within bounds
        if (pageNum > this.pagesCount) {
            truePageNum = this.pagesCount;
        } else if (pageNum < 1) {
            truePageNum = 1;
        }

        if (this.pageNumInputEl) {
            this.pageNumInputEl.value = truePageNum;
        }

        if (this.currentPageEl) {
            this.currentPageEl.textContent = truePageNum;
        }

        this.currentPageNumber = truePageNum;
        this.checkPaginationButtons(this.currentPageNumber, this.pagesCount);
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
            this.emit('setpage', pageNum);
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
                // this.docEl.focus();
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
                // this.docEl.focus();

                event.stopPropagation();
                event.preventDefault();
                break;

            default:
                break;
        }
    }
}

export default PageControls;
