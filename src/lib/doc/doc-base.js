/**
 * @fileoverview Base document viewer class. The document and presentation
 * viewers extend this class.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import LocalStorageAnnotationService from '../annotation/localstorage-annotation-service';
import Base from '../base';
import Browser from '../browser';
import cache from '../cache';
import Controls from '../controls';
import DocAnnotator from './doc-annotator';
import fullscreen from '../fullscreen';
import { createAssetUrlCreator, decodeKeydown } from '../util';
import findBarTemplate from 'raw!./pdf-find-bar.html';
import PDFFindBar from './pdf-find-bar';

const CURRENT_PAGE_MAP_KEY = 'doc-current-page-map';
const DEFAULT_SCALE_DELTA = 1.1;
const DOCUMENT_VIEWER_NAME = 'Document';
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const PRESENTATION_MODE_STATE = {
    UNKNOWN: 0,
    NORMAL: 1,
    CHANGING: 2,
    FULLSCREEN: 3
};
const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';

@autobind
class DocBase extends Base {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container Container node
     * @param {object} [options] Some options
     * @returns {DocBase} DocBase instance
     */
    constructor(container, options) {
        super(container, options);
        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('box-preview-doc');

        this.viewerEl = this.docEl.appendChild(document.createElement('div'));
        this.viewerEl.classList.add('pdfViewer');
        this.loadTimeout = 60000;

        this.createFindBar(container);
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        this.unbindDOMListeners();

        // Clean up print blob
        this.printBlob = null;

        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        // Destroy the find bar and controller
        if (this.findBar) {
            this.findBar.destroy();
        }

        if (this.findController.findBar) {
            this.findController.findBar.destroy();
        }

        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.removeAllListeners('pointmodeenter');
            this.annotator.removeAllListeners('pointmodeexit');
            this.annotator.destroy();
        }

        // Clean up viewer and PDF document object
        if (this.pdfViewer) {
            this.pdfViewer.cleanup();

            if (this.pdfViewer.pdfDocument) {
                this.pdfViewer.pdfDocument.destroy();
            }

            if (this.pdfViewer.findController.findBar) {
                this.pdfViewer.findController.findBar.destroy();
            }
        }

        super.destroy();
    }

    /**
     * Loads a document.
     *
     * @param {String} pdfUrl The pdf to load
     * @returns {Promise} Promise to load a pdf
     */
    load(pdfUrl) {
        // Disable worker in IE and Edge due to a CORS origin bug: https://goo.gl/G9iR54
        if (Browser.getName() === 'Edge' || Browser.getName() === 'Explorer') {
            PDFJS.disableWorker = true;
        }

        this.setupPdfjs();
        this.initViewer(pdfUrl);
        this.initPrint(pdfUrl);
        this.initFindController();

        super.load();
    }

    createFindBar(container) {
        this.headerEl = container.firstChild;

        this.findBarEl = this.headerEl.appendChild(document.createElement('div'));
        this.findBarEl.classList.add('findbar');
        this.findBarEl.setAttribute('id', 'findbar');
        this.findBarEl.innerHTML = findBarTemplate;

        this.findField = document.getElementById('findField');

        // todo(@spramod) figure out how to get findField to not overflow when trying to find REALLY long text that would take up the entire find bar
        this.findResultsCount = document.getElementById('findResultsCount');
    }

    initFindController() {
        this.findController = new PDFFindController({
            pdfViewer: this.pdfViewer,
            integratedFind: false
        });
        this.pdfViewer.setFindController(this.findController);

        this.findBar = new PDFFindBar(this.containerEl, {
            bar: this.findBarEl,
            findField: this.findField,
            findResultsCount: this.findResultsCount,
            findController: this.findController
        });

        this.findController.setFindBar(this.findBar);
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
            this._reRenderAnnotations = true;
        }

        super.resize();
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
        this.cachePage(this.pdfViewer.currentPageNumber);
    }

    /**
     * Gets the cached current page.
     *
     * @returns {Number} Current page
     */
    getCachedPage() {
        let page = 1;

        if (cache.has(CURRENT_PAGE_MAP_KEY)) {
            const currentPageMap = cache.get(CURRENT_PAGE_MAP_KEY);
            page = currentPageMap[this.options.file.sha1] || page;
        }

        return page;
    }

    /**
     * Sets the current page into localstorage if available. Otherwise saves
     * it in-memory as a property on the document viewer.
     *
     * @param {Number} page Current page
     * @returns {void}
     */
    cachePage(page) {
        let currentPageMap = {};
        if (cache.has(CURRENT_PAGE_MAP_KEY)) {
            currentPageMap = cache.get(CURRENT_PAGE_MAP_KEY);
        }

        currentPageMap[this.options.file.sha1] = page;
        cache.set(CURRENT_PAGE_MAP_KEY, currentPageMap, true /* useLocalStorage */);
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

        this.setScale(newScale);
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

        this.setScale(newScale);
    }

    /**
     * Sets zoom scale.
     *
     * @param {Number} scale Numerical zoom scale
     * @returns {void}
     */
    setScale(scale) {
        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(scale);
            this._reRenderAnnotations = true;
        }

        this.pdfViewer.currentScaleValue = scale;
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
     * Enters or exits fullscreen.
     *
     * @returns {void}
     */
    toggleFullscreen() {
        super.toggleFullscreen();
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.CHANGING;
    }

    /**
     * Returns whether or not viewer is annotatable with the provided annotation
     * type.
     *
     * @param {String} type Type of annotation
     * @returns {Boolean} Whether or not viewer is annotatable
     */
    isAnnotatable(type) {
        if (type !== 'point' && type !== 'highlight') {
            return false;
        }

        const viewerName = this.options.viewerName;
        return this.options.viewers && this.options.viewers[viewerName] &&
            this.options.viewers[viewerName].annotations;
    }

    /**
     * Returns click handler for toggling point annotation mode.
     *
     * @returns {Function|null} Click handler
     */
    getPointModeClickHandler() {
        if (!this.isAnnotatable('point')) {
            return null;
        }

        return this.annotator.togglePointModeHandler;
    }

    /**
     * Returns click handler for toggling highlight annotation mode.
     *
     * @returns {Function|null} Click handler
     */
    getHighlightModeClickHandler() {
        if (!this.isAnnotatable('highlight')) {
            return null;
        }

        return this.annotator.toggleHighlightModeHandler;
    }

    /**
     * Handles keyboard events for document viewer.
     *
     * @param {String} key keydown key
     * @returns {Boolean} consumed or not
     */
    onKeydown(key) {
        const isDocument = this.options.viewerName === DOCUMENT_VIEWER_NAME;

        switch (key) {
            case 'ArrowLeft':
                this.previousPage();
                break;
            case 'ArrowRight':
                this.nextPage();
                break;

            // Only navigate pages with up/down in document viewer if in fullscreen
            case 'ArrowUp':
                if (isDocument && !fullscreen.isFullscreen()) {
                    return false;
                }

                this.previousPage();
                break;
            case 'ArrowDown':
                if (isDocument && !fullscreen.isFullscreen()) {
                    return false;
                }

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

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets options for PDF.js.
     *
     * @returns {void}
     * @private
     */
    setupPdfjs() {
        // Set PDFJS worker & character maps
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        PDFJS.workerSrc = assetUrlCreator('third-party/doc/pdf.worker.js');
        PDFJS.cMapUrl = `${this.options.location.staticBaseURI}third-party/doc/cmaps/`;
        PDFJS.cMapPacked = true;

        // Open links in new tab
        PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK;

        // Disable range requests for files smaller than 2MB
        PDFJS.disableRange = this.options.file && this.options.file.size ?
            this.options.file.size < 2097152 :
            false;

        // Disable text layer if user doesn't have download permissions
        PDFJS.disableTextLayer = this.options.file && this.options.file.permissions ?
            !this.options.file.permissions.can_download :
            false;
    }

    /**
     * Loads PDF.js with provided PDF.
     *
     * @param {String} pdfUrl The URL of the PDF to load
     * @returns {void}
     * @private
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

        this.bindDOMListeners();
    }

    /**
     * Initialize variables and elements for printing.
     *
     * @param {String} pdfUrl The URL of the PDF to load
     * @returns {void}
     * @private
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
     * @returns {void}
     * @private
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.bindControlListeners();
        this.initPageNumEl();
    }

    /**
     * Initializes annotations.
     *
     * @returns {void}
     * @private
     */
    initAnnotations() {
        const fileVersionID = this.options.file.file_version.id;
        const annotationService = new LocalStorageAnnotationService({
            api: this.options.api,
            token: this.options.token
        });

        // Construct and init annotator
        this.annotator = new DocAnnotator({
            annotatedElement: this.docEl,
            annotationService,
            fileVersionID
        });
        this.annotator.init();
        this.annotator.setScale(this.pdfViewer.currentScale);

        // Disable controls during point annotation mode
        this.annotator.addListener('pointmodeenter', () => {
            if (this.controls) {
                this.controls.disable();
            }
        });

        this.annotator.addListener('pointmodeexit', () => {
            if (this.controls) {
                this.controls.enable();
            }
        });
    }

    /**
     * Initializes page number selector.
     *
     * @returns {void}
     * @private
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
	 * Replaces the page number display with an input box that allows the user to type in a page number
     *
	 * @returns {void}
     * @private
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
	 * @returns {void}
     * @private
	 */
    hidePageNumInput() {
        this.controls.controlsEl.classList.remove(SHOW_PAGE_NUM_INPUT_CLASS);
        this.pageNumInputEl.removeEventListener('blur', this.pageNumInputBlurHandler);
        this.pageNumInputEl.removeEventListener('keydown', this.pageNumInputKeydownHandler);
    }

    /**
     * Update page number in page control widget.
     *
     * @param {number} pageNum Nubmer of page to update to
     * @returns {void}
     * @private
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

        this.checkPaginationButtons();
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Binds DOM listeners for document viewer.
     *
     * @returns {void}
     * @private
     */
    bindDOMListeners() {
        // When page structure is initialized, set default zoom and load controls
        this.docEl.addEventListener('pagesinit', this.pagesinitHandler);

        // When first page is rendered, message that preview has loaded
        this.docEl.addEventListener('pagerendered', this.pagerenderedHandler);

        // When text layer is rendered, show annotations if enabled
        this.docEl.addEventListener('textlayerrendered', this.textlayerrenderedHandler);

        // Update page number when page changes
        this.docEl.addEventListener('pagechange', this.pagechangeHandler);

        // Mousewheel handler
        this.docEl.addEventListener('wheel', this.wheelHandler);

        // Fullscreen
        fullscreen.addListener('enter', this.enterfullscreenHandler);
        fullscreen.addListener('exit', this.exitfullscreenHandler);
    }

    /**
     * Unbinds DOM listeners for document viewer.
     *
     * @returns {void}
     * @private
     */
    unbindDOMListeners() {
        if (this.docEl) {
            this.docEl.removeEventListener('pagesinit', this.pagesinitHandler);
            this.docEl.removeEventListener('pagerendered', this.pagerenderedHandler);
            this.docEl.removeEventListener('pagechange', this.pagechangeHandler);
            this.docEl.removeEventListener('textlayerrendered', this.textlayerrenderedHandler);
            this.docEl.removeEventListener('wheel', this.wheelHandler);
        }

        fullscreen.removeListener('enter', this.enterfullscreenHandler);
        fullscreen.removeListener('exit', this.exitfullscreenHandler);
    }

    /**
     * Binds listeners for document controls. Overridden.
     *
     * @returns {void}
     * @private
     */
    bindControlListeners() {}

    /**
	 * Blur handler for page number input.
     *
	 * @param  {Event} event Blur event
	 * @returns {void}
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
	 * @param {Event} event Keydown event
	 * @returns {void}
     * @private
	 */
    pageNumInputKeydownHandler(event) {
        const key = decodeKeydown(event);

        switch (key) {
            case 'Enter':
                // We normally trigger the blur handler by blurring the input
                // field, but this doesn't work for IE in fullscreen. For IE,
                // we blur the page behind the controls - this unfortunately
                // is an IE-only solution that doesn't work with other browsers
                if (Browser.getName() === 'Explorer') {
                    this.docEl.focus();
                } else {
                    event.target.blur();
                }

                event.stopPropagation();
                event.preventDefault();
                break;

            case 'Esc':
                this.hidePageNumInput();
                this.docEl.focus();

                event.stopPropagation();
                event.preventDefault();
                break;
            case 'Meta+F':
            case 'Control+F':
            // case 'Meta+G':
            // case 'Control+G':
                // todo(@spramod) make sure to make this OS compatible so like CTRL+F for windows, etc
                this.findBar.open();
                break;
            default:
                return;
        }
    }

    /**
     * Handler for 'pagesinit' event.
     *
     * @returns {void}
     * @private
     */
    pagesinitHandler() {
        this.pdfViewer.currentScaleValue = 'auto';

        // Initialize annotations before other UI
        // @TODO maybe this should move out to individual viewers
        if ((this.options.viewers.Document && this.options.viewers.Document.annotations) ||
            (this.options.viewers.Presentation && this.options.viewers.Presentation.annotations)) {
            this.initAnnotations();
        }

        if (this.options.ui !== false) {
            this.loadUI();
        }

        this.checkPaginationButtons();

        // Set current page to previously opened page or first page
        this.setPage(this.getCachedPage());
    }

    /**
     * Handler for 'pagerendered' event.
     *
     * @returns {void}
     * @private
     */
    pagerenderedHandler() {
        if (this.annotator && this._reRenderAnnotations) {
            this.annotator.renderAnnotations();
            this._reRenderAnnotations = false;
        }

        if (this.loaded) {
            return;
        }

        this.loaded = true;
        this.emit('load');
    }

    /**
     * Handler for 'textlayerrendered' event.
     *
     * @returns {void}
     * @private
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
     * Handler for 'pagechange' event.
     *
     * @param {Event} event Pagechange event
     * @returns {void}
     * @private
     */
    pagechangeHandler(event) {
        const pageNum = event.pageNumber;
        this.updateCurrentPage(pageNum);

        // We only set cache the current page if 'pagechange' was fired after
        // preview is loaded - this filters out pagechange events fired by
        // the viewer's initialization
        if (this.loaded) {
            this.cachePage(pageNum);
        }
    }

    /**
     * Fullscreen entered handler. Add presentation mode class, set
     * presentation mode state, and set zoom to fullscreen zoom.
     *
     * @returns {void}
     * @private
     */
    enterfullscreenHandler() {
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.FULLSCREEN;
        this.pdfViewer.currentScaleValue = 'page-fit';

        // Force resize for annotations
        this.resize();
    }

    /**
     * Fullscreen exited handler. Remove presentation mode class, set
     * presentation mode state, and reset zoom.
     *
     * @returns {void}
     * @private
     */
    exitfullscreenHandler() {
        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.NORMAL;
        this.pdfViewer.currentScaleValue = 'auto';

        // Force resize for annotations
        this.resize();
    }

    /**
     * Mousewheel handler - scrolls presentations by page and scrolls documents
     * normally unless in fullscreen, in which it scrolls by page.
     *
     * @returns {Function} Debounced mousewheel handler
     * @private
     */
    wheelHandler() {
        if (this.options.viewerName === DOCUMENT_VIEWER_NAME && !fullscreen.isFullscreen()) {
            return;
        }

        event.preventDefault();

        // This filters out trackpad events since Macbook inertial scrolling
        // fires wheel events in a very unpredictable way
        const isFromMouseWheel = event.wheelDelta % 120 === 0;
        if (isFromMouseWheel) {
            if (event.deltaY > 0) {
                this.nextPage();
            } else {
                this.previousPage();
            }
        }
    }
}

export default DocBase;
