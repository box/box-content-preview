import EventEmitter from 'events';
import {
    CLASS_BOX_PREVIEW_PRELOAD,
    CLASS_BOX_PREVIEW_PRELOAD_CONTENT,
    CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_DOCUMENT,
    CLASS_INVISIBLE,
    CLASS_PREVIEW_LOADED
} from '../../constants';
import { get, setDimensions } from '../../util';
import { hideLoadingIndicator } from '../../ui';

const EXIF_COMMENT_TAG_NAME = 'UserComment'; // Read EXIF data from 'UserComment' tag
const EXIF_COMMENT_REGEX = /pdfWidth:([0-9.]+)pts,pdfHeight:([0-9.]+)pts,numPages:([0-9]+)/;

const PDFJS_CSS_UNITS = 96.0 / 72.0; // Should match CSS_UNITS in pdf_viewer.js
const PDFJS_MAX_AUTO_SCALE = 1.25; // Should match MAX_AUTO_SCALE in pdf_viewer.js
const PDFJS_WIDTH_PADDING_PX = 40; // Should match SCROLLBAR_PADDING in pdf_viewer.js
const PDFJS_HEIGHT_PADDING_PX = 5; // Should match VERTICAL_PADDING in pdf_viewer.js

const NUM_PAGES_DEFAULT = 2; // Default to 2 pages for preload if true number of pages cannot be read
const NUM_PAGES_MAX = 500; // Don't show more than 500 placeholder pages

const ACCEPTABLE_RATIO_DIFFERENCE = 0.025; // Acceptable difference in ratio of PDF dimensions to image dimensions

class DocPreloader extends EventEmitter {
    /**
     * [constructor]
     *
     * @return {DocPreloader} DocPreloader instance
     */
    constructor() {
        super();
        this.wrapperClassName = CLASS_BOX_PREVIEW_PRELOAD_WRAPPER_DOCUMENT;
    }

    /**
     * Shows a preload of the document by showing the first page as an image. This should be called
     * while the full document loads to give the user visual feedback on the file as soon as possible.
     *
     * @param {string} preloadUrlWithAuth - URL for preload content with authorization query params
     * @param {HTMLElement} containerEl - Viewer container to render preload in
     * @return {Promise} Promise to show preload
     */
    showPreload(preloadUrlWithAuth, containerEl) {
        this.containerEl = containerEl;

        // Need to load image as a blob to read EXIF
        return get(preloadUrlWithAuth, 'blob').then((imgBlob) => {
            if (this.checkDocumentLoaded()) {
                return;
            }

            this.srcUrl = URL.createObjectURL(imgBlob);

            this.wrapperEl = document.createElement('div');
            this.wrapperEl.className = this.wrapperClassName;
            this.wrapperEl.innerHTML = `
                <div class="${CLASS_BOX_PREVIEW_PRELOAD} ${CLASS_INVISIBLE}">
                    <img class="${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}" src="${this.srcUrl}" />
                </div>
            `.trim();

            this.containerEl.appendChild(this.wrapperEl);
            this.preloadEl = this.wrapperEl.querySelector(`.${CLASS_BOX_PREVIEW_PRELOAD}`);
            this.imageEl = this.preloadEl.querySelector(`img.${CLASS_BOX_PREVIEW_PRELOAD_CONTENT}`);
            this.bindDOMListeners();
        });
    }

    /**
     * Set scaled dimensions for the preload image and show.
     *
     * @param {number} scaledWidth - Width in pixels to scale preload to
     * @param {number} scaledHeight - Height in pixels to scale preload to
     * @param {number} numPages - Number of pages to show for preload
     * @return {void}
     */
    scaleAndShowPreload(scaledWidth, scaledHeight, numPages) {
        if (this.checkDocumentLoaded()) {
            return;
        }

        // Set image dimensions
        setDimensions(this.imageEl, scaledWidth, scaledHeight);

        // Add and scale correct number of placeholder elements
        for (let i = 0; i < numPages - 1; i++) {
            const placeholderEl = document.createElement('div');
            placeholderEl.className = CLASS_BOX_PREVIEW_PRELOAD_CONTENT;
            setDimensions(placeholderEl, scaledWidth, scaledHeight);
            this.preloadEl.appendChild(placeholderEl);
        }

        // Hide the preview-level loading indicator
        hideLoadingIndicator();

        // Show preload element after content is properly sized
        this.preloadEl.classList.remove(CLASS_INVISIBLE);

        // Emit message that preload has occurred
        this.emit('preload');
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

        this.restoreScrollPosition();
        this.unbindDOMListeners();

        this.wrapperEl.parentNode.removeChild(this.wrapperEl);
        this.wrapperEl = undefined;
        this.preloadEl = undefined;
        this.imageEl = undefined;

        if (this.srcUrl) {
            URL.revokeObjectURL(this.srcUrl);
        }
    }

    /**
     * Binds event listeners for preload
     *
     * @private
     * @return {void}
     */
    bindDOMListeners() {
        this.imageEl.addEventListener('load', this.loadHandler);
    }

    /**
     * Unbinds event listeners for preload
     *
     * @private
     * @return {void}
     */
    unbindDOMListeners() {
        this.imageEl.removeEventListener('load', this.loadHandler);
    }

    /**
     * Set the real pdf.js document's scroll position to be the same as the preload scroll position.
     *
     * @private
     * @return {void}
     */
    restoreScrollPosition() {
        const scrollTop = this.wrapperEl.scrollTop;
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
    loadHandler = () => {
        if (!this.preloadEl || !this.imageEl) {
            return Promise.resolve();
        }

        // Calculate pdf width, height, and number of pages from EXIF if possible
        return this.readEXIF(this.imageEl)
            .then((pdfData) => {
                const { pdfWidth, pdfHeight, numPages } = pdfData;
                const { scaledWidth, scaledHeight } = this.getScaledDimensions(pdfWidth, pdfHeight);
                this.scaleAndShowPreload(scaledWidth, scaledHeight, Math.min(numPages, NUM_PAGES_MAX));

                // Otherwise, use the preload image's natural dimensions as a base to scale from
            })
            .catch(() => {
                const { naturalWidth: pdfWidth, naturalHeight: pdfHeight } = this.imageEl;
                const { scaledWidth, scaledHeight } = this.getScaledDimensions(pdfWidth, pdfHeight);
                this.scaleAndShowPreload(scaledWidth, scaledHeight, NUM_PAGES_DEFAULT);
            });
    };

    /**
     * Reads EXIF from preload JPG for PDF width, height, and numPages. This is currently encoded
     * by Box Conversion into the preload JPG itself, but eventually this information will be
     * available as a property on the preload representation object.
     *
     * @private
     * @param {HTMLElement} imageEl - Preload image element
     * @return {Promise} Promise that resolves with PDF width, PDF height, and num pages
     */
    readEXIF(imageEl) {
        return new Promise((resolve, reject) => {
            try {
                /* global EXIF */
                EXIF.getData(imageEl, () => {
                    const userCommentRaw = EXIF.getTag(imageEl, EXIF_COMMENT_TAG_NAME);
                    const userComment = userCommentRaw.map((c) => String.fromCharCode(c)).join('');
                    const match = EXIF_COMMENT_REGEX.exec(userComment);

                    // There should be 3 pieces of metadata: PDF width, PDF height, and num pages
                    if (!match || match.length !== 4) {
                        reject('No valid EXIF data found');
                        return;
                    }

                    // Convert PDF Units to CSS Pixels
                    let pdfWidth = parseInt(match[1], 10) * PDFJS_CSS_UNITS;
                    let pdfHeight = parseInt(match[2], 10) * PDFJS_CSS_UNITS;
                    const numPages = parseInt(match[3], 10);

                    // Validate number of pages
                    if (numPages <= 0) {
                        reject('EXIF num pages data is invalid');
                        return;
                    }

                    // Validate PDF width and height by comparing ratio to preload image dimension ratio
                    const pdfRatio = pdfWidth / pdfHeight;
                    const imageRatio = imageEl.naturalWidth / imageEl.naturalHeight;

                    if (Math.abs(pdfRatio - imageRatio) > ACCEPTABLE_RATIO_DIFFERENCE) {
                        const rotatedPdfRatio = pdfHeight / pdfWidth;

                        // Check if ratio is valid after height and width are swapped since PDF may be rotated
                        if (Math.abs(rotatedPdfRatio - imageRatio) > ACCEPTABLE_RATIO_DIFFERENCE) {
                            reject('EXIF PDF width and height are invalid');
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
                        numPages
                    });
                });
            } catch (e) {
                reject('Error reading EXIF data');
            }
        });
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
        scale = Math.min(PDFJS_MAX_AUTO_SCALE, scale);

        return {
            scaledWidth: Math.floor(scale * pdfWidth),
            scaledHeight: Math.floor(scale * pdfHeight)
        };
    }

    /**
     * Check if full document is already loaded - if so, hide the preload.
     *
     * @private
     * @return {boolean} Whether document is already loaded
     */
    checkDocumentLoaded() {
        // If document is already loaded, hide the preload and short circuit
        if (this.containerEl.classList.contains(CLASS_PREVIEW_LOADED)) {
            this.hidePreload();
            return true;
        }

        return false;
    }
}

export default DocPreloader;
