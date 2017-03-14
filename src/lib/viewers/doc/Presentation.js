import autobind from 'autobind-decorator';
import throttle from 'lodash.throttle';
import pageNumTemplate from './pageNumButtonContent.html';
import Browser from '../../Browser';
import DocBase from './DocBase';
import { CLASS_INVISIBLE } from '../../constants';
import {
    ICON_DROP_DOWN,
    ICON_DROP_UP,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../icons/icons';
import './Presentation.scss';

const WHEEL_THROTTLE = 200;
const PADDING_OFFSET = 30;
const SCROLL_EVENT_OFFSET = 5;

@autobind
class Presentation extends DocBase {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();
        this.docEl.classList.add('bp-doc-presentation');
    }

    /**
     * Go to specified page. We implement presentation mode by hiding all pages
     * except for the page we are going to.
     *
     * @param {number} pageNum Page to navigate to
     * @return {void}
     */
    setPage(pageNum) {
        this.checkOverflow();

        // Hide all pages
        const pages = this.docEl.querySelectorAll('.page');
        [].forEach.call(pages, (pageEl) => {
            pageEl.classList.add(CLASS_INVISIBLE);
        });

        super.setPage(pageNum);

        // Show page we are navigating to
        const pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
        pageEl.classList.remove(CLASS_INVISIBLE);

        this.pdfViewer.update();
    }

    /**
     * Handles keyboard events for presentation viewer.
     *
     * @override
     * @param {string} key - Keydown key
     * @return {boolean} Consumed or not
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
        const page = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
        const hasXOverflow = page.clientWidth > doc.clientWidth;
        const hasYOverflow = page.clientHeight - PADDING_OFFSET > doc.clientHeight;

        doc.classList.remove('overflow-x');
        doc.classList.remove('overflow-y');

        if (hasXOverflow) {
            doc.classList.add('overflow-x');
        }

        if (hasYOverflow) {
            doc.classList.add('overflow-y');
        }

        return hasXOverflow || hasYOverflow;
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Loads PDF.js with provided PDF.
     *
     * @override
     * @param {string} pdfUrl The URL of the PDF to load
     * @return {void}
     * @protected
     */
    initViewer(pdfUrl) {
        super.initViewer(pdfUrl);
        this.overwritePdfViewerBehavior();
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
    * Binds DOM listeners for presentation viewer.
    *
    * @override
    * @return {void}
    * @protected
    */
    bindDOMListeners() {
        super.bindDOMListeners();

        this.docEl.addEventListener('wheel', this.wheelHandler());
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
    * @return {void}
    * @protected
    */
    unbindDOMListeners() {
        super.unbindDOMListeners();

        this.docEl.removeEventListener('wheel', this.wheelHandler());
        if (Browser.isMobile()) {
            this.docEl.removeEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchmove', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchend', this.mobileScrollHandler);
        }
    }

    /**
     * Adds event listeners for presentation controls
     *
     * @override
     * @return {void}
     * @protected
     */
    bindControlListeners() {
        super.bindControlListeners();

        this.controls.add(__('zoom_out'), this.zoomOut, 'bp-exit-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'bp-enter-zoom-in-icon', ICON_ZOOM_IN);

        this.controls.add(__('previous_page'), this.previousPage, 'bp-presentation-previous-page-icon bp-previous-page', ICON_DROP_UP);

        const buttonContent = pageNumTemplate.replace(/>\s*</g, '><'); // removing new lines
        this.controls.add(__('enter_page_num'), this.showPageNumInput, 'bp-doc-page-num', buttonContent);

        this.controls.add(__('next_page'), this.nextPage, 'bp-presentation-next-page-icon bp-next-page', ICON_DROP_DOWN);

        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Handler for mobile scroll events.
     *
     * @param {object} event - Scroll event
     * @return {void}
     */
    mobileScrollHandler(event) {
        // don't want to handle scroll if zoomed, if nothing has changed, or a touch move event which fixes intertia scroll bounce on iOS
        if (this.checkOverflow() || !event.changedTouches || event.changedTouches.length === 0 || event.type === 'touchmove') {
            event.preventDefault();
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
     * @private
     * @return {void}
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
     * Page change handler.
     *
     * @private
     * @return {void}
     */
    pagechangeHandler(e) {
        this.setPage(e.pageNumber);
        super.pagechangeHandler(e);
    }


    /**
     * Handles zoom logic around opening the find bar.
     *
     * @return {void}
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

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Overwrite some pdf_viewer.js behavior for presentations.
     *
     * @private
     * @return {void}
     */
    overwritePdfViewerBehavior() {
        // Overwrite scrollPageIntoView for presentations since we have custom pagination behavior
        this.pdfViewer.scrollPageIntoView = (pageObj) => {
            let pageNum = pageObj;
            if (typeof pageNum !== 'number') {
                pageNum = pageObj.pageNumber || 1;
            }

            this.setPage(pageNum);
        };

        // Overwrite _getVisiblePages for presentations to always calculate instead of fetching visible
        // elements since we lay out presentations differently
        this.pdfViewer._getVisiblePages = () => {
            const currentPageObj = this.pdfViewer._pages[this.pdfViewer._currentPageNumber - 1];
            const visible = [{
                id: currentPageObj.id,
                view: currentPageObj
            }];

            return {
                first: currentPageObj,
                last: currentPageObj,
                views: visible
            };
        };
    }
}

export default Presentation;
