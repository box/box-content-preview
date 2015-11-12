'use strict';

import autobind from 'autobind-decorator';
import Controls from '../controls';
import Base from '../base';

import 'file?name=compatibility.js!../../third-party/doc/compatibility.js';
import 'file?name=pdf.worker.js!../../third-party/doc/pdf.worker.js';
import 'file?name=pdf.js!../../third-party/doc/pdf.js';
import 'file?name=pdf_viewer.js!../../third-party/doc/pdf_viewer.js';
import 'file?name=pdf_viewer.css!../../third-party/doc/pdf_viewer.css';

let Promise = global.Promise;
let document = global.document;
let Box = global.Box || {};
let PDFJS = global.PDFJS;

const DOC_LOAD_TIMEOUT_IN_MILLIS = 60000;
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;

const PRESENTATION_MODE_STATE = {
    UNKNOWN: 0,
    NORMAL: 1,
    CHANGING: 2,
    FULLSCREEN: 3
};

@autobind
class DocBase extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {DocBase}
     */
    constructor(container, options) {
        super(container, options);
        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('box-preview-doc');

        this.viewerEl = this.docEl.appendChild(document.createElement('div'));
        this.viewerEl.classList.add('pdfViewer');
    }

    /**
     * Loads a document.
     *
     * @param {String} pdfUrl The pdf to load
     * @public
     * @returns {Promise}
     */
    load(pdfUrl) {
        return new Promise((resolve, reject) => {

            // Workers cannot be loaded via XHR when not from the same domain, so we load it as a blob
            let pdfWorkerUrl = this.options.location.hrefTemplate.replace('{{asset_name}}', 'pdf.worker.js');
            let pdfCMapBaseURI = this.options.location.staticBaseURI + 'cmaps/';

            fetch(pdfWorkerUrl)
                .then((response) => response.blob())
                .then((pdfWorkerBlob) => {

                    // TODO(phora) add destroy method so we can URL.revokeObjectURL(pdfworkerBlob);
                    PDFJS.workerSrc = URL.createObjectURL(pdfWorkerBlob);
                    PDFJS.cMapUrl = pdfCMapBaseURI;
                    PDFJS.cMapPacked = true;

                    this.initViewer(pdfUrl, resolve);

                    setTimeout(() => {
                        if (!this.loaded) {
                            reject();
                        }
                    }, DOC_LOAD_TIMEOUT_IN_MILLIS);
                });
        });
    }

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
            rangeChunkSize: 524288
        }).then((doc) => {
            this.pdfViewer.setDocument(doc);
        });

        // When page structure is initialized, set default zoom and load controls
        this.docEl.addEventListener('pagesinit', () => {
            this.pdfViewer.currentScaleValue = 'auto';

            if (this.options.ui !== false) {
                this.loadUI();
            }
        });

        // When first page is rendered, message that preview has loaded
        this.docEl.addEventListener('pagerendered', () => {
            resolve(this);
            this.loaded = true;
            this.emit('load');
        });
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
    }

    /**
     * Resizing logic.
     *
     * @private
     * @returns {void}
     */
    resize() {
        this.pdfViewer.currentScaleValue = this.pdfViewer.currentScaleValue || 'auto';
        this.pdfViewer.update();
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
     * Navigate to previous page
     *
     * @private
     * @returns {void}
     */
    previousPage() {
        this.pdfViewer.currentPageNumber--;
    }

    /**
     * Navigate to next page
     *
     * @private
     * @returns {void}
     */
    nextPage() {
        this.pdfViewer.currentPageNumber++;
    }

    /**
     * Rotates documents by delta degrees
     *
     * @param {number} delta Degrees to rotate
     * @private
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
     * @private
     * @returns {void}
     */
    toggleFullscreen() {
        super.toggleFullscreen();

        this.pdfViewer.presentationModeState = PRESENTATION_MODE_STATE.CHANGING;
    }

    /**
     * Adds event listeners for document element
     *
     * @private
     * @returns {void}
     */
    addEventListenersForDocElement() {
        this.on('enterfullscreen', this.enterfullscreenHandler);
        this.on('exitfullscreen', this.exitfullscreenHandler);
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
