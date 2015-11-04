'use strict';

import '../../css/doc/doc.css';
import autobind from 'autobind-decorator';
import Controls from '../controls';
import Base from '../base';

import 'file?name=compatibility.js!../../third-party/pdfjs/1.2.38/compatibility.js';
import 'file?name=pdf.worker.js!../../third-party/pdfjs/1.2.38/pdf.worker.js';
import 'file?name=pdf.js!../../third-party/pdfjs/1.2.38/pdf.js';
import 'file?name=pdf_viewer.js!../../third-party/pdfjs/1.2.38/pdf_viewer.js';
import 'file?name=pdf_viewer.css!../../third-party/pdfjs/1.2.38/pdf_viewer.css';

let Promise = global.Promise;
let document = global.document;
let Box = global.Box || {};
let PDFJS = global.PDFJS;

const DOC_LOAD_TIMEOUT_IN_MILLIS = 60000;
const DEFAULT_SCALE_DELTA = 1.1;
const MAX_SCALE = 10.0;
const MIN_SCALE = 0.1;

@autobind
class Doc extends Base {

    /**``
     * [constructor]
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {Doc}
     */
    constructor(container, options) {
        super(container, options);
        this.docEl = this.containerEl.appendChild(document.createElement('div'));
        this.docEl.classList.add('box-preview-doc');

        this.viewerEl = this.docEl.appendChild(document.createElement('div'));
        this.viewerEl.classList.add('pdfViewer');
    }

    /**
     * Loads a swf object.
     *
     * @param {String} pdfUrl The pdf to load
     * @public
     * @returns {Promise}
     */
    load(pdfUrl) {
        return new Promise((resolve, reject) => {

            // Workers cannot be loaded via XHR when not from the same domain, so we load it as a blob
            let pdfWorkerUrl = this.options.scripts[1];

            fetch(pdfWorkerUrl)
                .then((response) => response.blob())
                .then((pdfWorkerBlob) => {

                    // TODO(phora) add destroy method so we can URL.revokeObjectURL(pdfworkerBlob);
                    PDFJS.workerSrc = URL.createObjectURL(pdfWorkerBlob);

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

        this.docEl.addEventListener('pagerendered', () => {
            resolve(this);
            this.loaded = true;

            if (this.options.ui !== false) {
                this.loadUI();
            }

            this.emit('load');
        });
    }

    /**
     * Loads the Controls
     *
     * @private
     * @returns {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-image-zoom-in-icon');
        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-image-zoom-out-icon');
        this.controls.add(__('fullscreen'), this.toggleFullscreen, 'box-preview-image-expand-icon');
    }

    /**
     * Zoom into document
     *
     * @param {number} ticks Number of times to zoom in
     * @private
     * @returns {void}
     */
    zoomIn(ticks = 1) {
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale * DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.ceil(newScale * 10) / 10;
            newScale = Math.min(MAX_SCALE, newScale);
        } while (--ticks > 0 && newScale < MAX_SCALE);
        this.pdfViewer.currentScaleValue = newScale;
    }

    /**
     * Zooms out of document
     *
     * @param {number} ticks Number of times to zoom out
     * @private
     * @returns void
     */
    zoomOut(ticks = 1) {
        let newScale = this.pdfViewer.currentScale;
        do {
            newScale = (newScale / DEFAULT_SCALE_DELTA).toFixed(2);
            newScale = Math.floor(newScale * 10) / 10;
            newScale = Math.max(MIN_SCALE, newScale);
        } while (--ticks > 0 && newScale > MIN_SCALE);
        this.pdfViewer.currentScaleValue = newScale;
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Doc = Doc;
global.Box = Box;
export default Doc;
