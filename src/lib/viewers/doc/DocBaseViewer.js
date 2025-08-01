import React from 'react';
import throttle from 'lodash/throttle';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import ControlsRoot from '../controls/controls-root';
import DocControls from './DocControls';
import DocFindBar from './DocFindBar';
import PageTracker from '../../PageTracker';
import Popup from '../../Popup';
import PreviewError from '../../PreviewError';
import ThumbnailsSidebar from '../../ThumbnailsSidebar';
import Thumbnail from '../../Thumbnail';

import { AnnotationInput, AnnotationMode, AnnotationState } from '../../AnnotationControlsFSM';
import {
    ANNOTATOR_EVENT,
    CLASS_ANNOTATIONS_DOCUMENT_FTUX_CURSOR_SEEN,
    CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE_ACTIVE,
    CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE,
    CLASS_BOX_PREVIEW_THUMBNAILS_CONTAINER,
    CLASS_BOX_PREVIEW_THUMBNAILS_OPEN_ACTIVE,
    CLASS_BOX_PREVIEW_THUMBNAILS_OPEN,
    CLASS_CRAWLER,
    CLASS_HIDDEN,
    CLASS_IS_SCROLLABLE,
    DISCOVERABILITY_ATTRIBUTE,
    DOCUMENT_FTUX_CURSOR_SEEN_KEY,
    PERMISSION_DOWNLOAD,
    PRELOAD_REP_NAME,
    PRELOAD_PAGED_REP_NAME,
} from '../../constants';
import {
    createAssetUrlCreator,
    decodeKeydown,
    getClosestPageToPinch,
    getDistance,
    getMidpoint,
    getPreloadImageRequestPromises,
} from '../../util';
import { checkPermission, getRepresentation } from '../../file';
import { ICON_PRINT_CHECKMARK } from '../../icons';
import { CMAP, CSS, IMAGES, JS, PRELOAD_JS, EXIF_READER, WORKER, JS_NO_EXIF } from './docAssets';
import {
    ERROR_CODE,
    LOAD_METRIC,
    RENDER_EVENT,
    RENDER_METRIC,
    REPORT_ACI,
    USER_DOCUMENT_THUMBNAIL_EVENTS,
    VIEWER_EVENT,
} from '../../events';
import Timer from '../../Timer';
import { getFeatureConfig, isFeatureEnabled } from '../../featureChecking';

export const DISCOVERABILITY_STATES = [
    AnnotationState.HIGHLIGHT_TEMP,
    AnnotationState.NONE,
    AnnotationState.REGION_TEMP,
];

export const PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER = 'page_number';
const ACI_THUMB_MAX_WIDTH = 240;
const CURRENT_PAGE_MAP_KEY = 'doc-current-page-map';
const DEFAULT_SCALE_DELTA = 0.1;
const IS_SAFARI_CLASS = 'is-safari';
const LOAD_TIMEOUT_MS = 180000; // 3 min timeout
const MAX_PINCH_SCALE_VALUE = 3;
const MAX_SCALE = 10.0;
const MIN_PINCH_SCALE_DELTA = 0.01;
const MIN_PINCH_SCALE_VALUE = 0.25;
const MIN_SCALE = 0.1;
const METRICS_WHITELIST = [
    USER_DOCUMENT_THUMBNAIL_EVENTS.CLOSE,
    USER_DOCUMENT_THUMBNAIL_EVENTS.NAVIGATE,
    USER_DOCUMENT_THUMBNAIL_EVENTS.OPEN,
];
const MOBILE_MAX_CANVAS_SIZE = 2949120; // ~3MP 1920x1536
const PAGES_UNIT_NAME = 'pages';
const PDFJS_TEXT_LAYER_MODE = {
    DISABLE: 0, // Should match TextLayerMode enum in pdf_viewer.js
    ENABLE: 1,
    ENABLE_PERMISSIONS: 2,
};
const PINCH_PAGE_CLASS = 'pinch-page';
const PINCHING_CLASS = 'pinching';

const PRINT_DIALOG_TIMEOUT_MS = 500;
const RANGE_CHUNK_SIZE_NON_US = 524288; // 512KB
const RANGE_CHUNK_SIZE_US = 1048576; // 1MB
const RANGE_REQUEST_MINIMUM_SIZE = 26214400; // 25MB
const SAFARI_PRINT_TIMEOUT_MS = 1000; // Wait 1s before trying to print
const SCROLL_EVENT_THROTTLE_INTERVAL = 200;
const THUMBNAILS_SIDEBAR_TRANSITION_TIME = 301; // 301ms
const THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY = 'doc-thumbnails-toggled-map';

const MAX_OPERATIONS = 320000; // Block PDFs with more than 320,000 drawing operations
const MAX_OPERATION_PAGES = 5; // Check only the first 5 pages
const MAX_OPERATIONS_ERROR_MESSAGE = 'Too many drawing operations';

export function countPdfOperations(doc, maxPages = MAX_OPERATION_PAGES) {
    const numPages = Math.min(doc.numPages, maxPages);
    const opPromises = [];
    for (let i = 1; i <= numPages; i += 1) {
        opPromises.push(doc.getPage(i).then(page => page.getOperatorList().then(opList => opList.fnArray.length)));
    }
    return Promise.all(opPromises).then(opCounts => {
        return opCounts.reduce((sum, count) => sum + count, 0);
    });
}

class DocBaseViewer extends BaseViewer {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /** @property {Thumbnail} - Thumbnail reference */
    advancedInsightsThumbs;

    /** @property {PageTracker} - PageTracker instance */
    pageTracker;

    doc;

    /** @property {boolean} - DOC First Pages Enabled */
    docFirstPagesEnabled;

    /** @property {DocFirstPreloader|DocPreloader} - document preloader */
    preloader;

    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        // Bind context for callbacks
        this.applyCursorFtux = this.applyCursorFtux.bind(this);
        this.emitMetric = this.emitMetric.bind(this);
        this.handleAdvancedInsightsReport = this.handleAdvancedInsightsReport.bind(this);
        this.handleAssetAndRepLoad = this.handleAssetAndRepLoad.bind(this);
        this.handleFindBarClose = this.handleFindBarClose.bind(this);
        this.handleAnnotationColorChange = this.handleAnnotationColorChange.bind(this);
        this.handleAnnotationControlsClick = this.handleAnnotationControlsClick.bind(this);
        this.handleAnnotationControlsEscape = this.handleAnnotationControlsEscape.bind(this);
        this.handleAnnotationCreateEvent = this.handleAnnotationCreateEvent.bind(this);
        this.handleAnnotationCreatorChangeEvent = this.handleAnnotationCreatorChangeEvent.bind(this);
        this.handleDocElKeydown = this.handleDocElKeydown.bind(this);
        this.handlePageSubmit = this.handlePageSubmit.bind(this);
        this.onThumbnailSelectHandler = this.onThumbnailSelectHandler.bind(this);
        this.pagechangingHandler = this.pagechangingHandler.bind(this);
        this.pagerenderedHandler = this.pagerenderedHandler.bind(this);
        this.pagesinitHandler = this.pagesinitHandler.bind(this);
        this.pinchToZoomChangeHandler = this.pinchToZoomChangeHandler.bind(this);
        this.pinchToZoomEndHandler = this.pinchToZoomEndHandler.bind(this);
        this.pinchToZoomStartHandler = this.pinchToZoomStartHandler.bind(this);
        this.print = this.print.bind(this);
        this.setPage = this.setPage.bind(this);
        this.throttledScrollHandler = this.getScrollHandler().bind(this);
        this.toggleFindBar = this.toggleFindBar.bind(this);
        this.toggleThumbnails = this.toggleThumbnails.bind(this);
        this.updateExperiences = this.updateExperiences.bind(this);
        this.updateDiscoverabilityResinTag = this.updateDiscoverabilityResinTag.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);

        this.annotationControlsFSM.subscribe(this.applyCursorFtux);
        this.annotationControlsFSM.subscribe(this.updateDiscoverabilityResinTag);
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
        this.docFirstPagesEnabled = this.featureEnabled('docFirstPages.enabled');
        this.docEl = this.createViewer(document.createElement('div'));
        this.docEl.setAttribute('aria-label', __('document_label'));
        this.docEl.classList.add('bp-doc');
        this.docEl.tabIndex = '0';

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

        this.startPageNum = this.getStartPage(this.startAt);

        if (this.options.enableThumbnailsSidebar) {
            this.thumbnailsSidebarEl = document.createElement('nav');
            this.thumbnailsSidebarEl.className = `${CLASS_BOX_PREVIEW_THUMBNAILS_CONTAINER}`;
            this.thumbnailsSidebarEl.setAttribute('data-testid', 'thumbnails-sidebar');
            this.thumbnailsSidebarEl.setAttribute('aria-label', __('thumbnail_label'));
            this.thumbnailsSidebarEl.tabIndex = 0;
            this.rootEl.insertBefore(this.thumbnailsSidebarEl, this.containerEl);
        }

        this.updateDiscoverabilityResinTag();

        const advancedContentInsightsConfig = getFeatureConfig(this.options.features, 'advancedContentInsights');

        if (isFeatureEnabled(this.options.features, 'advancedContentInsights.enabled')) {
            this.pageTracker = new PageTracker(advancedContentInsightsConfig, this.options.file);
        }
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.unbindDOMListeners();
        this.unbindEventBusListeners();

        // Clean up print blob
        this.printBlob = null;

        if (this.printURL) {
            URL.revokeObjectURL(this.printURL);
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

        if (this.thumbnailsSidebar) {
            this.thumbnailsSidebar.destroy();
        }

        if (this.thumbnailsSidebarEl) {
            // Since we are cleaning up make sure the thumbnails open class is
            // removed so that the content div shifts back left
            this.rootEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
            this.rootEl.removeChild(this.thumbnailsSidebarEl);
            this.thumbnailsSidebarEl = null;
        }

        if (this.pageTracker) {
            this.pageTracker.destroy();
        }

        super.destroy();
    }

    /**
     * Unbinds all events on the internal PDFJS event bus
     *
     * @private
     * @return {void}
     */
    unbindEventBusListeners() {
        if (!this.pdfEventBus) {
            return;
        }

        const eventBusListeners = this.pdfEventBus._listeners || {};

        // EventBus does not have a destroy method, so iterate over and remove all subscribed event handlers
        Object.keys(eventBusListeners).forEach(eventName => {
            const eventListeners = eventBusListeners[eventName];

            if (Array.isArray(eventListeners)) {
                eventListeners.forEach(eventListener => {
                    this.pdfEventBus.off(eventName, eventListener);
                });
            }
        });
    }

    /**
     * Converts a value and unit to page number
     *
     * @param {Object} startAt - the unit and value that describes where to start the preview
     * @return {number|undefined} a page number > 0
     */
    getStartPage(startAt = {}) {
        let convertedValue;

        const { unit, value } = startAt;

        if (!value || !unit) {
            return convertedValue;
        }

        if (unit === PAGES_UNIT_NAME) {
            convertedValue = parseInt(value, 10);

            if (!convertedValue || convertedValue < 1) {
                // Negative values aren't allowed, fall back to default behavior
                return undefined;
            }
        } else {
            console.error('Invalid unit for start:', unit); // eslint-disable-line no-console
        }

        return convertedValue;
    }

    /**
     * Handles preload prefetching for non-watermarked files
     *
     * @private
     * @param {Object} file - The file object
     * @return {void}
     */
    prefetchPreloaderImages(file) {
        if (!file) {
            return;
        }
        /*
          Prefetched image urls will not match the urls that the preloader uses when shared link or shared password is set. This negates the benefit
          of prefetching the images. As a result we need to set the shared link and shared password to empty strings. It is possible 
          that these values are not even necessary for the representations api call as the code that sets them is old and 
          the reps api does not seem to use them when it retreives the image reps. Preloading can also include the actual pdf itself
          so we need to set the share link and shared link password back to what it was before after we are done prefetching the images.
          The options object is used downstream in thee url auth append logic and if the sharedLink and sharedLinkPassword are set it appends them
          to the query params for the representations api call. This stops this from happening.
          */

        const { sharedLink = '', sharedLinkPassword = '' } = this.options;
        this.options.sharedLink = '';
        this.options.sharedLinkPassword = '';

        const jpegPreloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        const pagedWebpRep = getRepresentation(file, PRELOAD_PAGED_REP_NAME);
        const pagedWebpRepReady =
            pagedWebpRep && this.isRepresentationReady(pagedWebpRep) && pagedWebpRep.content?.url_template;
        const jpegRepReady =
            jpegPreloadRep && this.isRepresentationReady(jpegPreloadRep) && jpegPreloadRep.content?.url_template;
        const onlyJpegRepAvailable = jpegRepReady && !pagedWebpRepReady;

        if (onlyJpegRepAvailable) {
            const { url_template: jpegUrlTemplate = '' } = jpegPreloadRep.content;
            const jpegUrlAuthTemplate = this.createContentUrlWithAuthParams(jpegUrlTemplate);
            const promises = getPreloadImageRequestPromises(this.api, jpegUrlAuthTemplate, 1, '');
            Promise.all(promises);
        } else if (pagedWebpRepReady) {
            const { url_template: pagedUrlTemplate = '' } = pagedWebpRep.content;
            const pageCount = pagedWebpRep.metadata?.pages || 8;
            const newPagedUrlTemplate = pagedUrlTemplate.replace(/\{.*\}/, PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER);
            const pagedUrlAuthTemplate = this.createContentUrlWithAuthParams(newPagedUrlTemplate);
            const promises = getPreloadImageRequestPromises(this.api, '', pageCount, pagedUrlAuthTemplate);
            Promise.all(promises);
        }
        this.options.sharedLink = sharedLink;
        this.options.sharedLinkPassword = sharedLinkPassword;
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
        const { file, representation, isDocFirstPrefetchEnabled } = this.options;
        const isWatermarked = file && file.watermark_info && file.watermark_info.is_watermarked;

        if (assets) {
            const ASSETS = this.docFirstPagesEnabled ? [...JS_NO_EXIF, ...EXIF_READER] : JS;
            this.prefetchAssets(ASSETS, CSS);
            this.prefetchAssets(PRELOAD_JS, [], true);
        }

        if (preload && !isWatermarked) {
            if (!isDocFirstPrefetchEnabled) {
                const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
                if (preloadRep && this.isRepresentationReady(preloadRep)) {
                    const { url_template: template } = preloadRep.content;

                    // Prefetch as blob since preload needs to load image as a blob
                    this.api.get(this.createContentUrlWithAuthParams(template), { type: 'blob' });
                }
            } else {
                this.prefetchPreloaderImages(file);
            }
        }

        if (content && !isWatermarked && this.isRepresentationReady(representation)) {
            const { url_template: template } = representation.content;
            this.api.get(this.createContentUrlWithAuthParams(template), { type: 'document' });
        }
    }

    /**
     * Loads the viewer assets as opposed to just prefetching them as a performance optimization. This means that the libraries will be loaded
     * into memory eliminating the need to load them when a preview is clicked.
     *
     * @return {void}
     */
    loadViewerAssets() {
        const ASSETS = this.docFirstPagesEnabled ? [...JS_NO_EXIF, ...EXIF_READER] : JS;
        this.loadAssets(ASSETS, CSS);
        this.loadAssets(PRELOAD_JS, []);
    }

    /**
     * Shows a preload (first page as an image) while the full document loads.
     *
     * @return {void}
     */
    showPreload() {
        const { file } = this.options;
        const isWatermarked = file && file.watermark_info && file.watermark_info.is_watermarked;

        // Don't show preload if there's a cached page or startAt is set and > 1 since preloads are only for the 1st page
        // Also don't show preloads for watermarked files
        if (
            !this.preloader ||
            isWatermarked ||
            (this.startPageNum && this.startPageNum !== 1) ||
            this.getCachedPage() !== 1
        ) {
            return;
        }

        // Don't show preload if there is no preload rep, the 'preload' viewer option isn't set, or the rep isn't ready
        const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        const preloadRepPaged = getRepresentation(file, PRELOAD_PAGED_REP_NAME);
        const pagedWebpRepReady = preloadRepPaged && this.isRepresentationReady(preloadRepPaged);
        const jpegRepReady = preloadRep && this.isRepresentationReady(preloadRep);
        if ((!pagedWebpRepReady && !jpegRepReady) || !this.getViewerOption('preload')) {
            return;
        }

        const { url_template: template = '' } = preloadRep?.content || {};
        const preloadUrlWithAuth = this.createContentUrlWithAuthParams(template);

        if (!this.docFirstPagesEnabled) {
            this.startPreloadTimer();
            this.preloader.showPreload(preloadUrlWithAuth, this.containerEl);
        } else {
            this.startPreloadTimer();
            if (!pagedWebpRepReady) {
                this.preloader.showPreload(preloadUrlWithAuth, this.containerEl, null, 1, this);
            } else {
                const { pages: pageCount = 1 } = preloadRepPaged?.metadata || {};
                const { url_template: pagedUrlTemplate = '' } = preloadRepPaged?.content || {};
                const newPagedUrlTemplate = pagedUrlTemplate.replace(/\{.*\}/, PAGED_URL_TEMPLATE_PAGE_NUMBER_HOLDER);
                const pagedPreLoadUrlWithAuth =
                    newPagedUrlTemplate && this.createContentUrlWithAuthParams(newPagedUrlTemplate);
                this.preloader.showPreload(null, this.containerEl, pagedPreLoadUrlWithAuth, pageCount, this);
            }
        }
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
        super.load();

        if (this.docFirstPagesEnabled) {
            // If there is an error and we are in a retry don't
            // re-render the preloader. Use the existing one.
            if (!this.preloader?.retrievedPagesCount) {
                this.loadAssets(EXIF_READER).then(() => {
                    this.showPreload();
                });
            }
        } else {
            this.showPreload();
        }

        const template = this.options.representation.content.url_template;
        this.pdfUrl = this.createContentUrlWithAuthParams(template);
        const jsAssets = this.docFirstPagesEnabled ? JS_NO_EXIF : JS;
        return Promise.all([this.loadAssets(jsAssets, CSS), this.getRepStatus().getPromise()])
            .then(this.handleAssetAndRepLoad)
            .catch(this.handleAssetError);
    }

    /**
     * Loads a document after assets and representation are ready.
     *
     * @override
     * @return {void}
     */
    handleAssetAndRepLoad() {
        this.setupPdfjs();
        this.initViewer(this.pdfUrl);
        this.initFind();
        this.initPrint();

        super.handleAssetAndRepLoad();
    }

    handleFindBarClose() {
        if (this.findBarToggleEl && this.findBarToggleEl.focus) {
            this.findBarToggleEl.focus();
        }
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
        const parsedPageNumber = parseInt(pageNumber, 10);
        // if the preloader has opened the thumbnails and the pdf has not finished loading go to the doc first page
        // for that thumbnail
        if (this.thumbnailsSidebar && this.preloader?.thumbnailsOpen && this.pdfViewer.pagesCount === 0) {
            this.cachePage(parsedPageNumber);
            const el = document.querySelector(`[data-preload-index="${parsedPageNumber}"]`);
            el.scrollIntoView({ behavior: 'instant', block: 'start' });
            this.thumbnailsSidebar.setCurrentPage(parsedPageNumber);
        } else if (!parsedPageNumber || parsedPageNumber < 1 || parsedPageNumber > this.pdfViewer.pagesCount) {
            return;
        }

        this.pdfViewer.currentPageNumber = parsedPageNumber;
        this.cachePage(this.pdfViewer.currentPageNumber);
        /*
        Don't set the page if the thumbnails from the preloader are already open and the
        pdf doc has loaded.This causes the virtual scroller to always scroll to the top
        */
        if (this.thumbnailsSidebar && !this.preloader?.thumbnailsOpen) {
            this.thumbnailsSidebar.setCurrentPage(parsedPageNumber);
        }
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
            newScale += DEFAULT_SCALE_DELTA;
            newScale = Math.min(MAX_SCALE, newScale.toFixed(3));
            numTicks -= 1;
        } while (numTicks > 0 && newScale < MAX_SCALE);

        this.updateScale(newScale);
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
            newScale -= DEFAULT_SCALE_DELTA;
            newScale = Math.max(MIN_SCALE, newScale.toFixed(3));
            numTicks -= 1;
        } while (numTicks > 0 && newScale > MIN_SCALE);

        this.updateScale(newScale);
    }

    /**
     * Updates the new scale to the pdfViewer as well as the zoom controls and emits an event
     * @param {number} newScale - New zoom scale
     * @emits zoom
     * @returns {void}
     */
    updateScale(newScale) {
        if (this.pdfViewer.currentScale !== newScale) {
            this.emit('zoom', {
                zoom: newScale,
                canZoomOut: newScale > MIN_SCALE,
                canZoomIn: newScale < MAX_SCALE,
            });
        }
        this.pdfViewer.currentScaleValue = newScale;
    }

    /**
     * Handles keyboard events for document viewer.
     *
     * @param {string} key - keydown key
     * @param {Object} event - Key event
     * @return {boolean} consumed or not
     */
    onKeydown(key, event) {
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
                if (this.findBar) {
                    return this.findBar.onKeydown(event);
                }
                return false;
        }

        return true;
    }

    /**
     * Emits a viewer metric. Useful for unpacking a message that comes from another class.
     *
     * @protected
     * @emits metric
     * @param {Object} event - Event object
     * @return {void}
     */
    emitMetric({ name, data }) {
        super.emitMetric(name, data);
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Loads PDF.js with provided PDF.
     *
     * @protected
     * @param {string} pdfUrl - The URL of the PDF to load
     * @return {Promise} Promise to initialize viewer (used for testing)
     */
    initViewer(pdfUrl) {
        this.bindDOMListeners();
        this.startLoadTimer();

        this.pdfEventBus = new this.pdfjsViewer.EventBus();
        this.pdfEventBus.on('pagechanging', this.pagechangingHandler);
        this.pdfEventBus.on('pagerendered', this.pagerenderedHandler);
        this.pdfEventBus.on('pagesinit', this.pagesinitHandler);

        this.pdfLinkService = new this.pdfjsViewer.PDFLinkService({
            eventBus: this.pdfEventBus,
            externalLinkRel: 'noopener noreferrer nofollow', // Prevent referrer hijacking
            externalLinkTarget: Browser.isIE() ? this.pdfjsLib.LinkTarget.BLANK : this.pdfjsViewer.LinkTarget.BLANK, // Open links in new tab
        });

        this.pdfFindController = new this.pdfjsViewer.PDFFindController({
            eventBus: this.pdfEventBus,
            linkService: this.pdfLinkService,
        });

        // Initialize pdf.js in container
        this.pdfViewer = this.initPdfViewer();
        this.pdfLinkService.setViewer(this.pdfViewer);

        const { file, location } = this.options;
        const { size, watermark_info: watermarkInfo } = file;
        const assetUrlCreator = createAssetUrlCreator(location);

        // Do not disable create object URL in IE11 or iOS Chrome - pdf.js issues #3977 and #8081 are
        // not applicable to Box's use case and disabling causes performance issues
        const disableCreateObjectURL = false;

        // Disable font faces on IOS 10.3.X
        const disableFontFace = Browser.hasFontIssue() || this.getViewerOption('disableFontFace');

        // Disable range requests for files smaller than minimum range request size
        const isRangeSupported = size >= (this.getViewerOption('rangeMinSize') || RANGE_REQUEST_MINIMUM_SIZE);
        const isWatermarked = watermarkInfo && watermarkInfo.is_watermarked;
        const disableRange = isWatermarked || !isRangeSupported;

        // Use larger chunk sizes because we assume that en-US users have better connections to Box's servers
        const rangeChunkSizeDefault = location.locale === 'en-US' ? RANGE_CHUNK_SIZE_US : RANGE_CHUNK_SIZE_NON_US;
        const rangeChunkSize = this.getViewerOption('rangeChunkSize') || rangeChunkSizeDefault;

        // Disable streaming by default unless it is explicitly enabled via options
        const disableStream = this.getViewerOption('disableStream') !== false;

        // Load PDF from representation URL and set as document for pdf.js. Cache task for destruction
        this.pdfLoadingTask = this.pdfjsLib.getDocument({
            cMapPacked: true,
            cMapUrl: assetUrlCreator(CMAP),
            disableCreateObjectURL,
            disableFontFace,
            disableRange,
            disableStream,
            isEvalSupported: false,
            rangeChunkSize,
            url: pdfUrl,
        });

        if (this.pageTracker) {
            this.addListener('preview_event_report', this.handlePreviewEventReport);
            this.pageTracker.addListener('page_tracker_report', this.handleAdvancedInsightsReport);
        }

        return this.pdfLoadingTask.promise
            .then(doc => {
                // Only check operations for .numbers files
                if (file.extension === 'numbers') {
                    return countPdfOperations(doc, MAX_OPERATION_PAGES).then(opCount => {
                        if (opCount > MAX_OPERATIONS) {
                            throw new Error(MAX_OPERATIONS_ERROR_MESSAGE);
                        }
                        return doc;
                    });
                }
                return doc;
            })
            .then(doc => {
                this.pdfLinkService.setDocument(doc, pdfUrl);
                this.pdfViewer.setDocument(doc);
                if (this.shouldThumbnailsBeToggled()) {
                    this.rootEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
                    this.emit(VIEWER_EVENT.thumbnailsOpen);
                    this.resize();
                }
                // store a reference to the doc for docfirstpages
                this.doc = doc;
            })
            .catch(err => {
                console.error(err); // eslint-disable-line

                // pdf.js gives us the status code in their error message
                const { status, message } = err;
                const isTooManyOps = message === MAX_OPERATIONS_ERROR_MESSAGE;

                let error;
                if (isTooManyOps) {
                    error = new PreviewError(
                        ERROR_CODE.VIEWER_TOO_MANY_OPERATIONS,
                        __('error_too_many_operations'),
                        message,
                    );
                } else if (status === 202) {
                    error = new PreviewError(
                        ERROR_CODE.DELETED_REPS,
                        __('error_refresh'),
                        { isRepDeleted: true },
                        message,
                    );
                } else {
                    error = new PreviewError(ERROR_CODE.CONTENT_DOWNLOAD, __('error_document'), message);
                }
                this.handleDownloadError(error, pdfUrl);
            });
    }

    /**
     * Initialize the pdf.js viewer.
     *
     * @protected
     * @return {pdfjsViewer.PDFViewer} PDF viewer type
     */
    initPdfViewer() {
        return this.initPdfViewerClass(this.pdfjsViewer.PDFViewer);
    }

    /**
     * Initialize the inner pdf.js viewer class.
     *
     * @protected
     * @param {Function} PdfViewerClass - the pdf viewer class (PDFViewer, PDFSinglePageViewer, etc.) to initailize
     * @returns {*}
     */
    initPdfViewerClass(PdfViewerClass) {
        const { file, location } = this.options;
        const { AnnotationMode: PDFAnnotationMode = {} } = this.pdfjsLib;
        const assetUrlCreator = createAssetUrlCreator(location);
        const hasDownload = checkPermission(file, PERMISSION_DOWNLOAD);
        const hasTextLayer = !this.getViewerOption('disableTextLayer');
        const enabledTextLayerMode = hasDownload
            ? PDFJS_TEXT_LAYER_MODE.ENABLE
            : PDFJS_TEXT_LAYER_MODE.ENABLE_PERMISSIONS; // This mode will prevent default behavior for copy events in the TextLayerBuilder

        // Text layer should be rendered for a11y reasons thats why we will block user from selecting content when no download permissions was granted
        if (!hasDownload) {
            this.viewerEl.classList.add('pdfViewer--viewOnly');
        }

        return new PdfViewerClass({
            annotationMode: PDFAnnotationMode.ENABLE, // Show annotations, but not forms
            container: this.docEl,
            eventBus: this.pdfEventBus,
            findController: this.pdfFindController,
            imageResourcesPath: assetUrlCreator(IMAGES),
            linkService: this.pdfLinkService,
            maxCanvasPixels: this.isMobile ? MOBILE_MAX_CANVAS_SIZE : -1,
            renderInteractiveForms: false, // Enabling prevents unverified signatures from being displayed
            textLayerMode: hasTextLayer ? enabledTextLayerMode : PDFJS_TEXT_LAYER_MODE.DISABLE,
        });
    }

    /**
     * Initializes the Find Bar
     *
     * @protected
     * @return {void}
     */
    initFind() {
        // Only initialize the find bar if the user has download permissions on
        // the file. Users without download permissions shouldn't be able to
        // interact with the text layer
        if (this.isFindDisabled()) {
            return;
        }

        this.findBar = new DocFindBar(this.containerEl, this.pdfFindController, this.pdfEventBus);
        this.findBar.addListener(VIEWER_EVENT.metric, this.emitMetric);
        this.findBar.addListener('close', this.handleFindBarClose);
    }

    /**
     * Determines if findbar is disabled
     *
     * @private
     * @return {boolean}
     */
    isFindDisabled() {
        const canDownload = checkPermission(this.options.file, PERMISSION_DOWNLOAD);
        return !canDownload || this.getViewerOption('disableFindBar');
    }

    /**
     * Re-sizing logic.
     *
     * @protected
     * @override
     * @return {void}
     */
    resize() {
        if (!this.pdfViewer || !this.somePageRendered) {
            if (!this.docFirstPagesEnabled && this.preloader) {
                this.preloader.resize();
            }
            return;
        }

        // Save page and return after resize

        const { currentPageNumber } = this.pdfViewer;

        this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue || 'auto';
        this.pdfViewer.update();

        if (!this.docFirstPagesEnabled) {
            this.setPage(currentPageNumber);
        }

        if (this.thumbnailsSidebar) {
            this.thumbnailsSidebar.resize();
        }

        super.resize();
    }

    /**
     * Starts timer for preload event
     *
     * @protected
     * @return {void}
     */
    startPreloadTimer() {
        const { file } = this.options;
        const tag = Timer.createTag(file.id, LOAD_METRIC.preloadTime);
        Timer.start(tag);
    }

    /**
     * Stop and report time to preload document
     *
     * @protected
     * @return {void}
     */
    stopPreloadTimer() {
        const { file } = this.options;
        const tag = Timer.createTag(file.id, LOAD_METRIC.preloadTime);
        const time = Timer.get(tag);

        if (!time || !time.start) {
            return;
        }

        Timer.stop(tag);
        this.emitMetric({
            name: LOAD_METRIC.previewPreloadEvent,
            data: time.elapsed,
        });
        Timer.reset(tag);
    }

    /**
     * Callback for preload event, from preloader.
     *
     * @protected
     * @return {void}
     */
    onPreload() {
        const { logger } = this.options;
        logger.setPreloaded();
        this.stopPreloadTimer();
        this.resetLoadTimeout(); // Some content is visible - reset load timeout
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
        this.pdfjsLib = window.pdfjsLib;
        this.pdfjsViewer = window.pdfjsViewer;

        // Set pdf.js worker source location
        const { location } = this.options;
        const assetUrlCreator = createAssetUrlCreator(location);

        this.pdfjsLib.GlobalWorkerOptions.workerSrc = assetUrlCreator(WORKER);
    }

    /**
     * Sets up print notification & prepare PDF for printing.
     *
     * @private
     * @return {void}
     */
    initPrint() {
        this.printPopup = new Popup(this.rootEl);

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
        [].forEach.call(pageEls, pageEl => {
            /* eslint-disable no-param-reassign */
            const { pageNumber } = pageEl.dataset;
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
        return this.api.get(pdfUrl, { type: 'blob' }).then(blob => {
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
     * Handles page submit by setting page and then setting focus
     *
     * @override
     * @return {void}
     */
    handlePageSubmit(page) {
        this.setPage(page);
        this.docEl.focus();
    }

    /**
     * Load controls
     *
     * @protected
     * @return {void}
     */
    loadUI() {
        this.controls = new ControlsRoot({ containerEl: this.containerEl, fileId: this.options.file.id });
        this.annotationControlsFSM.subscribe(() => this.renderUI());
        this.renderUI();
    }

    /**
     * Updates experiences option after props have changed in parent app
     *
     * @protected
     * @param {Object} experiences - new experiences prop
     * @return {void}
     */
    updateExperiences(experiences) {
        this.experiences = experiences;

        this.renderUI();
    }

    /**
     * Render controls
     *
     * @protected
     * @return {void}
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        const { enableThumbnailsSidebar, showAnnotationsDrawingCreate } = this.options;
        const canAnnotate = this.areNewAnnotationsEnabled() && this.hasAnnotationCreatePermission();
        const canDownload = checkPermission(this.options.file, PERMISSION_DOWNLOAD);

        this.controls.render(
            <DocControls
                annotationColor={this.annotationModule.getColor()}
                annotationMode={this.annotationControlsFSM.getMode()}
                experiences={this.experiences}
                hasDrawing={canAnnotate && showAnnotationsDrawingCreate}
                hasHighlight={canAnnotate && canDownload}
                hasRegion={canAnnotate}
                isThumbnailsOpen={this.thumbnailsSidebar && this.thumbnailsSidebar.isOpen}
                maxScale={MAX_SCALE}
                minScale={MIN_SCALE}
                onAnnotationColorChange={this.handleAnnotationColorChange}
                onAnnotationModeClick={this.handleAnnotationControlsClick}
                onAnnotationModeEscape={this.handleAnnotationControlsEscape}
                onFindBarToggle={!this.isFindDisabled() ? this.toggleFindBar : undefined}
                onFullscreenToggle={this.toggleFullscreen}
                onPageChange={this.setPage}
                onPageSubmit={this.handlePageSubmit}
                onThumbnailsToggle={enableThumbnailsSidebar ? this.toggleThumbnails : undefined}
                onZoomIn={this.zoomIn}
                onZoomOut={this.zoomOut}
                pageCount={this.pdfViewer.pagesCount}
                pageNumber={this.pdfViewer.currentPageNumber}
                scale={this.pdfViewer.currentScale}
            />,
        );
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
        this.docEl.addEventListener('keydown', this.handleDocElKeydown);
        this.docEl.addEventListener('scroll', this.throttledScrollHandler);

        if (this.hasTouch) {
            this.docEl.addEventListener('touchstart', this.pinchToZoomStartHandler);
            this.docEl.addEventListener('touchmove', this.pinchToZoomChangeHandler);
            this.docEl.addEventListener('touchend', this.pinchToZoomEndHandler);
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
            this.docEl.removeEventListener('keydown', this.handleDocElKeydown);
            this.docEl.removeEventListener('scroll', this.throttledScrollHandler);

            if (this.hasTouch) {
                this.docEl.removeEventListener('touchstart', this.pinchToZoomStartHandler);
                this.docEl.removeEventListener('touchmove', this.pinchToZoomChangeHandler);
                this.docEl.removeEventListener('touchend', this.pinchToZoomEndHandler);
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
        this.pdfViewer.currentScaleValue = 'auto';
        this.loadUI();

        const { pagesCount, currentScale } = this.pdfViewer;

        // Set page to the user-defined page, previously opened page, or first page
        const startPage = this.startPageNum || this.getCachedPage();
        this.setPage(startPage);

        // Make document scrollable after pages are set up so scrollbars don't mess with autoscaling
        this.docEl.classList.add(CLASS_IS_SCROLLABLE);

        // Broadcast that preview has 'loaded' when page structure is available
        if (!this.loaded) {
            this.loaded = true;
            if (this.pageTracker) {
                this.pageTracker.setCurrentPage(startPage);
                this.pageTracker.setFileLength(pagesCount);
                if (this.pageTracker.isActive()) {
                    this.pageTracker.init();
                }
            }
            this.emit(VIEWER_EVENT.load, {
                numPages: pagesCount,
                scale: currentScale,
                currentPage: startPage,
            });

            // Add page IDs to each page after page structure is available
            this.setupPageIds();
        }
    }

    /**
     * Initialize the Thumbnails Sidebar
     *
     * @return {void}
     */
    initThumbnails() {
        // if the preloader has initialized the thumbnails sidebar don't reinitialize it when the pdf loads
        // we only need one thumbnail sidebar for both the preloader and the pdfViewer
        if (!this.thumbnailsSidebar) {
            this.thumbnailsSidebar = new ThumbnailsSidebar(this.thumbnailsSidebarEl, this.pdfViewer, this.preloader);

            this.thumbnailsSidebar.init({
                currentPage: this.pdfViewer?.currentPageNumber,
                isOpen: this.shouldThumbnailsBeToggled(),
                onSelect: this.onThumbnailSelectHandler,
            });
        } else {
            // if preloader has finished and the document has loaded start rendering the remaining thumbnails
            this.thumbnailsSidebar.renderNextThumbnailImage();
        }
    }

    /**
     * Handles the selection of a thumbnail for navigation
     *
     * @param {number} pageNum - the page number
     * @return {void}
     */
    onThumbnailSelectHandler(pageNum) {
        this.emitMetric({ name: USER_DOCUMENT_THUMBNAIL_EVENTS.NAVIGATE, data: pageNum });
        this.setPage(pageNum);
    }

    /**
     * Handler for 'pagerendered' event.
     *
     * @private
     * @param {Event} event - 'pagerendered' event
     * @return {void}
     */
    pagerenderedHandler({ pageNumber }) {
        if (!pageNumber) {
            return;
        }

        this.renderUI();

        // Page rendered event
        this.emit('pagerender', pageNumber);

        // Set scale to current numerical scale & rendered page number
        this.emit('scale', {
            scale: this.pdfViewer.currentScale,
            pageNum: pageNumber,
        });

        // Cleanup preload after a page is rendered
        if (!this.somePageRendered) {
            this.hidePreload();
            this.somePageRendered = true;

            if (this.options.enableThumbnailsSidebar) {
                this.initThumbnails();
                this.resize();
            }
        }

        // Preloader will only be used if we're not using a cached page number.
        // This is why we need to emit the event here and not in the block below
        if (!this.startPageRendered && pageNumber === 1 && this.preloader?.loadTime && this.preloader?.isWebp) {
            const timeDiff = Date.now() - this.preloader.loadTime;
            this.emitMetric({
                name: LOAD_METRIC.preloadContentLoadTimeDiff,
                data: timeDiff,
            });
        }

        // Fire rendered metric to indicate that the specific page of content the user requested has been shown
        if (!this.startPageRendered && (this.startPageNum === pageNumber || this.getCachedPage() === pageNumber)) {
            const pageRenderTag = Timer.createTag(this.options.file.id, RENDER_METRIC);
            const pageRenderTime = Timer.stop(pageRenderTag);

            if (pageRenderTime) {
                this.emitMetric({
                    name: RENDER_EVENT,
                    data: pageRenderTime.elapsed,
                });
                this.startPageRendered = true;
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
    pagechangingHandler(event) {
        const { pageNumber } = event;

        this.renderUI();

        if (this.thumbnailsSidebar) {
            this.thumbnailsSidebar.setCurrentPage(pageNumber);
        }

        // We only set cache the current page if 'pagechange' was fired after
        // preview is loaded - this filters out pagechange events fired by
        // the viewer's initialization
        if (this.loaded) {
            this.cachePage(pageNumber);
        }

        this.emit('pagefocus', pageNumber);

        if (this.pageTracker) {
            this.pageTracker.handleViewerPageChange(pageNumber);
        }
    }

    /**
     * Handler for 'keydown' event on the bp-doc element. These conditions cannot be managed in onKeydown, as
     * it listens for events on the top-level document element.
     *
     * @private
     * @param {KeyboardEvent} event - Keydown event
     * @return {void}
     */
    handleDocElKeydown(event) {
        const key = decodeKeydown(event);

        if (event.altKey && key.includes('Arrow')) {
            event.stopPropagation(); // Prevent collection/page navigation for caret navigation users
        }
    }

    /** @inheritDoc */
    handleFullscreenEnter() {
        this.pdfViewer.currentScaleValue = 'page-fit';
        super.handleFullscreenEnter();
    }

    /** @inheritDoc */
    handleFullscreenExit() {
        this.pdfViewer.currentScaleValue = 'auto';
        super.handleFullscreenExit();

        if (this.annotator && this.areNewAnnotationsEnabled() && this.options.enableAnnotationsDiscoverability) {
            this.annotator.toggleAnnotationMode(AnnotationMode.REGION);
        }
    }

    /**
     * Returns throttled handler. Fires an event on start and stop
     *
     * @private
     * @return {void}
     */
    getScrollHandler() {
        return throttle(() => {
            // Reset the scroll timer if we are continuing a scroll
            if (this.scrollTimer) {
                clearTimeout(this.scrollTimer);
            }

            // only fire the scroll start event if this is a new scroll
            if (!this.scrollStarted) {
                this.emit('scrollstart', {
                    scrollTop: this.docEl.scrollTop,
                    scrollLeft: this.docEl.scrollLeft,
                });
                this.scrollStarted = true;
            }

            this.scrollTimer = setTimeout(
                () => {
                    this.emit('scrollend', {
                        scrollTop: this.docEl.scrollTop,
                        scrollLeft: this.docEl.scrollLeft,
                    });
                    this.scrollStarted = false;
                },
                this.isMobile ? 500 : 250,
            );
        }, SCROLL_EVENT_THROTTLE_INTERVAL);
    }

    /**
     * Sets up pinch to zoom behavior by wrapping zoomed divs and determining the original pinch distance.
     *
     * @protected
     * @param {Event} event - object
     * @return {void}
     */
    pinchToZoomStartHandler(event) {
        if (event.touches.length < 2) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        this.isPinching = true;

        // Determine the midpoint of our pinch event if it is not provided for us
        const touchMidpoint =
            event.pageX && event.pageY
                ? [event.pageX, event.pageY]
                : getMidpoint(
                      event.touches[0].pageX,
                      event.touches[0].pageY,
                      event.touches[1].pageX,
                      event.touches[1].pageY,
                  );

        // Find the page closest to the pinch
        const visiblePages = this.pdfViewer._getVisiblePages();
        this.pinchPage = getClosestPageToPinch(
            this.docEl.scrollLeft + touchMidpoint[0],
            this.docEl.scrollTop + touchMidpoint[1],
            visiblePages,
        );

        // Set the scale point based on the pinch midpoint and scroll offsets
        this.scaledXOffset = this.docEl.scrollLeft - this.pinchPage.offsetLeft + touchMidpoint[0];
        this.scaledYOffset = this.docEl.scrollTop - this.pinchPage.offsetTop + touchMidpoint[1] + 15;

        this.pinchPage.style['transform-origin'] = `${this.scaledXOffset}px ${this.scaledYOffset}px`;

        // Preserve the original touch offset
        this.originalXOffset = touchMidpoint[0];
        this.originalYOffset = touchMidpoint[1];

        // Used by non-iOS browsers that do not provide a scale value
        this.originalDistance = getDistance(
            event.touches[0].pageX,
            event.touches[0].pageY,
            event.touches[1].pageX,
            event.touches[1].pageY,
        );
    }

    /**
     * Updates the CSS transform zoom based on the distance of the pinch gesture.
     *
     * @protected
     * @param {Event} event - object
     * @return {void}
     */
    pinchToZoomChangeHandler(event) {
        if (!this.isPinching) {
            return;
        }

        const scale = event.scale
            ? event.scale
            : getDistance(
                  event.touches[0].pageX,
                  event.touches[0].pageY,
                  event.touches[1].pageX,
                  event.touches[1].pageY,
              ) / this.originalDistance;

        const proposedNewScale = this.pdfViewer.currentScale * scale;
        if (
            scale === 1 ||
            Math.abs(this.pinchScale - scale) < MIN_PINCH_SCALE_DELTA ||
            proposedNewScale >= MAX_SCALE ||
            proposedNewScale <= MIN_SCALE ||
            scale > MAX_PINCH_SCALE_VALUE ||
            scale < MIN_PINCH_SCALE_VALUE
        ) {
            // There are a variety of circumstances where we don't want to scale'
            // 1. We haven't detected a changes
            // 2. The change isn't significant enough
            // 3. We will exceed our max or min scale
            // 4. The scale is too significant, which can lead to performance issues
            return;
        }

        this.pinchScale = scale;
        this.pinchPage.classList.add(PINCH_PAGE_CLASS);
        this.docEl.firstChild.classList.add(PINCHING_CLASS);

        this.pinchPage.style.transform = `scale(${this.pinchScale})`;
    }

    /**
     * Replaces the CSS transform with a native PDF.js zoom and scrolls to maintain positioning.
     *
     * @protected
     * @return {void}
     */
    pinchToZoomEndHandler() {
        if (!this.pinchPage || !this.isPinching || this.pinchScale === 1) {
            return;
        }

        // PDF.js zoom
        this.pdfViewer.currentScaleValue = this.pdfViewer.currentScale * this.pinchScale;

        this.pinchPage.style.transform = null;
        this.pinchPage.style['transform-origin'] = null;
        this.pinchPage.classList.remove(PINCH_PAGE_CLASS);
        this.docEl.firstChild.classList.remove(PINCHING_CLASS);

        // Scroll to correct position after zoom
        this.docEl.scroll(
            this.scaledXOffset * this.pinchScale - this.originalXOffset,
            this.scaledYOffset * this.pinchScale - this.originalYOffset + this.pinchPage.offsetTop,
        );

        this.isPinching = false;
        this.originalDistance = 0;
        this.pinchScale = 1;
        this.pinchPage = null;
    }

    toggleFindBar(findBarToggleEl) {
        this.findBarToggleEl = findBarToggleEl;
        this.findBar.toggle();
    }

    /**
     * Callback when the toggle thumbnail sidebar button is clicked.
     *
     * @protected
     * @return {void}
     */
    toggleThumbnails() {
        if (!this.thumbnailsSidebar) {
            return;
        }

        this.thumbnailsSidebar.toggle();

        const { pagesCount } = this.pdfViewer;

        this.cacheThumbnailsToggledState(this.thumbnailsSidebar.isOpen);

        let metricName;
        let eventName;
        if (!this.thumbnailsSidebar.isOpen) {
            this.rootEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
            this.rootEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE);
            this.rootEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE_ACTIVE);
            metricName = USER_DOCUMENT_THUMBNAIL_EVENTS.CLOSE;
            eventName = VIEWER_EVENT.thumbnailsClose;
        } else {
            this.rootEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE);
            this.rootEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
            this.rootEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN_ACTIVE);
            metricName = USER_DOCUMENT_THUMBNAIL_EVENTS.OPEN;
            eventName = VIEWER_EVENT.thumbnailsOpen;
        }

        this.emitMetric({ name: metricName, data: pagesCount });
        this.emit(eventName);

        // Resize after the CSS animation to toggle the sidebar is complete
        setTimeout(() => {
            this.resize();

            // Remove the active classes to allow the container to be transitioned properly
            this.rootEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAILS_CLOSE_ACTIVE);
            this.rootEl.classList.remove(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN_ACTIVE);
        }, THUMBNAILS_SIDEBAR_TRANSITION_TIME);
    }

    /**
     * Overrides the base method
     *
     * @override
     * @return {Array} - the array of metric names to be emitted only once
     */
    getMetricsWhitelist() {
        return METRICS_WHITELIST;
    }

    /**
     * Extra handling of the annotation mode enter and exit events in order to apply
     * the dark styling to the thumbnails sidebar
     * @override
     */
    handleAnnotatorEvents(data) {
        super.handleAnnotatorEvents(data);

        if (!this.thumbnailsSidebarEl) {
            return;
        }

        switch (data.event) {
            case ANNOTATOR_EVENT.modeEnter:
                this.thumbnailsSidebarEl.classList.add('bp-thumbnails-container--dark');
                break;
            case ANNOTATOR_EVENT.modeExit:
                this.thumbnailsSidebarEl.classList.remove('bp-thumbnails-container--dark');
                break;
            default:
        }
    }

    /**
     * Gets the cached thumbnails toggled state based on file id. Will retrieve from
     * localStorage if not cached.
     * @return {boolean} Whether thumbnails is toggled open or not from the cache
     */
    getCachedThumbnailsToggledState() {
        const { [this.options.file.id]: toggledOpen } = this.cache.get(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY) || {};
        return toggledOpen;
    }

    /**
     * Caches the toggled state of the thumbnails sidebar, also saving to localStorage
     * @param {boolean} isOpen Toggled state of the sidebar
     * @return {void}
     */
    cacheThumbnailsToggledState(isOpen) {
        const thumbnailsToggledMap = this.cache.get(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY) || {};
        const newThumbnailsToggledMap = { ...thumbnailsToggledMap, [this.options.file.id]: !!isOpen };

        this.cache.set(THUMBNAILS_SIDEBAR_TOGGLED_MAP_KEY, newThumbnailsToggledMap, true /* useLocalStorage */);
    }

    /**
     * Determines if the thumbnails sidebar should be toggled
     * @return {boolean} Whether thumbnails should be toggled open or not
     */
    shouldThumbnailsBeToggled() {
        if (!this.options.enableThumbnailsSidebar) {
            return false;
        }

        const cachedToggledState = this.getCachedThumbnailsToggledState();
        // `pdfViewer.pagesCount` isn't immediately available after pdfViewer.setDocument()
        // is called, but the numPages is available on the underlying pdfViewer.pdfDocument
        const { numPages = 0 } = (this.pdfViewer && this.pdfViewer.pdfDocument) || this.preloader;
        let toggledState = cachedToggledState;

        // If cached toggled state is anything other than false, set it to true
        // because we want the default state to be true
        if (toggledState !== false) {
            toggledState = true;
        }

        // For documents of only 1 page, default thumbnails as closed
        return toggledState && numPages > 1;
    }

    // Annotation overrides
    getInitialAnnotationMode() {
        return this.options.enableAnnotationsDiscoverability ? AnnotationMode.REGION : AnnotationMode.NONE;
    }

    initAnnotations() {
        super.initAnnotations();

        if (this.areNewAnnotationsEnabled()) {
            this.annotator.addListener('annotations_create', this.handleAnnotationCreateEvent);
            this.annotator.addListener('creator_staged_change', this.handleAnnotationCreatorChangeEvent);
            this.annotator.addListener('creator_status_change', this.handleAnnotationCreatorChangeEvent);
        }
    }

    handleAnnotationColorChange(color) {
        this.annotationModule.setColor(color);
        this.annotator.emit(ANNOTATOR_EVENT.setColor, color);
        this.renderUI();
    }

    handleAnnotationControlsClick({ mode }) {
        const nextMode = this.annotationControlsFSM.transition(AnnotationInput.CLICK, mode);
        this.annotator.toggleAnnotationMode(
            this.options.enableAnnotationsDiscoverability && nextMode === AnnotationMode.NONE
                ? AnnotationMode.REGION
                : nextMode,
        );
        this.processAnnotationModeChange(nextMode);
    }

    handleAnnotationControlsEscape() {
        if (this.options.enableAnnotationsDiscoverability) {
            this.annotator.toggleAnnotationMode(AnnotationMode.REGION);
            this.processAnnotationModeChange(this.annotationControlsFSM.transition(AnnotationInput.RESET));
        } else {
            this.annotator.toggleAnnotationMode(AnnotationMode.NONE);
        }
    }

    handleAnnotationCreateEvent({ annotation: { id } = {}, meta: { status } = {} }) {
        // Only on success do we exit create annotation mode. If error occurs,
        // we remain in create mode
        if (status === 'success') {
            this.annotator.emit('annotations_active_set', id);

            this.processAnnotationModeChange(this.annotationControlsFSM.transition(AnnotationInput.SUCCESS));
        }
    }

    handleAnnotationCreatorChangeEvent({ status, type }) {
        this.processAnnotationModeChange(this.annotationControlsFSM.transition(status, type));
    }

    updateDiscoverabilityResinTag() {
        if (!this.containerEl) {
            return;
        }

        const controlsState = this.annotationControlsFSM.getState();
        const isDiscoverable = DISCOVERABILITY_STATES.includes(controlsState);
        const isUsingDiscoverability = this.options.enableAnnotationsDiscoverability && isDiscoverable;

        // For tracking purposes, set property to true when the annotation controls are in a state
        // in which the default discoverability experience is enabled
        this.containerEl.setAttribute(DISCOVERABILITY_ATTRIBUTE, isUsingDiscoverability);
    }

    /**
     * Hides the create region cursor popup for a document
     *
     * @protected
     * @return {void}
     */
    applyCursorFtux() {
        if (!this.containerEl || this.annotationControlsFSM.getState() !== AnnotationState.REGION) {
            return;
        }

        if (this.cache.get(DOCUMENT_FTUX_CURSOR_SEEN_KEY)) {
            this.containerEl.classList.add(CLASS_ANNOTATIONS_DOCUMENT_FTUX_CURSOR_SEEN);
        } else {
            this.cache.set(DOCUMENT_FTUX_CURSOR_SEEN_KEY, true, true);
        }
    }

    /**
     * Get the session id for the current preview if advanced insights is enabled.
     *
     * @protected
     * @return {string | null} sessionId - Session id
     */
    getSessionId() {
        if (this.pageTracker) {
            return this.pageTracker.getSessionId();
        }
        return null;
    }

    /**
     * Get a thumbnail image element
     *
     * @param {number} pageNumber - the page number
     * @return {Promise} - promise resolves with the image HTMLElement or null if generation is in progress
     */
    getThumbnail(pageNumber) {
        if (!this.advancedInsightsThumbs) {
            this.advancedInsightsThumbs = new Thumbnail(this.pdfViewer);
        }

        return this.advancedInsightsThumbs.createThumbnailImage(pageNumber - 1, {
            createImgTag: true,
            thumbMaxWidth: ACI_THUMB_MAX_WIDTH,
        });
    }

    /**
     * Emit the report event so it can be propagated to parent listeners
     *
     * @protected
     * @param {Object} data - Event payload
     * @return {void}
     */
    handleAdvancedInsightsReport(data) {
        this.emit(REPORT_ACI, data);
    }

    /**
     * Set the preview event reported to the page tracker so it can start send Advanced Insights
     * requests. If the event fails, destroy the tracker.
     *
     * @protected
     * @param {boolean} success - Whether if the preview event was successfully reported or not
     * @return {void}
     */
    handlePreviewEventReport(success) {
        if (this.pageTracker) {
            if (success) {
                this.pageTracker.setPreviewEventReported(success);
            } else {
                this.pageTracker.destroy();
                this.pageTracker = null;
            }
        }
    }
}

export default DocBaseViewer;
