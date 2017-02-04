import autobind from 'autobind-decorator';
import throttle from 'lodash.throttle';
import pageNumTemplate from './page-num-button-content.html';
import Browser from '../../browser';
import DocBase from './doc-base';
import { enableEl, disableEl } from '../../util';
import { CLASS_INVISIBLE } from '../../constants';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../icons/icons';
import './presentation.scss';

const Box = global.Box || {};
const WHEEL_THROTTLE = 200;
const PADDING_OFFSET = 30;
const SCROLL_EVENT_OFFSET = 5;
const SCROLL_TOP_OFFSET = 25;

@autobind
class Presentation extends DocBase {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [contructor]
     *
     * @param {string|HTMLElement} container - Container node
     * @param {object} [options] - Configuration options
     * @return {Presentation} Presentation instance
     */
    constructor(container, options) {
        super(container, options);
        this.docEl.classList.add('bp-doc-presentation');
        this.zoomLevel = 0;
    }

    /**
     * Go to specified page. We implement presentation mode by hiding the
     * previous current page and showing the new page.
     *
     * @override
     * @param {number} pageNum - Page to navigate to
     * @return {void}
     */
    setPage(pageNum) {
        let pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);

        if (pageEl) {
            pageEl.classList.add(CLASS_INVISIBLE);
        }

        super.setPage(pageNum);

        pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);

        if (pageEl) {
            pageEl.classList.remove(CLASS_INVISIBLE);
        }

        this.pdfViewer.update();
        this.centerSlide(pageEl);
    }

    /**
     * Zoom into document.
     *
     * @override
     * @param {number} ticks - Number of times to zoom in
     * @return {void}
     */
    zoomIn(ticks = 1) {
        if (this.findBar.opened) {
            return;
        }

        this.zoomLevel += 1;
        enableEl(this.zoomOutEl);

        super.zoomIn(ticks);
    }

    /**
     * Zoom out of document.
     *
     * @override
     * @param {number} ticks - Number of times to zoom out
     * @return {void}
     */
    zoomOut(ticks = 1) {
        if (this.zoomLevel === 0) {
            return;
        } else if (this.zoomLevel === 1) {
            disableEl(this.zoomOutEl);
        }

        this.zoomLevel -= 1;

        super.zoomOut(ticks);
    }

    /**
     * Handles keyboard events for presentation viewer.
     *
     * @override
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
     */
    onKeydown(key) {
        if (key === 'ArrowUp') {
            this.previousPage();
            return true;
        } else if (key === 'ArrowDown') {
            this.nextPage();
            return true;
        }

        return super.onKeydown(key);
    }

    /**
     * Determines if the document has overflow and adjusts the CSS accordingly.
     *
     * @return {boolean}
     */
    checkOverflow() {
        const doc = this.docEl;
        // Getting the page element to compare to the doc height/width
        const page = this.docEl.firstChild.firstChild;
        const hasXOverflow = page.clientWidth > doc.clientWidth;
        const hasYOverflow = page.clientHeight - PADDING_OFFSET > doc.clientHeight;
        if (!hasXOverflow && !hasYOverflow) {
            doc.classList.remove('overflow');
            doc.classList.remove('overflow-y');
            return false;
        } else if (hasYOverflow) {
            doc.classList.add('overflow');
            doc.classList.add('overflow-y');
            return true;
        }

        // Only x overflow
        doc.classList.remove('overflow-y');
        doc.classList.add('overflow');
        return true;
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Loads PDF.js with provided PDF.
     *
     * @override
     * @protected
     * @param {string} pdfUrl - The URL of the PDF to load
     * @return {void}
     */
    initViewer(pdfUrl) {
        super.initViewer(pdfUrl);
        this.initialDocHeight = this.docEl.clientHeight;
        // Overwrite scrollPageIntoView for presentations since we have custom pagination behavior
        this.pdfViewer.scrollPageIntoView = (pageObj) => {
            let pageNum = pageObj;
            if (typeof pageNum !== 'number') {
                pageNum = pageObj.pageNumber || 1;
            }

            this.setPage(pageNum);
        };
    }

    /**
     * Vertically centers a slide via padding.
     *
     * @protected
     * @param {number} page - The page number to center
     * @return {void}
     */
    centerSlide(page) {
        const pageEl = page;
        let padding = 0;
        pageEl.style.padding = '0';
        if (page.clientHeight <= this.docEl.clientHeight) {
            padding = (this.docEl.clientHeight - page.clientHeight) / 2;
        } else {
            return;
        }

        pageEl.style.padding = `${padding}px 0`;
        const textLayer = pageEl.querySelector('.textLayer');
        if (textLayer) {
            textLayer.style.top = `${padding}px`;
        }
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
    * Binds DOM listeners for presentation viewer.
    *
    * @override
    * @protected
    * @return {void}
    */
    bindDOMListeners() {
        super.bindDOMListeners();

        this.docEl.addEventListener('wheel', this.wheelHandler);

        if (Browser.isMobile()) {
            this.docEl.addEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.addEventListener('touchmove', this.mobileScrollHandler);
            this.docEl.addEventListener('touchend', this.mobileScrollHandler);
        }
    }

    /**
    * Unbinds DOM listeners for presentation viewer.
    *
    * @override
    * @protected
    * @return {void}
    */
    unbindDOMListeners() {
        super.unbindDOMListeners();

        this.docEl.removeEventListener('wheel', this.wheelHandler);
        if (Browser.isMobile()) {
            this.docEl.removeEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchmove', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchend', this.mobileScrollHandler);
        }

        if (this.findBar) {
            this.findBar.removeListener('findbaropen', this.findBarOpenHandler);
            this.findBar.removeListener('findbarclose', this.findBarCloseHandler);
        }
    }

    /**
     * Adds event listeners for presentation controls
     *
     * @override
     * @protected
     * @return {void}
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.controls.add(__('zoom_out'), this.zoomOut, 'bp-exit-zoom-out-icon', ICON_ZOOM_OUT);
        this.zoomOutEl = document.querySelector('.bp-exit-zoom-out-icon');
        disableEl(this.zoomOutEl);

        this.controls.add(__('zoom_in'), this.zoomIn, 'bp-enter-zoom-in-icon', ICON_ZOOM_IN);
        this.zoomInEl = document.querySelector('.bp-enter-zoom-in-icon');

        this.controls.add(__('previous_page'), this.previousPage, 'bp-presentation-previous-page-icon bp-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'bp-doc-page-num', buttonContent);

        this.controls.add(__('next_page'), this.nextPage, 'bp-presentation-next-page-icon bp-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
    * Initializes the find bar
    *
    * @override
    * @protected
    * @return {void}
    */
    initFind() {
        super.initFind();

        this.findBar.addListener('findbaropen', this.findBarOpenHandler);
        this.findBar.addListener('findbarclose', this.findBarCloseHandler);
    }

    /**
     * Handler for mobile scroll events.
     *
     * @private
     * @param {object} event - scroll event
     * @return {void}
     */
    mobileScrollHandler(event) {
        // Don't want to handle scroll if zoomed, if nothing has changed, or a touch move event which fixes intertia scroll bounce on iOS
        if (this.checkOverflow() || !event.changedTouches || event.changedTouches.length === 0 || event.type === 'touchmove') {
            event.preventDefault();
            return;
        }

        if (event.type === 'touchstart') {
            this.scrollStart = event.changedTouches[0].clientY;
        } else {
            const scrollEnd = event.changedTouches[0].clientY;

            // Scroll event offset prevents tapping from triggering a scroll
            if (this.scrollStart && this.scrollStart > scrollEnd + SCROLL_EVENT_OFFSET) {
                this.nextPage();
            } else if (this.scrollStart && this.scrollStart < scrollEnd - SCROLL_EVENT_OFFSET) {
                this.previousPage();
            }
        }
    }


    /**
     * Handler for 'pagesinit' event.
     *
     * @private
     * @returns {void}
     */
    pagesinitHandler() {
        // Presentation mode is implemented by hiding all pages except for the current
        const pageEls = [].slice.call(this.docEl.querySelectorAll('.pdfViewer .page'), 0);
        pageEls.forEach((pageEl) => {
            if (pageEl.getAttribute('data-page-number') === '1') {
                return;
            }

            pageEl.classList.add(CLASS_INVISIBLE);
        });

        super.pagesinitHandler();
    }

    /**
     * Handler for 'pagesinit' event.
     *
     * @override
     * @private
     * @return {void}
     */
    pagechangeHandler(e) {
        this.setPage(e.pageNumber);
        super.pagechangeHandler(e);
    }

    /**
     * Handles scrolling the presentation by page.
     *
     * @private
     * @param {object} event - wheel event
     * @return {Function} Throttled mousewheel handler
     */
    wheelHandler = throttle((event) => {
        // Should not change page if there is a lack of vertical movement
        if (event.deltaY === 0) {
            return;
        }

        // Jump to next/previous when scrolling past top or bottom of the slide
        if (this.checkOverflow()) {
            const currentPage = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
            const scrolledPastTop = this.docEl.scrollTop + SCROLL_TOP_OFFSET < currentPage.offsetTop;
            const scrolledPastBottom = this.docEl.scrollTop + window.innerHeight > currentPage.offsetTop + currentPage.offsetHeight;

            if (scrolledPastBottom) {
                this.nextPage();
            }

            if (scrolledPastTop) {
                this.previousPage();
            }

            return;
        }

        if (event.deltaY > 0) {
            this.nextPage();
        } else if (event.deltaY < 0) {
            this.previousPage();
        }
    }, WHEEL_THROTTLE);

    /**
     * Handles zoom logic around opening the find bar.
     *
     * @return {void}
     */
    findBarOpenHandler() {
        // If there is overflow, reset zoom to allow the findBar to work properly.
        if (this.checkOverflow()) {
            this.pdfViewer.currentScaleValue = 'page-fit';
            this.checkOverflow();
            this.zoomLevel = 0;
        }

        disableEl(this.zoomOutEl);
        disableEl(this.zoomInEl);
    }

    /**
     * Handles zoom logic around closing the find bar.
     *
     * @return {void}
     */
    findBarCloseHandler() {
        enableEl(this.zoomInEl);
    }
}


Box.Preview = Box.Preview || {};
Box.Preview.Presentation = Presentation;
global.Box = Box;
export default Presentation;
