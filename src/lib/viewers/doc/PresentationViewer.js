import throttle from 'lodash.throttle';
import DocBaseViewer from './DocBaseViewer';
import PresentationPreloader from './PresentationPreloader';
import { CLASS_INVISIBLE } from '../../constants';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT, ICON_ZOOM_IN, ICON_ZOOM_OUT } from '../../icons/icons';
import { getDistance } from '../../util';
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
        this.pagechangeHandler = this.pagechangeHandler.bind(this);
        this.throttledWheelHandler = this.getWheelHandler().bind(this);
    }

    /**
     * @inheritdoc
     */
    setup() {
        // Call super() to set up common layout
        super.setup();
        this.docEl.classList.add('bp-doc-presentation');

        // Set up preloader
        this.preloader = new PresentationPreloader(this.previewUI);
        this.preloader.addListener('preload', () => {
            this.options.logger.setPreloaded();
            this.resetLoadTimeout(); // Some content is visible - reset load timeout
        });
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
        [].forEach.call(pages, (pageEl) => {
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
        this.docEl.addEventListener('wheel', this.throttledWheelHandler);
        if (this.hasTouch) {
            this.docEl.addEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.addEventListener('touchmove', this.mobileScrollHandler);
            this.docEl.addEventListener('touchend', this.mobileScrollHandler);
        }

        super.bindDOMListeners();
    }

    /**
     * Unbinds DOM listeners for presentation viewer.
     *
     * @override
     * @return {void}
     * @protected
     */
    unbindDOMListeners() {
        this.docEl.removeEventListener('wheel', this.throttledWheelHandler);
        if (this.hasTouch) {
            this.docEl.removeEventListener('touchstart', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchmove', this.mobileScrollHandler);
            this.docEl.removeEventListener('touchend', this.mobileScrollHandler);
        }

        super.unbindDOMListeners();
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

        this.pageControls.add(this.pdfViewer.currentPageNumber, this.pdfViewer.pagesCount);

        this.controls.add(
            __('enter_fullscreen'),
            this.toggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN
        );
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
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
        pageEls.forEach((pageEl) => {
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
    pagechangeHandler(e) {
        this.setPage(e.pageNumber);
        super.pagechangeHandler(e);
    }

    /**
     * Returns throttled mousewheel handler
     *
     * @return {Function} Throttled wheel handler
     */
    getWheelHandler() {
        return throttle((event) => {
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

    /**
     * Setups pinch to zoom behavior by wrapping zoomed divs and determining the original pinch distance.
     *
     * @protected
     * @param {Event} event - object
     * @return {void}
     */
    pinchToZoomStartHandler(event) {
        if (this.isPinching || event.touches.length < 2) {
            return;
        }

        this.isPinching = true;
        event.preventDefault();
        event.stopPropagation();

        const firstVisiblePage = document.querySelector(`#bp-page-${this.pdfViewer.currentPageNumber}`);
        this.zoomWrapper = firstVisiblePage;

        this.originalDistance = getDistance(
            event.touches[0].pageX,
            event.touches[0].pageY,
            event.touches[1].pageX,
            event.touches[1].pageY
        );
    }

    /**
     * Updates the CSS transform zoom based on the distance of the pinch gesture.
     *
     * @protected
     * @param {Event} event - object
     * @return {void}
     */
    pinchToZoomEndHandler() {
        if (this.zoomWrapper && this.isPinching) {
            const firstVisiblePage = document.querySelector(`#bp-page-${this.pdfViewer.currentPageNumber}`);

            this.pdfViewer.currentScaleValue = this.pdfViewer.currentScale * this.pinchScale;
            this.zoomWrapper.style.transform = 'scale(1, 1)';

            const x = firstVisiblePage.offsetLeft + firstVisiblePage.clientWidth / 2 - this.docEl.clientWidth / 2;
            const y = firstVisiblePage.offsetTop + firstVisiblePage.clientHeight / 2 - this.docEl.clientHeight / 2;

            // Prevents scrolling to another page when zooming out
            if (this.checkOverflow()) {
                this.docEl.scroll(x, y);
            }

            this.pinchScale = 1;
            this.isPinching = false;
            this.originalDistance = 0;
        }
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
            const visible = [
                {
                    id: currentPageObj.id,
                    view: currentPageObj
                }
            ];

            return {
                first: currentPageObj,
                last: currentPageObj,
                views: visible
            };
        };
    }
}

export default PresentationViewer;
