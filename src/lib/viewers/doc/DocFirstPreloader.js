import EventEmitter from 'events';
import Api from '../../api';
import {
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_BOX_PREVIEW_PRELOAD_PLACEHOLDER,
    CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_DOCUMENT,
    CLASS_IS_TRANSPARENT,
    PDFJS_CSS_UNITS,
    PDFJS_HEIGHT_PADDING_PX,
    PDFJS_MAX_AUTO_SCALE,
    PDFJS_WIDTH_PADDING_PX,
    CLASS_BOX_PREVIEW_THUMBNAILS_OPEN,
    CLASS_BOX_PRELOAD_COMPLETE,
    CLASS_DOC_FIRST_IMAGE,
    CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION,
} from '../../constants';

import { VIEWER_EVENT } from '../../events';
import {
    handleRepresentationBlobFetch,
    getPreloadImageRequestPromises,
    getPreloadImageRequestPromisesByBatch,
} from '../../util';
// Read EXIF data from 'UserComment' tag
const EXIF_COMMENT_REGEX = /pdfWidth:([0-9.]+)pts,pdfHeight:([0-9.]+)pts,numPages:([0-9]+)/;
const ACCEPTABLE_RATIO_DIFFERENCE = 0.025; // Acceptable difference in ratio of PDF dimensions to image dimensions

class DocFirstPreloader extends EventEmitter {
    /** @property {Api} - Api layer used for XHR calls */
    api = new Api();

    /** @property {HTMLElement} - Viewer container */
    containerEl;

    /** @property {HTMLElement} - Preload image element */
    imageEl;

    /** @property {HTMLElement} - Maximum auto-zoom scale */
    maxZoomScale = PDFJS_MAX_AUTO_SCALE;

    /** @property {Object} - The EXIF data for the PDF */
    pdfData;

    /** @property {HTMLElement} - Preload placeholder element */
    placeholderEl;

    /** @property {HTMLElement} - Preload container element */
    preloadEl;

    /** @property {PreviewUI} - Preview's UI instance */
    previewUI;

    /** @property {string} - Preload representation content URL */
    srcUrl;

    /** @property {string} - Class name for preload wrapper */
    wrapperClassName;

    /** @property {HTMLElement} - Preload wrapper element */
    wrapperEl;

    /** @property {Object} - Preloaded image dimensions */
    imageDimensions;

    /** @property {number} - Preloader load time */
    loadTime;

    /** @property {number} - Number of pages in the document */
    numPages = 1;

    /** @property {Object} - Preloaded image map */
    preloadedImages = {};

    /** @property {boolean} - Preloader thumbnails open */
    thumbnailsOpen = false;

    /** @property {number} - Preloader number of pages retrieved from representation api */
    retrievedPagesCount = 0;

    /** @property {boolean} - Preloader used webp */
    isWebp = false;

    /** @property {boolean} - Preloader used webp */
    isPresentation = false;

    /** @property {Object} - Configuration for staggered loading */
    config = {};

    /** @property {boolean} - Whether first page has been rendered */
    firstPageRendered = false;

    /** @property {boolean} - Whether second batch has started */
    secondBatchStarted = false;

    /** @property {number|null} - Timeout ID for second batch */
    secondBatchTimeoutId = null;

    /** @property {Map} - Map of page number to blob data */
    pageDataMap = new Map();

    /** @property {string} - Stored paged URL for second batch */
    storedPagedUrl = null;

    /** @property {Object} - Stored docBaseViewer reference */
    storedDocBaseViewer = null;

    /**
     * [constructor]
     *
     * @param {PreviewUI} previewUI - UI instance
     * @param {Object} options - Preloader options
     * @param {Api} options.api - API Instance
     * @param {Object} options.config - Additional configuration
     * @return {DocPreloader} DocPreloader instance
     */
    constructor(previewUI, { api, config = {} } = {}, isPresentation = false) {
        super();
        this.api = api;
        this.previewUI = previewUI;
        this.isPresentation = isPresentation;
        this.wrapperClassName = isPresentation
            ? CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_PRESENTATION
            : CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_DOCUMENT;

        this.config = {
            ...this.config,
            ...config,
        };
    }

    isStaggeredLoadingEnabled() {
        return this.config.priorityPages !== undefined && this.config.priorityPages >= 1;
    }

    /**
     * Clears the second batch timeout if it exists
     *
     * @private
     * @return {void}
     */
    clearBatchTimeouts() {
        if (this.secondBatchTimeoutId) {
            clearTimeout(this.secondBatchTimeoutId);
            this.secondBatchTimeoutId = null;
        }
    }

    buildPreloaderImagePlaceHolder(image) {
        const placeHolder = document.createElement('div');
        placeHolder.classList.add(CLASS_BOX_PREVIEW_PRELOAD_PLACEHOLDER);
        placeHolder.appendChild(image);
        image.classList.add(CLASS_DOC_FIRST_IMAGE);

        return placeHolder;
    }

    async loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Hides the preview mask element if it exists
     *
     * @private
     * @return {void}
     */
    hidePreviewMask() {
        const previewMask = document.getElementsByClassName('bcpr-PreviewMask')[0];
        if (previewMask) {
            previewMask.style.display = 'none';
        }
    }

    /**
     * Shows the preview mask element if it exists
     *
     * @private
     * @return {void}
     */
    showPreviewMask() {
        const previewMask = document.getElementsByClassName('bcpr-PreviewMask')[0];
        if (previewMask) {
            previewMask.style.display = '';
        }
    }

    /**
     * Shows a preload of the document by showing the first page as an image. This should be called
     * while the full document loads to give the user visual feedback on the file as soon as possible.
     *
     * @param {string} preloadUrlWithAuth - URL for preload content with authorization query params
     * @return {Promise} Promise to show preload
     */
    async showPreload(preloadUrlWithAuth, containerEl, pagedPreLoadUrlWithAuth, pages, docBaseViewer) {
        if (this.pdfJsDocLoadComplete()) {
            return;
        }

        this.hidePreviewMask();
        try {
            this.numPages = pages;
            this.isWebp = !!pagedPreLoadUrlWithAuth;
            this.initializePreloadContainerComponents(containerEl);

            // Store references for second batch
            this.storedPagedUrl = pagedPreLoadUrlWithAuth;
            this.storedDocBaseViewer = docBaseViewer;

            // Use staggered loading if enabled, otherwise fall back to original behavior
            const useStaggered = this.isStaggeredLoadingEnabled() && pagedPreLoadUrlWithAuth;

            if (useStaggered) {
                await this.showPreloadStaggered(preloadUrlWithAuth, pagedPreLoadUrlWithAuth, pages, docBaseViewer);
            } else {
                await this.showPreloadAll(preloadUrlWithAuth, pagedPreLoadUrlWithAuth, pages, docBaseViewer);
            }
        } catch (error) {
            this.showPreviewMask();
        }
    }

    /**
     * Preload method that fetches all pages at once (non-staggered)
     *
     * @private
     */
    async showPreloadAll(preloadUrlWithAuth, pagedPreLoadUrlWithAuth, pages, docBaseViewer) {
        const promises = getPreloadImageRequestPromises(this.api, preloadUrlWithAuth, pages, pagedPreLoadUrlWithAuth);

        await Promise.all(promises)
            .then(responses => {
                const results = responses.map(response => handleRepresentationBlobFetch(response));
                return Promise.all(results);
            })
            .then(async data => {
                this.wrapperEl.appendChild(this.preloadEl);
                const firstPageImage = data.shift();
                if (firstPageImage instanceof Error || !firstPageImage) {
                    this.showPreviewMask();
                    return;
                }

                const preloaderFirstImageIndex = 1;
                this.preloadedImages[preloaderFirstImageIndex] = URL.createObjectURL(firstPageImage);
                const imageDomElement = await this.loadImage(this.preloadedImages[preloaderFirstImageIndex]);
                await this.setPreloadImageDimensions(firstPageImage, imageDomElement);
                this.addPreloadImageToPreloaderContainer(imageDomElement, preloaderFirstImageIndex);

                this.emit('firstRender');

                // Update count and trigger thumbnail rendering for page 1
                this.retrievedPagesCount = Object.keys(this.preloadedImages).length;
                if (docBaseViewer?.thumbnailsSidebar) {
                    docBaseViewer.thumbnailsSidebar.renderNextThumbnailImage();
                }

                if (!this.pdfJsDocLoadComplete()) {
                    await this.processAdditionalPages(data, docBaseViewer);
                    this.finalizePreload(docBaseViewer);
                } else {
                    this.wrapperEl.classList.add('loaded');
                }
            })
            .catch(() => {
                this.showPreviewMask();
            });
    }

    /**
     * Load a batch of preload images and convert to blobs (DRY helper)
     *
     * @private
     * @param {string} pagedPreLoadUrlWithAuth - Paged URL template with auth
     * @param {number} startPage - Start page number (inclusive)
     * @param {number} endPage - End page number (inclusive)
     * @return {Promise<Array>} Promise resolving to array of blobs
     */
    loadPreloadBatch(pagedPreLoadUrlWithAuth, startPage, endPage) {
        const promises = getPreloadImageRequestPromisesByBatch(this.api, pagedPreLoadUrlWithAuth, startPage, endPage);

        return Promise.all(promises).then(responses => {
            const results = responses.map(response => handleRepresentationBlobFetch(response));
            return Promise.all(results);
        });
    }

    /**
     * Staggered preload method - fetches priority batch first, then remaining pages
     *
     * @private
     */
    async showPreloadStaggered(preloadUrlWithAuth, pagedPreLoadUrlWithAuth, pages, docBaseViewer) {
        const { priorityPages, maxPreloadPages, secondBatchDelayMs } = this.config;
        const totalPages = Math.min(pages, maxPreloadPages);

        // Load priority batch (aligned with showPreloadAll pattern)
        await this.loadPreloadBatch(pagedPreLoadUrlWithAuth, 1, priorityPages)
            .then(async data => {
                this.wrapperEl.appendChild(this.preloadEl);

                // Handle first page specially (same as showPreloadAll)
                const firstPageImage = data.shift();
                if (firstPageImage instanceof Error || !firstPageImage) {
                    this.showPreviewMask();
                    return;
                }

                const preloaderFirstImageIndex = 1;
                this.preloadedImages[preloaderFirstImageIndex] = URL.createObjectURL(firstPageImage);
                const imageDomElement = await this.loadImage(this.preloadedImages[preloaderFirstImageIndex]);
                await this.setPreloadImageDimensions(firstPageImage, imageDomElement);
                this.addPreloadImageToPreloaderContainer(imageDomElement, preloaderFirstImageIndex);

                this.emit('firstRender');

                // Update count and trigger thumbnail rendering for page 1
                this.retrievedPagesCount = Object.keys(this.preloadedImages).length;
                if (docBaseViewer?.thumbnailsSidebar) {
                    docBaseViewer.thumbnailsSidebar.renderNextThumbnailImage();
                }

                // Process remaining priority pages (same as showPreloadAll)
                if (!this.pdfJsDocLoadComplete()) {
                    await this.processAdditionalPages(data, docBaseViewer);
                    this.handleThumbnailToggling(docBaseViewer);

                    // Schedule second batch (staggered loading part)
                    if (totalPages > priorityPages) {
                        this.secondBatchTimeoutId = setTimeout(() => {
                            this.showSecondBatch(pagedPreLoadUrlWithAuth, priorityPages + 1, totalPages, docBaseViewer);
                        }, secondBatchDelayMs);
                    } else {
                        this.finalizePreload(docBaseViewer);
                    }
                } else {
                    this.wrapperEl.classList.add('loaded');
                }
            })
            .catch(() => {
                this.showPreviewMask();
            });
    }

    /**
     * Show the second batch of preload images (after delay)
     *
     * @private
     * @param {string} pagedPreLoadUrlWithAuth - Paged URL template with auth
     * @param {number} startPage - Start page number
     * @param {number} endPage - End page number
     * @param {Object} docBaseViewer - The document base viewer instance
     * @return {Promise} Promise that resolves when batch is shown
     */
    async showSecondBatch(pagedPreLoadUrlWithAuth, startPage, endPage, docBaseViewer) {
        // Prevent duplicate execution
        if (this.secondBatchStarted || this.pdfJsDocLoadComplete()) {
            return;
        }
        this.secondBatchStarted = true;

        this.clearBatchTimeouts();

        // Load and show second batch (aligned with showPreloadAll pattern)
        await this.loadPreloadBatch(pagedPreLoadUrlWithAuth, startPage, endPage)
            .then(async data => {
                if (!this.pdfJsDocLoadComplete()) {
                    await this.processAdditionalPages(data, docBaseViewer);
                    this.finalizePreload(docBaseViewer);
                }
            })
            .catch(() => {
                // Still try to finalize with whatever pages we have
                this.finalizePreload(docBaseViewer);
            });
    }

    /**
     * Render a single page
     *
     * @private
     */
    async renderPage(pageNum, blob, isFirstPage = false) {
        if (this.pdfJsDocLoadComplete() || this.preloadedImages[pageNum]) {
            return;
        }

        this.preloadedImages[pageNum] = URL.createObjectURL(blob);

        if (isFirstPage) {
            // First page needs special handling for dimensions
            const imageDomElement = await this.loadImage(this.preloadedImages[pageNum]);
            await this.setPreloadImageDimensions(blob, imageDomElement);
            this.addPreloadImageToPreloaderContainer(imageDomElement, pageNum);
        } else if (!this.isPresentation) {
            // Additional pages for documents (presentations only show one page)
            const imageDomElement = document.createElement('img');
            imageDomElement.src = this.preloadedImages[pageNum];
            this.addPreloadImageToPreloaderContainer(imageDomElement, pageNum);
        }
    }

    /**
     * Finalize the preload process
     *
     * @private
     */
    finalizePreload(docBaseViewer) {
        this.clearBatchTimeouts();

        this.retrievedPagesCount = Object.keys(this.preloadedImages).length;

        // Add placeholders for remaining pages
        this.addPlaceholdersForRemainingPages();

        this.handleThumbnailToggling(docBaseViewer);

        if (this.retrievedPagesCount) {
            this.emit('preload');
            this.loadTime = Date.now();
            this.wrapperEl.classList.add('loaded');
        }
    }

    /**
     * Add placeholder divs for pages beyond what was preloaded
     *
     * @private
     */
    addPlaceholdersForRemainingPages() {
        const lastPreloadedPage = Math.max(...Object.keys(this.preloadedImages).map(Number));

        if (lastPreloadedPage < this.pdfData?.numPages && !this.isPresentation && this.imageDimensions) {
            let counter = 1;
            const indexToStart = lastPreloadedPage + 1;
            for (let i = indexToStart; i <= this.pdfData?.numPages; i += 1) {
                if (counter > 10) {
                    break;
                }
                const el = document.createElement('div');
                const container = this.buildPreloaderImagePlaceHolder(el);
                container.style.width = `${this.imageDimensions.width}px`;
                container.style.height = `${this.imageDimensions.height}px`;
                this.preloadEl.appendChild(container);
                counter += 1;
            }
        }
    }

    /**
     * Processes additional pages after the first page has been loaded
     *
     * @private
     * @param {Array} data - Array of image blobs for additional pages
     * @param {Object} docBaseViewer - The document base viewer instance (optional)
     * @return {Promise} Promise that resolves when all pages are processed
     */
    // eslint-disable-next-line no-await-in-loop
    async processAdditionalPages(data, docBaseViewer) {
        let pageNum = 1; // First page already processed
        for (let i = 0; i < data.length; i += 1) {
            const element = data[i];
            pageNum += 1;
            if (element instanceof Error || !element) {
                break; // Stop on first error (matches original behavior)
            }
            // eslint-disable-next-line no-await-in-loop
            await this.renderPage(pageNum, element, false);

            // Update count and trigger thumbnail rendering for this page (progressive thumbnails)
            this.retrievedPagesCount = Object.keys(this.preloadedImages).length;
            if (docBaseViewer?.thumbnailsSidebar) {
                docBaseViewer.thumbnailsSidebar.renderNextThumbnailImage();
            }
        }
    }

    /**
     * Handles thumbnail toggling and initialization if needed
     *
     * @private
     * @param {Object} docBaseViewer - The document base viewer instance
     * @return {void}
     */
    handleThumbnailToggling(docBaseViewer) {
        if (this.thumbnailsOpen) {
            return;
        }

        if (docBaseViewer.shouldThumbnailsBeToggled()) {
            docBaseViewer.rootEl.classList.add(CLASS_BOX_PREVIEW_THUMBNAILS_OPEN);
            docBaseViewer.rootEl.classList.add(CLASS_BOX_PRELOAD_COMPLETE);
            docBaseViewer.emit(VIEWER_EVENT.thumbnailsOpen);
            docBaseViewer.initThumbnails();
            this.thumbnailsOpen = true;
        }
    }

    addPreloadImageToPreloaderContainer(img, i) {
        const container = this.buildPreloaderImagePlaceHolder(img);
        container.setAttribute('data-preload-index', i);
        container.classList.add('loaded');
        container.style.maxWidth = `${this.imageDimensions.width}px`;
        container.style.maxHeight = `${this.imageDimensions.height}px`;
        this.preloadEl.appendChild(container);
        return container;
    }

    initializePreloadContainerComponents(containerEl) {
        this.containerEl = containerEl;
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.className = this.wrapperClassName;
        this.wrapperEl.classList.add('bp-preloader-loaded');
        this.containerEl.appendChild(this.wrapperEl);
        this.preloadEl = document.createElement('div');
        this.preloadEl.classList.add(CLASS_BOX_PREVIEW_PRELOAD);
        this.preloadedImages = {};
    }

    /**
     * Hides the preload if it exists.
     *
     * @return {void}
     */
    hidePreload() {
        if (!this.wrapperEl) {
            return;
        }

        this.unbindDOMListeners();
        this.restoreScrollPosition();
        this.wrapperEl.classList.add(CLASS_IS_TRANSPARENT);

        // Cleanup preload DOM after fade out
        this.wrapperEl.addEventListener('transitionend', this.cleanupPreload);
        // Cleanup preload DOM immediately if user scrolls after the document is ready since we don't want half-faded
        // out preload content to be on top of real document content while scrolling
        this.wrapperEl.addEventListener('scroll', this.cleanupPreload);
    }

    /**
     * Cleans up preload DOM.
     *
     * @private
     * @return {void}
     */
    cleanupPreload = () => {
        this.clearBatchTimeouts();

        if (this.wrapperEl) {
            this.wrapperEl.parentNode.removeChild(this.wrapperEl);
            this.wrapperEl = undefined;
        }

        this.preloadEl = undefined;
        this.imageEl = undefined;
        this.retrievedPagesCount = undefined;
        Object.values(this.preloadedImages).forEach(image => {
            URL.revokeObjectURL(image);
        });
        this.preloadedImages = {};

        // Clear staggered loading state
        this.firstPageRendered = false;
        this.secondBatchStarted = false;
        this.pageDataMap.clear();
        this.storedPagedUrl = null;
        this.storedDocBaseViewer = null;
    };

    /**
     * Unbinds event listeners for preload
     *
     * @private
     * @return {void}
     */
    unbindDOMListeners() {
        // this.imageEl.removeEventListener('load', this.loadHandler);
    }

    /**
     * Set the real pdf.js document's scroll position to be the same as the preload scroll position.
     *
     * @private
     * @return {void}
     */
    restoreScrollPosition() {
        const { scrollTop } = this.wrapperEl;
        const docEl = this.wrapperEl.parentNode.querySelector('.bp-doc');
        if (docEl && scrollTop > 0) {
            docEl.scrollTop = scrollTop;
        }
    }

    /**
     * Finish preloading by properly scaling preload image to be as close as possible to the
     * true size of the pdf.js document, showing the preload, and hiding the loading indicator.
     *
     * @private
     * @return {Promise} Promise to scale and show preload
     */
    setPreloadImageDimensions = (imageBlob, imageEl) => {
        if (!imageBlob || !imageEl) {
            return Promise.resolve();
        }
        // Calculate pdf width, height, and number of pages from EXIF if possible
        return this.readEXIF(imageBlob, imageEl)
            .then(pdfData => {
                this.pdfData = pdfData;
                const { scaledWidth, scaledHeight } = this.getScaledWidthAndHeight(pdfData);
                this.imageDimensions = { width: scaledWidth, height: scaledHeight };
                imageEl.classList.add('loaded');
                this.numPages = pdfData.numPages;
            })
            .catch(() => {
                const { naturalWidth: pdfWidth, naturalHeight: pdfHeight } = imageEl;
                const { scaledWidth, scaledHeight } = this.getScaledDimensions(pdfWidth, pdfHeight);
                this.imageDimensions = { width: scaledWidth, height: scaledHeight };
                imageEl.classList.add('loaded');
            });
    };

    /**
     * Gets the scaled width and height from the EXIF data
     *
     * @param {Object} pdfData - the EXIF data from the image
     * @return {Object} the scaled width and height the
     */
    getScaledWidthAndHeight(pdfData) {
        const { pdfWidth, pdfHeight } = pdfData;
        const { scaledWidth, scaledHeight } = this.getScaledDimensions(pdfWidth, pdfHeight);

        return {
            scaledWidth,
            scaledHeight,
        };
    }

    /**
     * Returns scaled PDF dimensions using same algorithm as pdf.js up to a maximum of 1.25x zoom.
     *
     * @private
     * @param {number} pdfWidth - Width of PDF in pixels
     * @param {number} pdfHeight - Height of PDF in pixels
     * @return {Object} Scaled width and height in pixels
     */
    getScaledDimensions(pdfWidth, pdfHeight) {
        const { clientWidth, clientHeight } = this.wrapperEl;
        const widthScale = (clientWidth - PDFJS_WIDTH_PADDING_PX) / pdfWidth;
        const heightScale = (clientHeight - PDFJS_HEIGHT_PADDING_PX) / pdfHeight;

        const isLandscape = pdfWidth > pdfHeight;
        let scale = isLandscape ? Math.min(heightScale, widthScale) : widthScale;

        // Optionally limit to maximum zoom scale if defined
        if (this.maxZoomScale) {
            scale = Math.min(this.maxZoomScale, scale);
        }

        return {
            scaledWidth: Math.floor(scale * pdfWidth),
            scaledHeight: Math.floor(scale * pdfHeight),
        };
    }

    /**
     * Reads EXIF from preload JPG for PDF width, height, and numPages. This is currently encoded
     * by Box Conversion into the preload JPG itself, but eventually this information will be
     * available as a property on the preload representation object.
     *
     * @private
     * @param {Blob} imageBlob - Preload image element
     * @param {HTMLElement} imageEl - Preload image element
     * @return {Promise} Promise that resolves with PDF width, PDF height, and num pages
     */
    readEXIF(imageBlob, imageEl) {
        return new Promise((resolve, reject) => {
            try {
                let tags = {};
                const reader = new FileReader();
                reader.onload = () => {
                    const arrayBuffer = reader.result;
                    /* global ExifReader */
                    tags = ExifReader.load(arrayBuffer);

                    const userComment = tags.UserComment.description || tags.UserComment.value;
                    const match = EXIF_COMMENT_REGEX.exec(userComment);

                    /*  There should be 3 pieces of metadata: PDF width, PDF height, and num pages
                        and the comments should match this format "pdfWidth:1190.55pts,pdfHeight:841.89pts,numPages:6"
                        the regext will return an array of 4 elements
                        0: full match
                        1: pdfWidth
                        2: pdfHeight
                        3: numPages
                    */
                    if (!match || match.length !== 4) {
                        reject(new Error('No valid EXIF data found'));
                        return;
                    }

                    // Convert PDF Units to CSS Pixels
                    let pdfWidth = parseInt(match[1], 10) * PDFJS_CSS_UNITS;
                    let pdfHeight = parseInt(match[2], 10) * PDFJS_CSS_UNITS;
                    const numPages = parseInt(match[3], 10);

                    // Validate number of pages
                    if (numPages <= 0) {
                        reject(new Error('EXIF num pages data is invalid'));
                        return;
                    }

                    // Validate PDF width and height by comparing ratio to preload image dimension ratio
                    const pdfRatio = pdfWidth / pdfHeight;
                    const imageRatio = imageEl.naturalWidth / imageEl.naturalHeight;

                    if (Math.abs(pdfRatio - imageRatio) > ACCEPTABLE_RATIO_DIFFERENCE) {
                        const rotatedPdfRatio = pdfHeight / pdfWidth;

                        // Check if ratio is valid after height and width are swapped since PDF may be rotated
                        if (Math.abs(rotatedPdfRatio - imageRatio) > ACCEPTABLE_RATIO_DIFFERENCE) {
                            reject(new Error('EXIF PDF width and height are invalid'));
                            return;
                        }

                        // Swap PDF width and height if swapped ratio seems correct
                        const tempWidth = pdfWidth;
                        pdfWidth = pdfHeight;
                        pdfHeight = tempWidth;
                    }

                    // Resolve with valid PDF width, height, and num pages
                    resolve({
                        pdfWidth,
                        pdfHeight,
                        numPages,
                    });
                };

                reader.onerror = () => {
                    reject(new Error('Error reading blob as ArrayBuffer'));
                };
                reader.readAsArrayBuffer(imageBlob);
            } catch (e) {
                reject(new Error('Error reading EXIF data'));
            }
        });
    }

    /**
     * Check if full document is already loaded - if so, hide the preload.
     *
     * @private
     * @return {boolean} Whether document is already loaded
     */
    pdfJsDocLoadComplete() {
        // If document is already loaded, hide the preload and short circuit
        // Using string literal 'bp-loaded' directly to avoid webpack bundling issues
        if (this.previewUI?.previewContainer?.classList?.contains('bp-loaded')) {
            this.hidePreload();
            return true;
        }

        return false;
    }
}

export default DocFirstPreloader;
