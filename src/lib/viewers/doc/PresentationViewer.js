import throttle from 'lodash/throttle';
import DocBaseViewer from './DocBaseViewer';
import PresentationPreloader from './PresentationPreloader';
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

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Initialize pdf.js viewer.
     *
     * @protected
     * @override
     * @return {pdfjsViewer.PDFViewer} PDF viewer type
     */
    initPdfViewer() {
        return this.initPdfViewerClass(this.pdfjsViewer.PDFSinglePageViewer);
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
}

export default PresentationViewer;
