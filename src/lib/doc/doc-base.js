import autobind from 'autobind-decorator';
import Base from '../base';
import Browser from '../browser';
import Controls from '../controls';
import DocAnnotator from './doc-annotator';
import fullscreen from '../fullscreen';
import { createAssetUrlCreator, decodeKeydown } from '../util';

const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
const PRESENTATION_MODE_STATE = {
    UNKNOWN: 0,
    NORMAL: 1,
    CHANGING: 2,
    FULLSCREEN: 3
};
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;

@autobind
class DocBase extends Base {

    /**
     * @constructor
     * @param {string|HTMLElement} container Container node
     * @param {object} [options] Some options
     */
    constructor(container, options) {
        super(container, options);
        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('box-preview-doc');

        this.viewerEl = this.docEl.appendChild(document.createElement('div'));
        this.viewerEl.classList.add('pdfViewer');
        this.loadTimeout = 60000;
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        // Remove object event listeners
        fullscreen.removeListener('enter', this.enterfullscreenHandler);
        fullscreen.removeListener('exit', this.exitfullscreenHandler);

        // Clean up print blob
        this.printBlob = null;

        // Remove DOM event listeners
        if (this.docEl) {
            this.docEl.removeEventListener('pagesinit', this.pagesinitHandler);
            this.docEl.removeEventListener('pagerendered', this.pagerenderedHandler);
            this.docEl.removeEventListener('pagechange', this.pagechangeHandler);
            this.docEl.removeEventListener('textlayerrendered', this.textlayerrenderedHandler);
        }

        // Destroy the controls
        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.destroy();
        }

        // Clean up viewer and PDF document object
        if (this.pdfViewer) {
            this.pdfViewer.cleanup();

            if (this.pdfViewer.pdfDocument) {
                this.pdfViewer.pdfDocument.destroy();
            }
        }

        super.destroy();
    }

    /**
     * Loads a document.
     *
     * @public
     * @param {String} pdfUrl The pdf to load
     * @returns {Promise} Promise to load a pdf
     */
    load(pdfUrl) {
        // Disable worker in IE and Edge due to a CORS origin bug: https://goo.gl/G9iR54
        if (Browser.getName() === 'Edge' || Browser.getName() === 'Explorer') {
            PDFJS.disableWorker = true;
        }

        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        const pdfWorkerUrl = assetUrlCreator('third-party/doc/pdf.worker.js');
        PDFJS.workerSrc = pdfWorkerUrl;

        const pdfCMapBaseURI = `${this.options.location.staticBaseURI}third-party/doc/cmaps/`;
        PDFJS.cMapUrl = pdfCMapBaseURI;
        PDFJS.cMapPacked = true;
        PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK; // Open links in new tab

        // Disable range requests for files smaller than 2MB
        PDFJS.disableRange = this.options.file.size < 2097152;

        this.initViewer(pdfUrl);
        this.initPrint(pdfUrl);

        super.load();
    }

    /**
     * Prints the document by providing the PDF representation to the user.
     *
     * @returns {void}
     */
    print() {
        if (!this.printBlob) {
            // @TODO(tjin): Show a message here that the document isn't ready for printing
            return;
        }

        // For IE & Edge, use the open or save dialog since we can't open
        // in a new tab due to security restrictions, see:
        // http://stackoverflow.com/questions/24007073/open-links-made-by-createobjecturl-in-ie11
        if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
            window.navigator.msSaveOrOpenBlob(this.printBlob, 'print.pdf');

        // For other browsers, open in a new tab
        } else {
            const printURL = URL.createObjectURL(this.printBlob);
            window.open(printURL);
            URL.revokeObjectURL(printURL);
        }
    }

    /**
     * Re-sizing logic.
     *
     * @public
     * @returns {void}
     */
    resize() {
        this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue || 'auto';
        this.pdfViewer.update();

        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(this.pdfViewer.currentScale);
            this.annotator.needToReRender = true;
        }
    }

    /**
     * Go to previous page
     *
     * @public
     * @returns {void}
     */
    previousPage() {
        this.setPage(this.pdfViewer.currentPageNumber - 1);
    }

    /**
     * Go to next page
     *
     * @public
     * @returns {void}
     */
    nextPage() {
        this.setPage(this.pdfViewer.currentPageNumber + 1);
    }

    /**
     * Go to specified page
     *
     * @param {number} pageNum Page to navigate to
     * @public
     * @returns {void}
     */
    setPage(pageNum) {
        this.pdfViewer.currentPageNumber = pageNum;
        this.checkPaginationButtons();
    }

    /**
     * Disables or enables previous/next pagination buttons depending on
     * current page number.
     *
     * @returns {void}
     */
    checkPaginationButtons() {
        const pagesCount = this.pdfViewer.pagesCount;
        const currentPageNum = this.pdfViewer.currentPageNumber;
        const pageNumButtonEl = this.containerEl.querySelector('.box-preview-doc-page-num');
        const previousPageButtonEl = this.containerEl.querySelector('.box-preview-previous-page');
        const nextPageButtonEl = this.containerEl.querySelector('.box-preview-next-page');

        // Disable page number selector for Safari fullscreen, see https://jira.inside-box.net/browse/COXP-997
        const isSafariFullscreen = Browser.getName() === 'Safari' && fullscreen.isFullscreen();

        // Disable page number selector if there is only one page or less
        if (pagesCount <= 1 || isSafariFullscreen) {
            pageNumButtonEl.disabled = true;
        } else {
            pageNumButtonEl.disabled = false;
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
            if (currentPageNum === this.pdfViewer.pagesCount) {
                nextPageButtonEl.disabled = true;
            } else {
                nextPageButtonEl.disabled = false;
            }
        }
    }

    /**
     * Zoom into document.
     *
     * @param {Number} ticks Number of times to zoom in
     * @returns {void}
     */
    zoomIn(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.ceil(newScale * 10) / 10;
            newScale = Math.min(MAX_SCALE, newScale);
        } while (--numTicks > 0 && newScale < MAX_SCALE);

        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(newScale);
            this.annotator.needToReRender = true;
        }

        this.pdfViewer.currentScaleValue = newScale;
    }

    /**
     * Zoom out of document.
     *
     * @param {Number} ticks Number of times to zoom out
     * @returns {void}
     */
    zoomOut(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.floor(newScale * 10) / 10;
            newScale = Math.max(MIN_SCALE, newScale);
        } while (--numTicks > 0 && newScale > MIN_SCALE);

        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(newScale);
            this.annotator.needToReRender = true;
        }

        this.pdfViewer.currentScaleValue = newScale;
    }

    /**
     * Rotates documents by delta degrees
     *
     * @param {number} delta Degrees to rotate
     * @public
     * @returns {void}
     */
    rotateLeft(delta = -90) {
        const currentPageNum = this.pdfViewer.currentPageNumber;

        // Calculate and set rotation
        this.pageRotation = this.pageRotation || 0;
        this.pageRotation = (this.pageRotation + 360 + delta) % 360;
        this.pdfViewer.pagesRotation = this.pageRotation;

        // Re-render and scroll to appropriate page
        this.pdfViewer.update();
        this.setPage(currentPageNum);
    }

    /**
     * Enters or exits fullscreen
     *
     * @public
     * @returns {void}
     */
    toggleFullscreen() {
        // Need to save current page number and restore once fullscreen
        // animation is complete
        this.currentPageNum = this.pdfViewer.currentPageNumber;

        super.toggleFullscreen();
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.CHANGING;
    }

    /**
     * Returns whether or not viewer is annotatable.
     *
     * @public
     * @returns {Boolean} Whether or not viewer is annotatable
     */
    isAnnotatable() {
        const viewerName = this.options.viewerName;
        return this.options.viewers && this.options.viewers[viewerName] &&
            this.options.viewers[viewerName].annotations;
    }

    /**
     * Returns click handler for toggling point annotation mode.
     *
     * @public
     * @returns {Function|null} Click handler
     */
    getPointAnnotationClickHandler() {
        if (!this.isAnnotatable()) {
            return null;
        }

        return this.annotator.togglePointAnnotationModeHandler;
    }

    /* ----- Private Helpers ----- */

    /**
     * Loads PDF.js with provided PDF
     *
     * @private
     * @param {String} pdfUrl The URL of the PDF to load
     * @returns {void}
     */
    initViewer(pdfUrl) {
        // Initialize PDF.js in container
        this.pdfViewer = new PDFJS.PDFViewer({
            container: this.docEl
        });

        // Load PDF from representation URL
        PDFJS.getDocument({
            url: pdfUrl,
            httpHeaders: this.appendAuthHeader(),
            rangeChunkSize: 524288 // 512KB chunk size
        }).then((doc) => {
            this.pdfViewer.setDocument(doc);
        }).catch((err) => {
            /*eslint-disable*/
            console.error(err);
            console.error(err.message);
            /*eslint-enable*/
            this.emit('error', err.message);
        });

        // When page structure is initialized, set default zoom and load controls
        this.docEl.addEventListener('pagesinit', this.pagesinitHandler);

        // When first page is rendered, message that preview has loaded
        this.docEl.addEventListener('pagerendered', this.pagerenderedHandler);

        // When text layer is rendered, show annotations if enabled
        this.docEl.addEventListener('textlayerrendered', this.textlayerrenderedHandler);

        // Update page number when page changes
        this.docEl.addEventListener('pagechange', this.pagechangeHandler);

        // Mousedown and mouseup handler to enable and disable text selection
        this.docEl.addEventListener('mousedown', this.mousedownHandler);
        this.docEl.addEventListener('mouseup', this.mouseupHandler);
    }

    /**
     * Initialize variables and elements for printing
     *
     * @param {String} pdfUrl The URL of the PDF to load
     * @returns {void}
     */
    initPrint(pdfUrl) {
        // @TODO(tjin): Can we re-use the same blob used by PDF.js to render the content?
        // Load blob for printing
        fetch(pdfUrl, {
            headers: this.appendAuthHeader()
        })
        .then((response) => response.blob())
        .then((blob) => {
            this.printBlob = blob;
        });

        const printNotificationEl = document.createElement('p');
        printNotificationEl.classList.add('box-preview-print-notification');
        printNotificationEl.textContent = __('print_notification');
        this.containerEl.appendChild(printNotificationEl);
    }

    /**
     * Creates UI for preview controls.
     *
     * @private
     * @returns {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);

        this.addEventListenersForDocControls();
        this.addEventListenersForDocElement();

        this.initPageNumEl();
    }

    /**
     * Initializes annotations
     *
     * @private
     * @returns {void}
     */
    initAnnotations() {
        const fileID = this.options.file.id;
        this.annotator = new DocAnnotator(fileID);
        this.annotator.setScale(this.pdfViewer.currentScale);
        this.annotator.init();
    }

    /**
     * Initializes page number selector
     *
     * @private
     * @returns {void}
     */
    initPageNumEl() {
        const pageNumEl = this.controls.controlsEl.querySelector('.box-preview-doc-page-num');

        // Update total page number
        const totalPageEl = pageNumEl.querySelector('.box-preview-doc-total-pages');
        totalPageEl.textContent = this.pdfViewer.pagesCount;

        // Keep reference to page number input and current page elements
        this.pageNumInputEl = pageNumEl.querySelector('.box-preview-doc-page-num-input');
        this.currentPageEl = pageNumEl.querySelector('.box-preview-doc-current-page');
    }

    /**
     * Adds event listeners for document controls
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocControls() {
        // overriden
    }

    /**
     * Adds event listeners for document element
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocElement() {
        fullscreen.addListener('enter', this.enterfullscreenHandler);
        fullscreen.addListener('exit', this.exitfullscreenHandler);
    }

	/**
	 * Replaces the page number display with an input box that allows the user to type in a page number
     *
     * @private
	 * @returns {void}
	 */
    showPageNumInput() {
        // show the input box with the current page number selected within it
        this.controls.controlsEl.classList.add(SHOW_PAGE_NUM_INPUT_CLASS);

        this.pageNumInputEl.value = this.currentPageEl.textContent;
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
	 * @returns {void}
	 */
    hidePageNumInput() {
        this.controls.controlsEl.classList.remove(SHOW_PAGE_NUM_INPUT_CLASS);
        this.pageNumInputEl.removeEventListener('blur', this.pageNumInputBlurHandler);
        this.pageNumInputEl.removeEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
     * Update page number in page control widget
     *
     * @param {number} pageNum Nubmer of page to update to
     * @private
     * @returns {void}
     */
    updateCurrentPage(pageNum) {
        let truePageNum = pageNum;
        const pagesCount = this.pdfViewer.pagesCount;

        // refine the page number to fall within bounds
        if (pageNum > pagesCount) {
            truePageNum = pagesCount;
        } else if (pageNum < 1) {
            truePageNum = 1;
        }

        if (this.pageNumInputEl) {
            this.pageNumInputEl.value = truePageNum;
        }

        if (this.currentPageEl) {
            this.currentPageEl.textContent = truePageNum;
        }
    }

    /* ----- Event Handlers ----- */
    /**
     * Handles keyboard events for document viewer.
     *
     * @private
     * @param {String} key keydown key
     * @returns {Boolean} consumed or not
     */
    onKeydown(key) {
        switch (key) {
            case 'ArrowLeft':
                this.previousPage();
                break;
            case 'ArrowRight':
                this.nextPage();
                break;
            case '[':
                this.previousPage();
                break;
            case ']':
                this.nextPage();
                break;
            default:
                return false;
        }

        return true;
    }

    /**
     * Handler for 'pagesinit' event
     *
     * @private
     * @returns {void}
     */
    pagesinitHandler() {
        // Directly call _setScale so we can choose to set the second param,
        // noScroll to true - this keeps the padding at the top of the first
        // page
        this.pdfViewer._setScale('auto', true);

        // Initialize annotations before loading controls since there are
        // annotations controls
        // @TODO maybe this should move out to individual viewers
        if ((this.options.viewers.Document && this.options.viewers.Document.annotations) ||
            (this.options.viewers.Presentation && this.options.viewers.Presentation.annotations)) {
            this.initAnnotations();
        }

        if (this.options.ui !== false) {
            this.loadUI();
        }

        this.checkPaginationButtons();
    }

    /**
     * Handler for 'pagerendered' event
     *
     * @private
     * @returns {void}
     */
    pagerenderedHandler() {
        if (this.annotator && this.annotator.needToReRender) {
            this.annotator.renderAnnotations();
            this.annotator.needToReRender = false;
        }

        if (this.loaded) {
            return;
        }

        this.loaded = true;
        this.emit('load');
    }

    /**
     * Handler for 'textlayerrendered' event
     *
     * @private
     * @returns {void}
     */
    textlayerrenderedHandler() {
        if (!this.annotator || this.annotationsLoaded) {
            return;
        }

        // Show existing annotations after text layer is rendered
        this.annotator.showAnnotations();
        this.annotationsLoaded = true;
    }

    /**
     * Handler for 'pagechange' event
     *
     * @param {Event} event Pagechange event
     * @private
     * @returns {void}
     */
    pagechangeHandler(event) {
        const pageNum = event.pageNumber;
        this.updateCurrentPage(pageNum);
    }

    /**
	 * Blur handler for page number input
	 *
	 * @param  {Event} event Blur event
     * @private
	 * @returns {void}
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
	 * Keydown handler for page number input
	 *
	 * @param {Event} event Keydown event
     * @private
	 * @returns {void}
	 */
    pageNumInputKeydownHandler(event) {
        const key = decodeKeydown(event);

        switch (key) {
            case 'Enter':
                this.pageNumInputBlurHandler(event);
                break;

            case 'Esc':
                this.hidePageNumInput();

                event.preventDefault();
                event.stopPropagation();
                break;

            default:
                return;
        }
    }

    /**
     * Fullscreen entered handler. Add presentation mode class, set
     * presentation mode state, and set zoom to fullscreen zoom.
     *
     * @private
     * @returns {void}
     */
    enterfullscreenHandler() {
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.FULLSCREEN;
        this.pdfViewer.currentScaleValue = 'page-fit';

        // Restore current page if needed
        if (this.currentPageNum) {
            this.setPage(this.currentPageNum);
        }
    }

    /**
     * Fullscreen exited handler. Remove presentation mode class, set
     * presentation mode state, and reset zoom.
     *
     * @private
     * @returns {void}
     */
    exitfullscreenHandler() {
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.NORMAL;
        this.pdfViewer.currentScaleValue = 'auto';

        // Restore current page if needed
        if (this.currentPageNum) {
            this.setPage(this.currentPageNum);
        }
    }
}

export default DocBase;
