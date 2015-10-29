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

            PDFJS.workerSrc = this.options.scripts[1];

            this.pdfViewer = new PDFJS.PDFViewer({
                container: this.docEl
            });

            PDFJS.getDocument({
                url: pdfUrl,
                rangeChunkSize: 524288
            }).then((doc) => {
                this.pdfViewer.setDocument(doc);

                resolve(this);
                this.loaded = true;
                this.emit('load');
            });

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, DOC_LOAD_TIMEOUT_IN_MILLIS);
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Doc = Doc;
global.Box = Box;
export default Doc;
