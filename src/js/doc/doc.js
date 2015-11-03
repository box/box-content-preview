'use strict';

import '../../css/doc/doc.css';
import autobind from 'autobind-decorator';
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

                    this.finishLoading(pdfUrl, resolve);

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
     * @param {String} pdfUrl The URL of the PDF to load
     * @param {Function} resolve Resolution handler
     * @private
     * @returns {void}
     */
    finishLoading(pdfUrl, resolve) {
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

            resolve(this);
            this.loaded = true;
            this.emit('load');
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Doc = Doc;
global.Box = Box;
export default Doc;
