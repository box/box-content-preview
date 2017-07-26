import BaseViewer from '../BaseViewer';
import { getRepresentation } from '../../file';
import RepStatus from '../../RepStatus';
import DocPreloader from './DocPreloader';
import ImagePageLoader from './ImagePageLoader';
import { PRELOAD_REP_NAME, STATUS_ERROR } from '../../constants';
import Controls from '../../Controls';
import PageControls from '../../PageControls';
import { pageNumberFromScroll } from '../../util';

import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT, ICON_ZOOM_IN, ICON_ZOOM_OUT } from '../../icons/icons';

import './ImageDocViewer.scss';

const INITIAL_NUM_PAGES_TO_LOAD = 5;
const PAGE_PADDING = 15;
const MAX_CONCURRENT_PAGES = 7;

class ImageDocViewer extends BaseViewer {
    constructor(options) {
        super(options);

        this.pageLoadedHandler = this.pageLoadedHandler.bind(this);
        this.scrollHandler = this.scrollHandler.bind(this);
        this.setPage = this.setPage.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.handlePageChangeFromScroll = this.handlePageChangeFromScroll.bind(this);

        this.loadedPages = [];
    }
    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = this.fileLoadingIcon;

        // Call super() to set up common layout
        super.setup();

        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('bp-doc');
        this.docEl.classList.add('bp-doc-simple-document');

        this.pageWrapperEl = this.docEl.appendChild(document.createElement('div'));
        this.spacerDiv = this.pageWrapperEl.appendChild(document.createElement('div'));
        this.spacerDiv.style.height = '0px';
        this.spacerDiv.style.width = '100%';

        // Set up preloader
        this.preloader = new DocPreloader(this.previewUI);
        this.preloader.addListener('preload', () => {
            this.options.logger.setPreloaded();
            this.resetLoadTimeout(); // Some content is visible - reset load timeout
        });

        this.pageLoader = new ImagePageLoader(this.options);

        this.currentPageNumber = 1;
        this.previousScrollTop = 0;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.docEl = null;
        super.destroy();
    }

    load() {
        this.setup();
        this.bindDOMListeners();
        super.load();

        this.showPreload();

        this.pageLoader
            .getInitialRep(this.containerEl.clientHeight, this.containerEl.clientWidth)
            .then((representation) => {
                this.currentRepresentation = representation;
                this.pageEls = [];
                this.pagesCount = representation.metadata.pages;

                this.setInitialHeight();
                this.constructInitialPages();

                this.pageEls.forEach((page) => {
                    this.loadPage(page, representation);
                });
            })
            .catch((e) => {
                /* eslint-disable no-console */
                console.error(e);
                /* eslint-enable no-console */
            });
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
        if (!this.preloader || isWatermarked) {
            // || this.getCachedPage() !== 1) {
            return;
        }

        // Don't show preload if there is no preload rep, the 'preload' viewer option isn't set,
        // or the rep has an error
        const preloadRep = getRepresentation(file, PRELOAD_REP_NAME);
        if (!preloadRep || RepStatus.getStatus(preloadRep) === STATUS_ERROR) {
            // || !this.getViewerOption('preload')) {
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

    setInitialHeight() {
        this.pageWrapperEl.style.height = `${this.pagesCount * (1024 + PAGE_PADDING)}px`;
    }

    constructInitialPages() {
        for (let pageNum = 1; pageNum <= Math.min(this.pagesCount, INITIAL_NUM_PAGES_TO_LOAD); pageNum++) {
            this.constructPage(pageNum, false);
        }
    }

    loadPage(page, representation) {
        const { content } = representation;
        const asset = this.options.viewer.ASSET;
        const pageNum = page.getAttribute('data-page-number');
        let url = this.createContentUrlWithAuthParams(content.url_template, asset);
        url = url.replace(asset, `${pageNum}.png`);
        const contentLayerEl = page.querySelector('img');
        contentLayerEl.src = url;
        contentLayerEl.addEventListener('load', this.pageLoadedHandler);
    }

    removePage(pageNumber) {
        const page = this.docEl.querySelector(`[data-page-number="${pageNumber}"]`);
        page.parentNode.removeChild(page);
        this.pageEls = this.pageEls.filter((pageEl) => {
            return this.getIntVal(pageEl.getAttribute('data-page-number')) !== pageNumber;
        });
    }

    constructPage(pageNum, prepend) {
        const pageEl = document.createElement('div');
        if (prepend) {
            this.pageWrapperEl.insertBefore(pageEl, this.pageWrapperEl.firstChild.nextSibling);
        } else {
            this.pageWrapperEl.appendChild(pageEl);
        }

        const contentEl = pageEl.appendChild(document.createElement('img'));
        pageEl.classList.add('bp-page');
        pageEl.setAttribute('data-page-number', pageNum);
        contentEl.classList.add('bp-invisible');

        // Add error handler
        if (prepend) {
            this.pageEls.splice(0, 0, pageEl);
        } else {
            this.pageEls.push(pageEl);
        }
    }

    pageLoadedHandler(event) {
        const pageNumber = event.target.parentNode.getAttribute('data-page-number');
        if (!this.loaded && pageNumber === '1') {
            this.hidePreload();
            this.emit('progressend');
            this.loaded = true;
            this.emit('load');
            this.loadUI();
        }

        if (!this.loadedPages.includes(pageNumber)) {
            this.pageWrapperEl.style.height = `${this.getIntVal(this.pageWrapperEl.style.height) -
                (1024 - event.target.height + PAGE_PADDING)}px`;

            if (this.getIntVal(pageNumber) === this.pagesCount) {
                this.pageWrapperEl.style.height = event.target.parentNode.offsetTop + event.target.height;
            }
        }

        event.target.classList.remove('bp-invisible');
        this.loadedPages.push(pageNumber);
    }

    bindDOMListeners() {
        this.docEl.addEventListener('scroll', this.scrollHandler);
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

    bindControlListeners() {
        this.controls.add(__('zoom_out'), this.zoomOut, 'bp-doc-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'bp-doc-zoom-in-icon', ICON_ZOOM_IN);

        this.pageControls.add(this.currentPageNumber, this.pagesCount);

        this.controls.add(
            __('enter_fullscreen'),
            this.toggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN
        );
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Go to previous page
     *
     * @return {void}
     */
    previousPage() {
        this.setPage(this.currentPageNumber - 1);
    }

    /**
     * Go to next page
     *
     * @return {void}
     */
    nextPage() {
        this.setPage(this.currentPageNumber + 1);
    }

    /**
     * Determines if the requested page change is valid
     *
     * @private
     * @param {number} pageNumber - Requested page number
     * @return {void}
     */
    isValidPageChange(pageNumber) {
        return pageNumber >= 1 && pageNumber <= this.pagesCount && pageNumber !== this.currentPageNumber;
    }

    /**
     * Go to specified page
     *
     * @param {number} pageNumber - Page to navigate to
     * @return {void}
     */
    setPage(pageNumber) {
        if (!this.isValidPageChange(pageNumber)) {
            return;
        }

        const page = this.pageEls.find((pageEl) => {
            return this.getIntVal(pageEl.getAttribute('data-page-number')) === pageNumber;
        });

        page.scrollIntoView();
        console.log(this.docEl.scrollTop);
        this.docEl.scrollTop -= 15;
        console.log(this.docEl.scrollTop);

        this.updateCurrentPage(pageNumber);
    }

    /**
     * Handles zoom
     *
     * @private
     * @param {string} [type] - Type of zoom in|out|reset
     * @return {void}
     */
    zoom() {
        // no-op for now
    }

    /**
     * Handles zoom in
     *
     * @private
     * @return {void}
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Handles zoom out
     *
     * @private
     * @return {void}
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Updates the current page
     *
     * @param {number} pageNumber - Page to set
     * @return {void}
     */

    updateCurrentPage(pageNumber) {
        if (!this.isValidPageChange(pageNumber)) {
            return;
        }

        this.onPageChanged(pageNumber);

        this.currentPageNumber = pageNumber;
        this.pageControls.updateCurrentPage(pageNumber);

        this.emit('pagefocus', {
            pageNumber
        });
    }

    /**
     * Handles scroll event in the wrapper element
     *
     * @private
     * @return {void}
     */
    scrollHandler() {
        if (this.scrollCheckHandler) {
            return;
        }

        const imageScrollHandler = this.handlePageChangeFromScroll;
        this.scrollCheckHandler = window.requestAnimationFrame(imageScrollHandler);
    }

    /**
     * Handles page changes due to scrolling
     *
     * @private
     * @return {void}
     */
    handlePageChangeFromScroll() {
        const pageChange = pageNumberFromScroll(
            this.currentPageNumber,
            this.previousScrollTop,
            this.pageEls[this.currentPageNumber - 1],
            this.docEl
        );

        this.updateCurrentPage(pageChange);
        this.scrollCheckHandler = null;
        this.previousScrollTop = this.docEl.scrollTop;
    }

    onPageChanged(pageNumber) {
        // const isNewPageLoaded = this.pageEls.filter((pageEl) => {
        //     const pageNum = pageEl.getAttribute('data-page-number');
        //     return pageNum === pageNumber;
        // });
        //
        // if (!isNewPageLoaded) {
        //     // We jumped, might need to wipe the whole array of pages and set up a new one
        // }

        const earliestPageLoaded = this.getIntVal(this.pageEls[0].getAttribute('data-page-number'));
        const latestPageLoaded = this.getIntVal(this.pageEls[this.pageEls.length - 1].getAttribute('data-page-number'));

        // We can add a new page without worrying about removing
        if (pageNumber > this.currentPageNumber) {
            const pageToLoad = Math.min(latestPageLoaded + 1, this.currentPageNumber + INITIAL_NUM_PAGES_TO_LOAD);
            if (pageToLoad <= this.pagesCount && pageToLoad > latestPageLoaded) {
                this.constructPage(pageToLoad, false);
                this.loadPage(this.pageEls[this.pageEls.length - 1], this.currentRepresentation);

                if (this.pageEls.length > MAX_CONCURRENT_PAGES) {
                    const pageToRemove = this.getIntVal(this.pageEls[0].getAttribute('data-page-number'));
                    this.removePage(pageToRemove);
                    this.spacerDiv.style.height = `${this.getIntVal(this.spacerDiv.style.height) +
                        this.pageEls[0].firstChild.height +
                        PAGE_PADDING}px`;
                }
            }
        } else if (pageNumber < this.currentPageNumber) {
            const pageToLoad = Math.max(earliestPageLoaded - 1, this.currentPageNumber - INITIAL_NUM_PAGES_TO_LOAD);
            if (pageToLoad > 0 && pageToLoad < earliestPageLoaded) {
                this.constructPage(pageToLoad, true);
                this.loadPage(this.pageEls[0], this.currentRepresentation);
                if (this.pageEls.length > MAX_CONCURRENT_PAGES) {
                    const pageToRemove = this.getIntVal(
                        this.pageEls[this.pageEls.length - 1].getAttribute('data-page-number')
                    );
                    this.spacerDiv.style.height = `${this.getIntVal(this.spacerDiv.style.height) -
                        (this.pageEls[this.pageEls.length - 1].firstChild.height + PAGE_PADDING)}px`;

                    this.removePage(pageToRemove);
                }
            }
        }
    }

    getIntVal(element) {
        return parseInt(element, 10);
    }
}

export default ImageDocViewer;
