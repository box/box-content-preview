'use strict';

import autobind from 'autobind-decorator';
import fetch from 'isomorphic-fetch';
import Base from '../base';
import Controls from '../controls';
import fullscreen from '../fullscreen';

import 'file?name=compatibility.js!../../third-party/doc/compatibility.js';
import 'file?name=pdf.worker.js!../../third-party/doc/pdf.worker.js';
import 'file?name=pdf.js!../../third-party/doc/pdf.js';
import 'file?name=pdf_viewer.js!../../third-party/doc/pdf_viewer.js';
import 'file?name=pdf_viewer.css!../../third-party/doc/pdf_viewer.css';

let Promise = global.Promise;
let document = global.document;
let PDFJS = global.PDFJS;

const DOC_LOAD_TIMEOUT_IN_MILLIS = 60000;
const SHOW_PAGE_NUM_INPUT_CLASS = 'show-page-number-input';

const PRESENTATION_MODE_STATE = {
    UNKNOWN: 0,
    NORMAL: 1,
    CHANGING: 2,
    FULLSCREEN: 3
};

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
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        // Remove object event listeners
        fullscreen.removeListener('enter', this.enterfullscreenHandler);
        fullscreen.removeListener('exit', this.exitfullscreenHandler);

        // Remove DOM event listeners
        if (this.docEl) {
            this.docEl.removeEventListener('pagesinit', this.pagesinitHandler);
            this.docEl.removeEventListener('pagesrendered', this.pagesrenderedHandler);
        }

        // Destroy the controls
        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        if (this.pdfViewer) {
            this.pdfViewer.cleanup();
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
        return new Promise((resolve, reject) => {

            // Workers cannot be loaded via XHR when not from the same domain, so we load it as a blob
            let pdfWorkerUrl = this.options.location.hrefTemplate.replace('{{asset_name}}', 'pdf.worker.js');
            let pdfCMapBaseURI = this.options.location.staticBaseURI + 'cmaps/';

            fetch(pdfWorkerUrl).then((response) => response.blob())
                .then((pdfWorkerBlob) => {
                    PDFJS.workerSrc = URL.createObjectURL(pdfWorkerBlob);
                    PDFJS.cMapUrl = pdfCMapBaseURI;
                    PDFJS.cMapPacked = true;

                    this.initViewer(pdfUrl, resolve);

                    URL.revokeObjectURL(pdfWorkerBlob);

                    setTimeout(() => {
                        if (!this.loaded) {
                            reject();
                        }
                    }, DOC_LOAD_TIMEOUT_IN_MILLIS);
                });
        });
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
    }

    /**
     * Go to previous page
     *
     * @public
     * @returns {void}
     */
    previousPage() {
        this.pdfViewer.currentPageNumber--;
    }

    /**
     * Go to next page
     *
     * @public
     * @returns {void}
     */
    nextPage() {
        this.pdfViewer.currentPageNumber++;
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
    }

    /**
     * Rotates documents by delta degrees
     *
     * @param {number} delta Degrees to rotate
     * @public
     * @returns {void}
     */
    rotateLeft(delta = -90) {
        let pageNumber = this.pdfViewer.currentPageNumber;

        // Calculate and set rotation
        this.pageRotation = this.pageRotation || 0;
        this.pageRotation = (this.pageRotation + 360 + delta) % 360;
        this.pdfViewer.pagesRotation = this.pageRotation;

        // Re-render and scroll to appropriate page
        this.pdfViewer.forceRendering();
        this.pdfViewer.scrollPageIntoView(pageNumber);
    }

    /**
     * Enters or exits fullscreen
     *
     * @public
     * @returns {void}
     */
    toggleFullscreen() {
        super.toggleFullscreen();

        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.CHANGING;
    }

    /*----- Private Helpers -----*/

    /**
     * Loads PDF.js with provided PDF
     *
     * @param {String} pdfUrl The URL of the PDF to load
     * @param {Function} resolve Resolution handler
     * @private
     * @returns {void}
     */
    initViewer(pdfUrl, resolve) {
        // Initialize PDF.js in container
        this.pdfViewer = new PDFJS.PDFViewer({
            container: this.docEl
        });

        // Load PDF from representation URL
        PDFJS.getDocument({
            url: pdfUrl,
            httpHeaders: this.appendAuthHeader(),
            rangeChunkSize: 524288
        }).then((doc) => {
            this.pdfViewer.setDocument(doc);
        });

        // When page structure is initialized, set default zoom and load controls
        this.docEl.addEventListener('pagesinit', this.pagesinitHandler);

        // When first page is rendered, message that preview has loaded
        this.docEl.addEventListener('pagerendered', this.pagerenderedHandler(resolve));

        // Update page number when page changes
        this.docEl.addEventListener('pagechange', this.pagechangeHandler);
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

    initPageNumEl() {
        let pageNumEl = this.controls.controlsEl.querySelector('.box-preview-doc-page-num');

        // Update total page number
        let totalPageEl = pageNumEl.querySelector('.box-preview-doc-total-pages');
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
        let pagesCount = this.pdfViewer.pagesCount;

        // refine the page number to fall within bounds
		if (pageNum > pagesCount) {
			pageNum = pagesCount;
		} else if (pageNum < 1) {
			pageNum = 1;
		}

        if (this.pageNumInputEl) {
            this.pageNumInputEl.value = pageNum;
        }

        if (this.currentPageEl) {
            this.currentPageEl.textContent = pageNum;
        }
    }

    /*----- Event Handlers -----*/

    /**
     * Handler for 'pagesinit' event
     *
     * @private
     * @returns {void}
     */
    pagesinitHandler() {
        this.pdfViewer.currentScaleValue = 'auto';

        if (this.options.ui !== false) {
            this.loadUI();
        }
    }

    /**
     * Returns handler for 'pagesrendered' event
     *
     * @param {Function} resolve Resolution handler
     * @private
     * @returns {Function} Handler
     */
    pagerenderedHandler(resolve) {
        return () => {
            if (this.loaded) {
                return;
            }

            resolve(this);
            this.loaded = true;
            this.emit('load');
        };
    }

    /**
     * Handler for 'pagechange' event
     *
     * @param {Event} event Pagechange event
     * @private
     * @returns {void}
     */
    pagechangeHandler(event) {
        let pageNum = event.pageNumber;
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
		let target = event.target,
			pageNum = parseInt(target.value, 10);

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
		switch (event.which) {
			case 13: // ENTER
				this.pageNumInputBlurHandler(event);
				break;

			case 27: // ESC
				this.hidePageNumInput();

				event.preventDefault();
				event.stopPropagation();
				break;

			// No default
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
    }
}

export default DocBase;
