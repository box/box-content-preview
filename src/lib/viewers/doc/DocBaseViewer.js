import autobind from 'autobind-decorator';
import throttle from 'lodash.throttle';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import Controls from '../../Controls';
import PageControls from '../../PageControls';
import DocFindBar from './DocFindBar';
import fullscreen from '../../Fullscreen';
import Popup from '../../Popup';
import RepStatus from '../../RepStatus';
import {
    CLASS_BOX_PREVIEW_FIND_BAR,
    CLASS_CRAWLER,
    CLASS_HIDDEN,
    CLASS_IS_SCROLLABLE,
    CLASS_SPINNER,
    DOC_STATIC_ASSETS_VERSION,
    PERMISSION_DOWNLOAD,
    PRELOAD_REP_NAME,
    STATUS_ERROR
} from '../../constants';
import { checkPermission, getRepresentation } from '../../file';
import { get, createAssetUrlCreator } from '../../util';
import {
    ICON_FILE_DOCUMENT,
    ICON_FILE_PDF,
    ICON_FILE_PRESENTATION,
    ICON_FILE_SPREADSHEET,
    ICON_FILE_WORD,
    ICON_PRINT_CHECKMARK
} from '../../icons/icons';
import { JS, CSS } from './docAssets';

const CURRENT_PAGE_MAP_KEY = 'doc-current-page-map';
const DEFAULT_SCALE_DELTA = 1.1;
const LOAD_TIMEOUT_MS = 180000; // 3 min timeout
const SAFARI_PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const PRINT_DIALOG_TIMEOUT_MS = 500;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;
const IS_SAFARI_CLASS = 'is-safari';
const SCROLL_EVENT_THROTTLE_INTERVAL = 200;
const SCROLL_END_TIMEOUT = this.isMobile ? 500 : 250;

const RANGE_REQUEST_CHUNK_SIZE_US = 1048576; // 1MB
const RANGE_REQUEST_CHUNK_SIZE_NON_US = 524288; // 512KB
const MINIMUM_RANGE_REQUEST_FILE_SIZE_NON_US = 26214400; // 25MB
const MOBILE_MAX_CANVAS_SIZE = 2949120; // ~3MP 1920x1536

const LOADING_ICON_MAP = {
    csv: ICON_FILE_SPREADSHEET,
    doc: ICON_FILE_WORD,
    docx: ICON_FILE_WORD,
    gdoc: ICON_FILE_WORD,
    gsheet: ICON_FILE_SPREADSHEET,
    odp: ICON_FILE_PRESENTATION,
    pdf: ICON_FILE_PDF,
    ppt: ICON_FILE_PRESENTATION,
    pptx: ICON_FILE_PRESENTATION,
    xls: ICON_FILE_SPREADSHEET,
    xlsm: ICON_FILE_SPREADSHEET,
    xlsx: ICON_FILE_SPREADSHEET
};

@autobind
class DocBaseViewer extends BaseViewer {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @inheritdoc
     */
    setup() {
        const fileExt = this.options.file.extension;
        this.fileLoadingIcon = LOADING_ICON_MAP[fileExt] || ICON_FILE_DOCUMENT;

        // Call super() to set up common layout
        super.setup();

        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('bp-doc');

        if (Browser.getName() === 'Safari') {
            this.docEl.classList.add(IS_SAFARI_CLASS);
        }

        // We disable native pinch-to-zoom and double tap zoom on mobile to force users to use
        // our viewer's zoom controls
        if (this.isMobile) {
            const metaEl = document.createElement('meta');
            metaEl.setAttribute('name', 'viewport');
            metaEl.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=no');
            document.getElementsByTagName('head')[0].appendChild(metaEl);
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

        // Clean up print blob
        this.printBlob = null;

        if (this.printURL) {
            URL.revokeObjectURL(this.printURL);
        }

        if (this.pageControls) {
            this.pageControls.removeListener('pagechange', this.setPage);
        }

        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
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

        if (this.printPopup) {
            this.printPopup.destroy();
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

        // Don't show preload if there is no preload rep, the 'preload' viewer option isn't set,
        // or the rep has an error
        const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        if (!preloadRep || !this.getViewerOption('preload') || RepStatus.getStatus(preloadRep) === STATUS_ERROR) {
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
        this.initPrint();
        this.initFind();
    };

    /**
     * Initializes the Find Bar and Find Controller
     *
     * @return {void}
     */
    initFind() {
        this.findBarEl = this.containerEl.appendChild(document.createElement('div'));
        this.findBarEl.classList.add(CLASS_BOX_PREVIEW_FIND_BAR);

        /* global PDFJS */
        this.findController = new PDFJS.PDFFindController({
            pdfViewer: this.pdfViewer
        });
        this.pdfViewer.setFindController(this.findController);

        // Only initialize the find bar if the user has download permissions on
        // the file. Users without download permissions shouldn't be able to
        // interact with the text layer
        const canDownload = checkPermission(this.options.file, PERMISSION_DOWNLOAD);
        if (this.getViewerOption('disableFindBar')) {
            return;
        }
        this.findBar = new DocFindBar(this.findBarEl, this.findController, canDownload);
    }

    /**
     * Scrolls to and highlights the next occurences of a phrase in the document using the DocFindBar
     *
     * @public
     * @param {string} phrase - Phrase to find
     * @param {boolean} [openFindBar] - Option to open the findbar on find
     * @return {void}
     */
    find(phrase, openFindBar = false) {
        if (!this.findBar) {
            return;
        }

        // Go to page one so that we can find the first occurence in the document
        this.setPage(1);
        this.findBar.setFindFieldElValue(phrase);
        this.findBar.findFieldHandler();

        if (openFindBar) {
            this.findBar.open();
        }
    }

    /**
     * Ensures that the print blob is loaded & updates the print UI.
     *
     * @return {void}
     */
    print() {
        // If print blob is not ready, fetch it
        if (!this.printBlob) {
            this.fetchPrintBlob(this.pdfUrl).then(this.print);

            // Show print dialog after PRINT_DIALOG_TIMEOUT_MS
            this.printDialogTimeout = setTimeout(() => {
                this.printPopup.show(__('print_loading'), __('print'), () => {
                    this.printPopup.hide();
                    this.browserPrint();
                });

                this.printPopup.disableButton();
                this.printDialogTimeout = null;
            }, PRINT_DIALOG_TIMEOUT_MS);
            return;
        }

        // Immediately print if either printing is ready within PRINT_DIALOG_TIMEOUT_MS
        // or if popup is not visible (e.g. from initiating print again)
        if (this.printDialogTimeout || !this.printPopup.isVisible()) {
            clearTimeout(this.printDialogTimeout);
            this.browserPrint();
        } else {
            // Update popup UI to reflect that print is ready
            this.printPopup.enableButton();
            this.printPopup.messageEl.textContent = __('print_ready');
            this.printPopup.loadingIndicator.classList.add(CLASS_HIDDEN);
            this.printPopup.printCheckmark.classList.remove(CLASS_HIDDEN);
        }
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
     * @param {number} pageNumber - Page to navigate to
     * @return {void}
     */
    setPage(pageNumber) {
        if (pageNumber < 1 || pageNumber > this.pdfViewer.pagesCount) {
            return;
        }

        this.pdfViewer.currentPageNumber = pageNumber;
        this.cachePage(this.pdfViewer.currentPageNumber);
    }

    /**
     * Gets the cached current page.
     *
     * @return {number} Current page
     */
    getCachedPage() {
        let page = 1;

        if (this.cache.has(CURRENT_PAGE_MAP_KEY)) {
            const currentPageMap = this.cache.get(CURRENT_PAGE_MAP_KEY);
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
        if (this.cache.has(CURRENT_PAGE_MAP_KEY)) {
            currentPageMap = this.cache.get(CURRENT_PAGE_MAP_KEY);
        }

        currentPageMap[this.options.file.id] = page;
        this.cache.set(CURRENT_PAGE_MAP_KEY, currentPageMap, true /* useLocalStorage */);
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
        this.pdfViewer.currentScaleValue = newScale;
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
        this.pdfViewer.currentScaleValue = newScale;
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
        this.bindDOMListeners();

        // Initialize pdf.js in container
        this.pdfViewer = new PDFJS.PDFViewer({
            container: this.docEl,
            linkService: new PDFJS.PDFLinkService(),
            // Enhanced text selection uses more memory, so disable on mobile
            enhanceTextSelection: !this.isMobile
        });

        // Use chunk size set in viewer options if available
        let rangeChunkSize = this.getViewerOption('rangeChunkSize');

        // Otherwise, use large chunk size if locale is en-US and the default,
        // smaller chunk size if not. This is using a rough assumption that
        // en-US users have higher bandwidth to Box.
        if (!rangeChunkSize) {
            rangeChunkSize =
                this.options.location.locale === 'en-US'
                    ? RANGE_REQUEST_CHUNK_SIZE_US
                    : RANGE_REQUEST_CHUNK_SIZE_NON_US;
        }

        const docInitParams = {
            url: pdfUrl,
            rangeChunkSize
        };

        // Fix incorrectly cached range requests on older versions of iOS webkit browsers,
        // see: https://bugs.webkit.org/show_bug.cgi?id=82672
        if (Browser.isIOS()) {
            docInitParams.httpHeaders = {
                'If-None-Match': 'webkit-no-cache'
            };
        }

        // Load PDF from representation URL and set as document for pdf.js. Cache
        // the loading task so we can cancel if needed
        this.pdfLoadingTask = PDFJS.getDocument(docInitParams);
        return this.pdfLoadingTask
            .then((doc) => {
                this.pdfViewer.setDocument(doc);

                const linkService = this.pdfViewer.linkService;
                if (linkService instanceof PDFJS.PDFLinkService) {
                    linkService.setDocument(doc, pdfUrl);
                    linkService.setViewer(this.pdfViewer);
                }
            })
            .catch((err) => {
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

    /**
     * Re-sizing logic.
     *
     * @protected
     * @override
     * @return {void}
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

        super.resize();
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
        const { size, watermark_info: watermarkInfo } = file;
        const assetUrlCreator = createAssetUrlCreator(location);
        PDFJS.workerSrc = assetUrlCreator(`third-party/doc/${DOC_STATIC_ASSETS_VERSION}/pdf.worker.min.js`);
        PDFJS.imageResourcesPath = assetUrlCreator(`third-party/doc/${DOC_STATIC_ASSETS_VERSION}/images/`);
        PDFJS.cMapUrl = `${location.staticBaseURI}third-party/doc/${DOC_STATIC_ASSETS_VERSION}/cmaps/`;
        PDFJS.cMapPacked = true;

        // Open links in new tab
        PDFJS.externalLinkTarget = PDFJS.LinkTarget.BLANK;

        // Disable font faces on IOS 10.3.X
        // @NOTE(JustinHoldstock) 2017-04-11: Check to remove this after next IOS release after 10.3.1
        PDFJS.disableFontFace = PDFJS.disableFontFace || Browser.hasFontIssue();

        // Disable range requests for files smaller than MINIMUM_RANGE_REQUEST_FILE_SIZE (25MB) for
        // previews outside of the US since the additional latency overhead per range request can be
        // more than the additional time for a continuous request. This also overrides any range request
        // disabling that may be set by pdf.js's compatibility checking since the browsers we support
        // should all be able to properly handle range requests.
        PDFJS.disableRange = location.locale !== 'en-US' && size < MINIMUM_RANGE_REQUEST_FILE_SIZE_NON_US;

        // Disable range requests for watermarked files since they are streamed
        PDFJS.disableRange = PDFJS.disableRange || (watermarkInfo && watermarkInfo.is_watermarked);

        // Disable text layer if user doesn't have download permissions
        PDFJS.disableTextLayer =
            !checkPermission(file, PERMISSION_DOWNLOAD) || !!this.getViewerOption('disableTextLayer');

        // Decrease mobile canvas size to ~3MP (1920x1536)
        PDFJS.maxCanvasPixels = this.isMobile ? MOBILE_MAX_CANVAS_SIZE : PDFJS.maxCanvasPixels;

        // Do not disable create object URL in IE11 or iOS Chrome - pdf.js issues #3977 and #8081 are
        // not applicable to Box's use case and disabling causes performance issues
        PDFJS.disableCreateObjectURL = false;

        // Customize pdf.js loading icon. We modify the prototype of PDFPageView to get around directly modifying
        // pdf_viewer.js
        const resetFunc = PDFJS.PDFPageView.prototype.reset;
        PDFJS.PDFPageView.prototype.reset = function reset(...args) {
            resetFunc.bind(this)(args);
            this.loadingIconDiv.classList.add(CLASS_SPINNER);
            this.loadingIconDiv.innerHTML = '<div></div>';
        };
    }

    /**
     * Sets up print notification & prepare PDF for printing.
     *
     * @private
     * @return {void}
     */
    initPrint() {
        this.printPopup = new Popup(this.containerEl);

        const printCheckmark = document.createElement('div');
        printCheckmark.className = `bp-print-check ${CLASS_HIDDEN}`;
        printCheckmark.innerHTML = ICON_PRINT_CHECKMARK.trim();

        const loadingIndicator = document.createElement('div');
        loadingIndicator.classList.add(CLASS_CRAWLER);
        loadingIndicator.innerHTML = `
            <div></div>
            <div></div>
            <div></div>`.trim();

        this.printPopup.addContent(loadingIndicator, true);
        this.printPopup.addContent(printCheckmark, true);

        // Save a reference so they can be hidden or shown later.
        this.printPopup.loadingIndicator = loadingIndicator;
        this.printPopup.printCheckmark = printCheckmark;
    }

    /**
     * Add page IDs to each page
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
     * Fetches PDF and converts to blob for printing.
     *
     * @private
     * @param {string} pdfUrl - URL to PDF
     * @return {Promise} Promise setting print blob
     */
    fetchPrintBlob(pdfUrl) {
        return get(pdfUrl, 'blob').then((blob) => {
            this.printBlob = blob;
        });
    }

    /**
     * Handles logic for printing the PDF representation in browser.
     *
     * @private
     * @return {void}
     */
    browserPrint() {
        // For IE & Edge, use the open or save dialog since we can't open
        // in a new tab due to security restrictions, see:
        // http://stackoverflow.com/questions/24007073/open-links-made-by-createobjecturl-in-ie11
        if (typeof window.navigator.msSaveOrOpenBlob === 'function') {
            const printResult = window.navigator.msSaveOrOpenBlob(this.printBlob, 'print.pdf');

            // If open/save notification is not shown, broadcast error
            if (!printResult) {
                this.emit('printerror');
            } else {
                this.emit('printsuccess');
            }

            // For other browsers, open and print in a new tab
        } else {
            if (!this.printURL) {
                this.printURL = URL.createObjectURL(this.printBlob);
            }

            const printResult = window.open(this.printURL);

            // Open print popup if possible
            if (printResult && typeof printResult.print === 'function') {
                const browser = Browser.getName();

                // Chrome supports printing on load
                if (browser === 'Chrome') {
                    printResult.addEventListener('load', () => {
                        printResult.print();
                    });

                    // Safari print on load produces blank page, so we use a timeout
                } else if (browser === 'Safari') {
                    setTimeout(() => {
                        printResult.print();
                    }, SAFARI_PRINT_TIMEOUT_MS);
                }

                // Firefox has a blocking bug: https://bugzilla.mozilla.org/show_bug.cgi?id=911444
            }

            // If new window/tab was blocked, broadcast error
            if (!printResult || printResult.closed || typeof printResult.closed === 'undefined') {
                this.emit('printerror');
            } else {
                this.emit('printsuccess');
            }
        }
    }

    /**
     * Creates UI for preview controls.
     *
     * @private
     * @return {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.pageControls = new PageControls(this.controls, this.docEl);
        this.pageControls.addListener('pagechange', this.setPage);
        this.bindControlListeners();
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Binds DOM listeners for document viewer.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        // When page structure is initialized, set default zoom, load controls,
        // and broadcast that preview has loaded
        this.docEl.addEventListener('pagesinit', this.pagesinitHandler);

        // When a page is rendered, update scale
        this.docEl.addEventListener('pagerendered', this.pagerenderedHandler);

        // Update page number when page changes
        this.docEl.addEventListener('pagechange', this.pagechangeHandler);

        // Detects scroll so an event can be fired
        this.docEl.addEventListener('scroll', this.scrollHandler);

        // Fullscreen
        fullscreen.addListener('enter', this.enterfullscreenHandler);
        fullscreen.addListener('exit', this.exitfullscreenHandler);

        if (this.isMobile) {
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
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        if (this.docEl) {
            this.docEl.removeEventListener('pagesinit', this.pagesinitHandler);
            this.docEl.removeEventListener('pagerendered', this.pagerenderedHandler);
            this.docEl.removeEventListener('pagechange', this.pagechangeHandler);
            this.docEl.removeEventListener('scroll', this.scrollHandler);

            if (this.isMobile) {
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
     * @protected
     * @return {void}
     */
    bindControlListeners() {}

    /**
     * Handler for 'pagesinit' event.
     *
     * @private
     * @return {void}
     */
    pagesinitHandler() {
        this.pdfViewer.currentScaleValue = 'auto';

        this.loadUI();

        // Set current page to previously opened page or first page
        this.setPage(this.getCachedPage());

        // Make document scrollable after pages are set up so scrollbars don't mess with autoscaling
        this.docEl.classList.add(CLASS_IS_SCROLLABLE);

        // Broadcast that preview has 'loaded' when page structure is available
        if (!this.loaded) {
            this.loaded = true;
            this.emit('load', {
                numPages: this.pdfViewer.pagesCount,
                endProgress: false, // Indicate that viewer will end progress later
                scale: this.pdfViewer.currentScale
            });

            // Add page IDs to each page after page structure is available
            this.setupPageIds();
        }
    }

    /**
     * Handler for 'pagerendered' event.
     *
     * @private
     * @param {Event} event - 'pagerendered' event
     * @return {void}
     */
    pagerenderedHandler(event) {
        const pageNumber = event.detail ? event.detail.pageNumber : undefined;

        if (pageNumber) {
            // Page rendered event
            this.emit('pagerender', pageNumber);

            // Set scale to current numerical scale & rendered page number
            this.emit('scale', {
                scale: this.pdfViewer.currentScale,
                pageNum: pageNumber
            });

            // Fire postload event to hide progress bar and cleanup preload after a page is rendered
            if (!this.somePageRendered) {
                this.hidePreload();
                this.emit('progressend');
                this.somePageRendered = true;
            }
        }
    }

    /**
     * Handler for 'pagechange' event.
     *
     * @private
     * @param {Event} event - Pagechange event
     * @return {void}
     */
    pagechangeHandler(event) {
        const pageNumber = event.pageNumber;
        this.pageControls.updateCurrentPage(pageNumber);

        // We only set cache the current page if 'pagechange' was fired after
        // preview is loaded - this filters out pagechange events fired by
        // the viewer's initialization
        if (this.loaded) {
            this.cachePage(pageNumber);
        }

        this.emit('pagefocus', pageNumber);
    }

    /**
     * Fullscreen entered handler. Add presentation mode class, set
     * presentation mode state, and set zoom to fullscreen zoom.
     *
     * @private
     * @return {void}
     */
    enterfullscreenHandler() {
        this.pdfViewer.currentScaleValue = 'page-fit';
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
        this.resize();
    }

    /**
     * Scroll handler. Fires an event on start and stop
     *
     * @private
     * @return {void}
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
