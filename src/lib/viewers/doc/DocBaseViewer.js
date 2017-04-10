import autobind from 'autobind-decorator';
import throttle from 'lodash.throttle';
import AnnotationService from '../../annotations/AnnotationService';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import cache from '../../Cache';
import Controls from '../../Controls';
import DocAnnotator from '../../annotations/doc/DocAnnotator';
import DocFindBar from './DocFindBar';
import fullscreen from '../../Fullscreen';
import {
    get,
    createAssetUrlCreator,
    decodeKeydown
} from '../../util';
import {
    CLASS_BOX_PREVIEW_FIND_BAR,
    CLASS_IS_SCROLLABLE,
    DOC_STATIC_ASSETS_VERSION,
    PERMISSION_ANNOTATE,
    PERMISSION_DOWNLOAD,
    PRELOAD_REP_NAME
} from '../../constants';
import { JS, CSS } from './docAssets';
import { getRepresentation, checkPermission } from '../../file';
import * as printUtil from '../../print-util';

const CURRENT_PAGE_MAP_KEY = 'doc-current-page-map';
const DEFAULT_SCALE_DELTA = 1.1;
const LOAD_TIMEOUT_MS = 300000; // 5 min timeout
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const DEFAULT_RANGE_REQUEST_CHUNK_SIZE = 262144; // 256KB
const LARGE_RANGE_REQUEST_CHUNK_SIZE = 1048576; // 1MB
const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';
const IS_SAFARI_CLASS = 'is-safari';
const SCROLL_EVENT_THROTTLE_INTERVAL = 200;
const PRINT_DIALOG_TIMEOUT_MS = 500; // Wait before showing popup
const SCROLL_END_TIMEOUT = Browser.isMobile() ? 500 : 250;

@autobind
class DocBaseViewer extends BaseViewer {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
        super.setup();

        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('bp-doc');

        if (Browser.getName() === 'Safari') {
            this.docEl.classList.add(IS_SAFARI_CLASS);
        }

        this.viewerEl = this.docEl.appendChild(document.createElement('div'));
        this.viewerEl.classList.add('pdfViewer');
        this.loadTimeout = LOAD_TIMEOUT_MS;

        this.scaling = false;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.unbindDOMListeners();

        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.removeAllListeners('pointmodeenter');
            this.annotator.removeAllListeners('pointmodeexit');
            this.annotator.destroy();
        }

        // Clean up the find bar
        if (this.findBar) {
            this.findBar.destroy();
        }

        // Clean up PDF network requests
        if (this.pdfLoadingTask) {
            try {
                this.pdfLoadingTask.destroy();
            } catch (e) {
                // Ignore these errors
            }
        }

        // Clean up viewer and PDF document object
        if (this.pdfViewer) {
            this.pdfViewer.cleanup();

            if (this.pdfViewer.pdfDocument) {
                this.pdfViewer.pdfDocument.destroy();
            }
        }

        if (this.printPopup && typeof this.printPopup.destroy === 'function') {
            this.printPopup.destroy();
            this.printBlob = undefined;
            this.printDialogTimeout = undefined;
        }

        super.destroy();
    }

    /**
     * Prefetches assets for a document.
     *
     * @param {boolean} [options.assets] - Whether or not to prefetch static assets
     * @param {boolean} [options.preload] - Whether or not to prefetch preload content
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ assets = true, preload = true, content = true }) {
        const { file, representation } = this.options;
        const isWatermarked = file && file.watermark_info && file.watermark_info.is_watermarked;

        if (assets) {
            this.prefetchAssets(JS, CSS);
        }

        if (preload && !isWatermarked) {
            const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
            if (preloadRep && this.isRepresentationReady(preloadRep)) {
                const { url_template: template } = preloadRep.content;

                // Prefetch as blob since preload needs to load image as a blob
                get(this.createContentUrlWithAuthParams(template), 'blob');
            }
        }

        if (content && !isWatermarked && this.isRepresentationReady(representation)) {
            const { url_template: template } = representation.content;
            get(this.createContentUrlWithAuthParams(template), 'any');
        }
    }

    /**
     * Shows a preload (first page as an image) while the full document loads.
     *
     * @return {void}
     */
    showPreload() {
        const { file } = this.options;
        const isWatermarked = file && file.watermark_info && file.watermark_info.is_watermarked;

        // Don't show preload if there's a cached page since preloads are only for the 1st page
        // Also don't show preloads for watermarked files
        if (!this.preloader || isWatermarked || this.getCachedPage() !== 1) {
            return;
        }

        const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        if (!preloadRep || !this.getViewerOption('preload')) {
            return;
        }

        const { url_template: template } = preloadRep.content;
        const preloadUrlWithAuth = this.createContentUrlWithAuthParams(template);
        this.preloader.showPreload(preloadUrlWithAuth, this.containerEl);
    }

    /**
     * Cleans up the preload (first page as an image). Should be called when full
     * document is loaded.
     *
     * @return {void}
     */
    hidePreload() {
        if (this.preloader) {
            this.preloader.hidePreload();
        }
    }

    /**
     * Loads a document.
     *
     * @public
     * @return {Promise} Promise to resolve assets
     */
    load() {
        this.setup();
        super.load();
        this.showPreload();

        const template = this.options.representation.content.url_template;
        this.pdfUrl = this.createContentUrlWithAuthParams(template);

        return Promise.all([this.loadAssets(JS, CSS), this.getRepStatus().getPromise()])
            .then(this.postload)
            .catch(this.handleAssetError);
    }

    /**
     * Loads a document.
     *
     * @return {void}
     */
    postload = () => {
        this.setupPdfjs();
        this.initViewer(this.pdfUrl);
        this.printPopup = printUtil.initPrintPopup(this.containerEl);
        this.initFind();
    }

    /**
     * Initializes the Find Bar and Find Controller
     * @return {void}
     */
    initFind() {
        this.findBarEl = this.containerEl.appendChild(document.createElement('div'));
        this.findBarEl.classList.add(CLASS_BOX_PREVIEW_FIND_BAR);

        this.findController = new PDFJS.PDFFindController({
            pdfViewer: this.pdfViewer
        });
        this.pdfViewer.setFindController(this.findController);

        // Only initialize the find bar if the user has download permissions on
        // the file. Users without download permissions shouldn't be able to
        // interact with the text layer
        const canDownload = checkPermission(this.options.file, PERMISSION_DOWNLOAD);
        this.findBar = new DocFindBar(this.findBarEl, this.findController, canDownload);
    }

    /**
     * Sets up and triggers print of the PDF representation.
     *
     * @return {void}
     */
    print() {
        if (!this.printBlob) {
            get(this.pdfUrl, 'blob')
                .then((blob) => {
                    this.printBlob = blob;
                })
                .then(this.finishPrint);

            this.printDialogTimeout = setTimeout(() => {
                clearTimeout(this.printDialogTimeout);
                this.printDialogTimeout = null;
                printUtil.showPrintPopup(this.printPopup, this.finishPrint);
            }, PRINT_DIALOG_TIMEOUT_MS);
        } else {
            this.finishPrint();
        }
    }

    /**
     * Executes the print and emits the result.
     *
     * @return {void}
     */
    finishPrint = () => {
        const printNotification = printUtil.printPDF(this.printBlob, this.printDialogTimeout, this.printPopup);
        if (printNotification !== '') {
            this.emit(printNotification);
        }
    }

    /**
     * Re-sizing logic.
     *
     * @override
     * @return {void}
     * @protected
     */
    resize() {
        if (!this.pdfViewer || !this.pdfViewer.pageViewsReady) {
            return;
        }

        // Save page and return after resize
        const currentPageNumber = this.pdfViewer.currentPageNumber;

        this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue || 'auto';
        this.pdfViewer.update();

        this.setPage(currentPageNumber);

        // Update annotations scale
        if (this.annotator) {
            this.annotator.setScale(this.pdfViewer.currentScale); // Set scale to current numerical scale
        }

        super.resize();
    }

    /**
     * Go to previous page
     *
     * @return {void}
     */
    previousPage() {
        this.setPage(this.pdfViewer.currentPageNumber - 1);
    }

    /**
     * Go to next page
     *
     * @return {void}
     */
    nextPage() {
        this.setPage(this.pdfViewer.currentPageNumber + 1);
    }

    /**
     * Go to specified page
     *
     * @param {number} pageNum - Page to navigate to
     * @return {void}
     */
    setPage(pageNum) {
        if (pageNum <= 0 || pageNum > this.pdfViewer.pagesCount) {
            return;
        }

        this.pdfViewer.currentPageNumber = pageNum;
        this.cachePage(this.pdfViewer.currentPageNumber);
    }

    /**
     * Gets the cached current page.
     *
     * @return {number} Current page
     */
    getCachedPage() {
        let page = 1;

        if (cache.has(CURRENT_PAGE_MAP_KEY)) {
            const currentPageMap = cache.get(CURRENT_PAGE_MAP_KEY);
            page = currentPageMap[this.options.file.id] || page;
        }

        return page;
    }

    /**
     * Sets the current page into localstorage if available. Otherwise saves
     * it in-memory as a property on the document viewer.
     *
     * @param {number} page - Current page
     * @return {void}
     */
    cachePage(page) {
        let currentPageMap = {};
        if (cache.has(CURRENT_PAGE_MAP_KEY)) {
            currentPageMap = cache.get(CURRENT_PAGE_MAP_KEY);
        }

        currentPageMap[this.options.file.id] = page;
        cache.set(CURRENT_PAGE_MAP_KEY, currentPageMap, true /* useLocalStorage */);
    }

    /**
     * Disables or enables previous/next pagination buttons depending on
     * current page number.
     *
     * @return {void}
     */
    checkPaginationButtons() {
        const pagesCount = this.pdfViewer.pagesCount;
        const currentPageNum = this.pdfViewer.currentPageNumber;
        const pageNumButtonEl = this.containerEl.querySelector('.bp-doc-page-num');
        const previousPageButtonEl = this.containerEl.querySelector('.bp-previous-page');
        const nextPageButtonEl = this.containerEl.querySelector('.bp-next-page');

        // Safari disables keyboard input in fullscreen
        const isSafariFullscreen = Browser.getName() === 'Safari' && fullscreen.isFullscreen(this.containerEl);

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
     * @param {number} ticks - Number of times to zoom in
     * @return {void}
     */
    zoomIn(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(3);
            newScale = Math.min(MAX_SCALE, newScale);
            numTicks -= 1;
        } while (numTicks > 0 && newScale < MAX_SCALE);

        if (this.pdfViewer.currentScale !== newScale) {
            this.emit('zoom', {
                zoom: newScale,
                canZoomOut: true,
                canZoomIn: newScale < MAX_SCALE
            });
        }

        this.setScale(newScale);
    }

    /**
     * Zoom out of document.
     *
     * @param {number} ticks - Number of times to zoom out
     * @return {void}
     */
    zoomOut(ticks = 1) {
        let numTicks = ticks;
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(3);
            newScale = Math.max(MIN_SCALE, newScale);
            numTicks -= 1;
        } while (numTicks > 0 && newScale > MIN_SCALE);

        if (this.pdfViewer.currentScale !== newScale) {
            this.emit('zoom', {
                zoom: newScale,
                canZoomOut: newScale > MIN_SCALE,
                canZoomIn: true
            });
        }

        this.setScale(newScale);
    }

    /**
     * Sets zoom scale.
     *
     * @param {number} scale - Numerical zoom scale
     * @return {void}
     */
    setScale(scale) {
        // Redraw annotations if needed
        if (this.annotator) {
            this.annotator.setScale(scale);
        }

        this.pdfViewer.currentScaleValue = scale;
    }

    /**
     * Returns whether or not viewer is annotatable. If an optional type is
     * passed in, we check if that type of annotation is allowed.
     *
     * @param {string} [type] - Type of annotation
     * @return {boolean} Whether or not viewer is annotatable
     */
    isAnnotatable(type) {
        if (typeof type === 'string' && type !== 'point' && type !== 'highlight') {
            return false;
        }

        // Respect viewer-specific annotation option if it is set
        const viewerAnnotations = this.getViewerOption('annotations');
        if (typeof viewerAnnotations === 'boolean') {
            return viewerAnnotations;
        }

        // Otherwise, use global preview annotation option
        return this.options.showAnnotations;
    }

    /**
     * Returns click handler for toggling point annotation mode.
     *
     * @return {Function|null} Click handler
     */
    getPointModeClickHandler() {
        if (!this.isAnnotatable('point')) {
            return null;
        }

        return this.annotator.togglePointModeHandler;
    }

    /**
     * Handles keyboard events for document viewer.
     *
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
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

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Loads PDF.js with provided PDF.
     *
     * @protected
     * @param {string} pdfUrl - The URL of the PDF to load
     * @return {Promise} Promise to initialize Viewer
     */
    initViewer(pdfUrl) {
        // Initialize PDF.js in container
        this.pdfViewer = new PDFJS.PDFViewer({
            container: this.docEl,
            linkService: new PDFJS.PDFLinkService(),
            enhanceTextSelection: true // improves text selection if true
        });

        // Use chunk size set in viewer options if available
        let rangeChunkSize = this.getViewerOption('rangeChunkSize');

        // Otherwise, use large chunk size if locale is en-US and the default,
        // smaller chunk size if not. This is using a rough assumption that
        // en-US users have higher bandwidth to Box.
        if (!rangeChunkSize) {
            rangeChunkSize = this.options.location.locale === 'en-US' ?
                LARGE_RANGE_REQUEST_CHUNK_SIZE :
                DEFAULT_RANGE_REQUEST_CHUNK_SIZE;
        }

        this.bindDOMListeners();

        // Load PDF from representation URL
        this.pdfLoadingTask = PDFJS.getDocument({
            url: pdfUrl,
            rangeChunkSize
        });

        // Set document for PDF.js
        return this.pdfLoadingTask.then((doc) => {
            this.pdfViewer.setDocument(doc);

            const linkService = this.pdfViewer.linkService;
            if (linkService instanceof PDFJS.PDFLinkService) {
                linkService.setDocument(doc, pdfUrl);
                linkService.setViewer(this.pdfViewer);
            }
        }).catch((err) => {
            /* eslint-disable no-console */
            console.error(err);
            /* eslint-enable no-console */

            // Display a generic error message but log the real one
            const error = err;
            if (err instanceof Error) {
                error.displayMessage = __('error_document');
            }
            this.triggerError(err);
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets options for PDF.js.
     *
     * @return {void}
     * @private
     */
    setupPdfjs() {
        // Set PDFJS worker & character maps
        const { file, location } = this.options;
        const assetUrlCreator = createAssetUrlCreator(location);
        PDFJS.workerSrc = assetUrlCreator(`third-party/doc/${DOC_STATIC_ASSETS_VERSION}/pdf.worker.min.js`);
        PDFJS.cMapUrl = `${location.staticBaseURI}third-party/doc/${DOC_STATIC_ASSETS_VERSION}/cmaps/`;
        PDFJS.cMapPacked = true;

        // Open links in new tab
        PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK;

        // Disable range requests for iOS Safari - mobile Safari caches ranges incorrectly
        PDFJS.disableRange = PDFJS.disableRange || (Browser.isIOS() && Browser.getName() === 'Safari');

        // Disable range requests for watermarked files since they are streamed
        PDFJS.disableRange = PDFJS.disableRange ||
            (file.watermark_info && file.watermark_info.is_watermarked);

        // Disable text layer if user doesn't have download permissions
        PDFJS.disableTextLayer = !checkPermission(file, PERMISSION_DOWNLOAD);
    }

    /**
     * Initializes annotations.
     *
     * @return {void}
     * @private
     */
    initAnnotations() {
        this.setupPageIds();

        const { apiHost, file, location, token } = this.options;
        const fileVersionID = file.file_version.id;
        // Users can currently only view annotations on mobile
        const canAnnotate = checkPermission(file, PERMISSION_ANNOTATE) && !Browser.isMobile();
        const annotationService = new AnnotationService({
            apiHost,
            fileId: file.id,
            token,
            canAnnotate
        });

        // Construct and init annotator
        this.annotator = new DocAnnotator({
            annotatedElement: this.docEl,
            annotationService,
            fileVersionID,
            locale: location.locale
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
     * Add page IDs to each page since annotations explicitly needs IDs per page (rangy).
     *
     * @private
     * @return {void}
     */
    setupPageIds() {
        const pageEls = this.containerEl.querySelectorAll('.page');
        [].forEach.call(pageEls, (pageEl) => {
            /* eslint-disable no-param-reassign */
            const pageNumber = pageEl.dataset.pageNumber;
            if (pageNumber) {
                pageEl.id = `bp-page-${pageNumber}`;
            }
            /* eslint-enable no-param-reassign */
        });
    }

    /**
     * Initializes page number selector.
     *
     * @return {void}
     * @private
     */
    initPageNumEl() {
        const pageNumEl = this.controls.controlsEl.querySelector('.bp-doc-page-num');

        // Update total page number
        const totalPageEl = pageNumEl.querySelector('.bp-doc-total-pages');
        totalPageEl.textContent = this.pdfViewer.pagesCount;

        // Keep reference to page number input and current page elements
        this.pageNumInputEl = pageNumEl.querySelector('.bp-doc-page-num-input');
        this.currentPageEl = pageNumEl.querySelector('.bp-doc-current-page');
    }

    /**
     * Creates UI for preview controls.
     *
     * @return {void}
     * @private
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.bindControlListeners();
        this.initPageNumEl();
    }

    /**
     * Replaces the page number display with an input box that allows the user to type in a page number
     *
     * @return {void}
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
     * @return {void}
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
     * @param {number} pageNum - Number of page to update to
     * @return {void}
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
     * @return {void}
     * @protected
     */
    bindDOMListeners() {
        // When page structure is initialized, set default zoom, load controls,
        // and broadcast that preview has loaded
        this.docEl.addEventListener('pagesinit', this.pagesinitHandler);

        // When a page is rendered, rerender annotations if needed
        this.docEl.addEventListener('pagerendered', this.pagerenderedHandler);

        // When text layer is rendered, show annotations if enabled
        this.docEl.addEventListener('textlayerrendered', this.textlayerrenderedHandler);

        // Update page number when page changes
        this.docEl.addEventListener('pagechange', this.pagechangeHandler);

        // Detects scroll so an event can be fired
        this.docEl.addEventListener('scroll', this.scrollHandler);

        // Fullscreen
        fullscreen.addListener('enter', this.enterfullscreenHandler);
        fullscreen.addListener('exit', this.exitfullscreenHandler);

        if (Browser.isMobile()) {
            if (Browser.isIOS()) {
                this.docEl.addEventListener('gesturestart', this.mobileZoomStartHandler);
                this.docEl.addEventListener('gestureend', this.mobileZoomEndHandler);
            } else {
                this.docEl.addEventListener('touchstart', this.mobileZoomStartHandler);
                this.docEl.addEventListener('touchmove', this.mobileZoomChangeHandler);
                this.docEl.addEventListener('touchend', this.mobileZoomEndHandler);
            }
        }
    }

    /**
     * Unbinds DOM listeners for document viewer.
     *
     * @return {void}
     * @protected
     */
    unbindDOMListeners() {
        if (this.docEl) {
            this.docEl.removeEventListener('pagesinit', this.pagesinitHandler);
            this.docEl.removeEventListener('pagerendered', this.pagerenderedHandler);
            this.docEl.removeEventListener('pagechange', this.pagechangeHandler);
            this.docEl.removeEventListener('textlayerrendered', this.textlayerrenderedHandler);
            this.docEl.removeEventListener('scroll', this.scrollHandler);

            if (Browser.isMobile()) {
                if (Browser.isIOS()) {
                    this.docEl.removeEventListener('gesturestart', this.mobileZoomStartHandler);
                    this.docEl.removeEventListener('gestureend', this.mobileZoomEndHandler);
                } else {
                    this.docEl.removeEventListener('touchstart', this.mobileZoomStartHandler);
                    this.docEl.removeEventListener('touchmove', this.mobileZoomChangeHandler);
                    this.docEl.removeEventListener('touchend', this.mobileZoomEndHandler);
                }
            }
        }

        fullscreen.removeListener('enter', this.enterfullscreenHandler);
        fullscreen.removeListener('exit', this.exitfullscreenHandler);
    }

    /**
     * Binds listeners for document controls. Overridden.
     *
     * @return {void}
     * @protected
     */
    bindControlListeners() {}

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
            this.setPage(pageNum);
        }

        this.hidePageNumInput();
    }

    /**
     * Keydown handler for page number input.
     *
     * @param {Event} event - Keydown event
     * @return {void}
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

            default:
                break;
        }
    }

    /**
     * Handler for 'pagesinit' event.
     *
     * @return {void}
     * @private
     */
    pagesinitHandler() {
        this.pdfViewer.currentScaleValue = 'auto';

        // Initialize annotations before other UI
        if (this.isAnnotatable()) {
            this.initAnnotations();
        }

        this.loadUI();
        this.checkPaginationButtons();

        // Set current page to previously opened page or first page
        this.setPage(this.getCachedPage());

        // Make document scrollable after pages are set up so scrollbars don't mess with autoscaling
        this.docEl.classList.add(CLASS_IS_SCROLLABLE);

        // Broadcast that preview has 'loaded' when page structure is available
        if (!this.loaded) {
            this.loaded = true;
            this.emit('load', {
                numPages: this.pdfViewer.pagesCount,
                endProgress: false // Indicate that viewer will end progress later
            });
        }
    }

    /**
     * Handler for 'pagerendered' event.
     *
     * @return {void}
     * @private
     */
    pagerenderedHandler(event) {
        const pageNumber = event.detail ? event.detail.pageNumber : undefined;

        // Render annotations by page
        if (this.annotator) {
            // We should get a page number from pdfViewer most of the time
            if (pageNumber) {
                this.annotator.renderAnnotationsOnPage(pageNumber);
                // If not, we re-render all annotations to be safe
            } else {
                this.annotator.renderAnnotations();
            }
        }

        // If text layer is disabled due to permissions, we still want to show annotations
        if (PDFJS.disableTextLayer) {
            this.textlayerrenderedHandler();
        }

        if (pageNumber) {
            // Page rendered event
            this.emit('pagerender', pageNumber);

            // Fire postload event to hide progress bar and cleanup preload after a page is rendered
            if (!this.somePageRendered) {
                this.hidePreload();
                this.emit('progressend');
                this.somePageRendered = true;
            }
        }
    }

    /**
     * Handler for 'textlayerrendered' event.
     *
     * @return {void}
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
     * @param {Event} event - Pagechange event
     * @return {void}
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

        this.emit('pagefocus', pageNum);
    }

    /**
     * Fullscreen entered handler. Add presentation mode class, set
     * presentation mode state, and set zoom to fullscreen zoom.
     *
     * @return {void}
     * @private
     */
    enterfullscreenHandler() {
        this.pdfViewer.currentScaleValue = 'page-fit';

        // Force resize for annotations
        this.resize();
    }

    /**
     * Fullscreen exited handler. Remove presentation mode class, set
     * presentation mode state, and reset zoom.
     *
     * @return {void}
     * @private
     */
    exitfullscreenHandler() {
        this.pdfViewer.currentScaleValue = 'auto';

        // Force resize for annotations
        this.resize();
    }

    /**
     * Scroll handler. Fires an event on start and stop
     *
     * @return {void}
     * @private
     */
    scrollHandler = throttle(() => {
        // Reset the scroll timer if we are continuing a scroll
        if (this.scrollTimer) {
            clearTimeout(this.scrollTimer);
        }

        // only fire the scroll start event if this is a new scroll
        if (!this.scrollStarted) {
            this.emit('scrollstart', {
                scrollTop: this.docEl.scrollTop,
                scrollLeft: this.docEl.scrollLeft
            });
            this.scrollStarted = true;
        }

        this.scrollTimer = setTimeout(() => {
            this.emit('scrollend', {
                scrollTop: this.docEl.scrollTop,
                scrollLeft: this.docEl.scrollLeft
            });
            this.scrollStarted = false;
        }, SCROLL_END_TIMEOUT);
    }, SCROLL_EVENT_THROTTLE_INTERVAL);
}

export default DocBaseViewer;
