import autobind from 'autobind-decorator';
import pageNumTemplate from 'raw!./page-num-button-content.html';
import throttle from 'lodash.throttle';
import Browser from '../../browser';
import DocBase from './doc-base';
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
const PRESENTATION_MODE_STATE = 3;
const PADDING_OFFSET = 30;
const SCROLL_EVENT_OFFSET = 5;

@autobind
class Presentation extends DocBase {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [contructor]
     *
     * @param {string|HTMLElement} container Container node
     * @param {object} [options] Configuration options
     * @returns {Presentation} Presentation instance
     */
    constructor(container, options) {
        super(container, options);
        this.docEl.classList.add('box-preview-doc-presentation');
    }

    /**
     * Go to specified page. We implement presentation mode by hiding the
     * previous current page and showing the new page.
     *
     * @param {number} pageNum Page to navigate to
     * @returns {void}
     */
    setPage(pageNum) {
        this.checkOverflow();

        let pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
        pageEl.classList.add(CLASS_INVISIBLE);

        super.setPage(pageNum);

        pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
        pageEl.classList.remove(CLASS_INVISIBLE);

        this.pdfViewer.update();
    }

    /**
     * Handles keyboard events for presentation viewer.
     *
     * @override
     * @param {string} key keydown key
     * @returns {boolean} consumed or not
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
     * @returns {boolean}
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

        // only x overflow
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
     * @param {string} pdfUrl The URL of the PDF to load
     * @returns {void}
     * @protected
     */
    initViewer(pdfUrl) {
        super.initViewer(pdfUrl);
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE;
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

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
    * Binds DOM listeners for presentation viewer.
    *
    * @override
    * @returns {void}
    * @protected
    */
    bindDOMListeners() {
        super.bindDOMListeners();

        this.docEl.addEventListener('wheel', this.wheelHandler());
        if (Browser.isMobile()) {
            this.docEl.addEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.addEventListener('touchend', this.mobileScrollHandler);
        }
    }

    /**
    * Unbinds DOM listeners for presentation viewer.
    *
    * @override
    * @returns {void}
    * @protected
    */
    unbindDOMListeners() {
        super.unbindDOMListeners();

        this.docEl.removeEventListener('wheel', this.wheelHandler());
        if (Browser.isMobile()) {
            this.docEl.removeEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchend', this.mobileScrollHandler);
        }
    }

    /**
     * Adds event listeners for presentation controls
     *
     * @override
     * @returns {void}
     * @protected
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-exit-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-enter-zoom-in-icon', ICON_ZOOM_IN);

        this.controls.add(__('previous_page'), this.previousPage, 'box-preview-presentation-previous-page-icon box-preview-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'box-preview-doc-page-num', buttonContent);

        this.controls.add(__('next_page'), this.nextPage, 'box-preview-presentation-next-page-icon box-preview-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Handler for mobile scroll events.
     *
     * @returns {void}
     * @private
     */
    mobileScrollHandler(event) {
        if (this.checkOverflow() || !event.changedTouches || event.changedTouches.length === 0) {
            return;
        }

        if (event.type === 'touchstart') {
            this.scrollStart = event.changedTouches[0].clientY;
        } else {
            const scrollEnd = event.changedTouches[0].clientY;

            // scroll event offset prevents tapping from triggering a scroll
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
     * @returns {void}
     * @private
     */
    pagesinitHandler() {
        // We implement presentation mode by hiding other pages except for the first page
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
     * Mousewheel handler - scrolls presentations by page
     *
     * @returns {Function} Throttled mousewheel handler
     * @private
     */
    wheelHandler() {
        if (!this.throttledWheelHandler) {
            this.throttledWheelHandler = throttle((event) => {
                // Should not change pages if there is overflow, horizontal movement or a lack of vertical movement
                if (event.deltaY === -0 || event.deltaX !== -0 || this.checkOverflow()) {
                    return;
                }

                if (event.deltaY > 0) {
                    this.nextPage();
                } else if (event.deltaY < 0) {
                    this.previousPage();
                }
            }, WHEEL_THROTTLE);
        }

        return this.throttledWheelHandler;
    }
}


Box.Preview = Box.Preview || {};
Box.Preview.Presentation = Presentation;
global.Box = Box;
export default Presentation;
