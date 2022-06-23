import throttle from 'lodash/throttle';
import DocBaseViewer from './DocBaseViewer';
import PresentationPreloader from './PresentationPreloader';
import { CLASS_INVISIBLE } from '../../constants';
import { getProp } from '../../util';
import './Presentation.scss';

const WHEEL_THROTTLE = 200;
const PADDING_OFFSET = 30;
const SCROLL_EVENT_OFFSET = 5;

class PresentationViewer extends DocBaseViewer {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for callbacks
        this.mobileScrollHandler = this.mobileScrollHandler.bind(this);
        this.pagesinitHandler = this.pagesinitHandler.bind(this);
        this.pagechangingHandler = this.pagechangingHandler.bind(this);
        this.throttledWheelHandler = this.getWheelHandler().bind(this);
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
        this.docEl.classList.add('bp-doc-presentation');

        // Set up preloader
        this.preloader = new PresentationPreloader(this.previewUI, { api: this.api });
        this.preloader.addListener('preload', this.onPreload.bind(this));
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
        this.preloader.removeAllListeners('preload');
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
        [].forEach.call(pages, pageEl => {
            pageEl.classList.add(CLASS_INVISIBLE);
        });

        super.setPage(pageNum);

        // Show page we are navigating to
        const pageEl = this.docEl.querySelector(`[data-page-number="${this.pdfViewer.currentPageNumber}"]`);
        pageEl.classList.remove(CLASS_INVISIBLE);

        // Force page to be rendered - this is needed because the presentation
        // DOM layout can trick pdf.js into thinking that this page is not visible
        this.pdfViewer.update();
    }

    /**
     * Handles keyboard events for presentation viewer.
     *
     * @override
     * @param {string} key - Keydown key
     * @return {boolean} Consumed or not
     */
    onKeydown(key, event) {
        if (key === 'ArrowUp') {
            this.previousPage();
            return true;
        }
        if (key === 'ArrowDown') {
            this.nextPage();
            return true;
        }

        return super.onKeydown(key, event);
    }

    /**
     * Determines if the document has overflow and adjusts the CSS accordingly.
     *
     * @return {boolean} Whether there is overflow or not
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

    /**
     * @override
     */
    handleScrollToAnnotation(data) {
        const targetPage = getProp(data, 'target.location.value', 1);

        if (this.pdfViewer.currentPageNumber !== targetPage) {
            this.setPage(targetPage);
        }

        super.handleScrollToAnnotation(data);
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

        this.docEl.addEventListener('wheel', this.throttledWheelHandler);
        if (this.hasTouch) {
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

        this.docEl.removeEventListener('wheel', this.throttledWheelHandler);
        if (this.hasTouch) {
            this.docEl.removeEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchmove', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchend', this.mobileScrollHandler);
        }
    }

    /**
     * Handler for mobile scroll events.
     *
     * @param {Object} event - Scroll event
     * @return {void}
     */
    mobileScrollHandler(event) {
        if (this.checkOverflow() || this.isPinching || event.touches.length > 1) {
            return;
        }

        if (event.type === 'touchstart') {
            this.scrollStart = event.changedTouches[0].clientY;
        } else if (event.type === 'touchmove') {
            event.preventDefault();
        } else {
            const scrollEnd = event.changedTouches[0].clientY;

            if (!this.scrollStart || !scrollEnd) {
                return;
            }

            // scroll event offset prevents tapping from triggering a scroll
            if (this.scrollStart > scrollEnd + SCROLL_EVENT_OFFSET) {
                this.nextPage();
            } else if (this.scrollStart < scrollEnd - SCROLL_EVENT_OFFSET) {
                this.previousPage();
            }

            this.scrollStart = null;
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
        pageEls.forEach(pageEl => {
            if (pageEl.getAttribute('data-page-number') === '1') {
                return;
            }

            pageEl.classList.add(CLASS_INVISIBLE);
        });

        super.pagesinitHandler();

        // Initially scale the page to fit. This will change to auto on resize events.
        this.pdfViewer.currentScaleValue = 'page-fit';
    }

    /**
     * Page change handler.
     *
     * @private
     * @param {event} e - Page change event
     * @return {void}
     */
    pagechangingHandler(e) {
        this.setPage(e.pageNumber);
        super.pagechangingHandler(e);
    }

    /**
     * Returns throttled mousewheel handler
     *
     * @return {Function} Throttled wheel handler
     */
    getWheelHandler() {
        return throttle(event => {
            // Should not change pages if there is overflow, horizontal movement or a lack of vertical movement
            if (event.deltaY === 0 || event.deltaX !== 0 || this.checkOverflow()) {
                return;
            }

            if (event.deltaY > 0) {
                this.nextPage();
            } else if (event.deltaY < 0) {
                this.previousPage();
            }
        }, WHEEL_THROTTLE);
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
        // This override is needed to allow PDF.js to change pages when clicking on links in a presentation that
        // navigate to other pages
        this.pdfViewer.scrollPageIntoView = pageObj => {
            if (!this.loaded) {
                return;
            }

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
            const visible = [
                {
                    id: currentPageObj.id,
                    view: currentPageObj,
                },
            ];

            return {
                first: currentPageObj,
                ids: new Set([currentPageObj.id]),
                last: currentPageObj,
                views: visible,
            };
        };
    }
}

export default PresentationViewer;
