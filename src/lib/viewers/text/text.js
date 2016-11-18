import './text.scss';
import TextBase from './text-base';
import Browser from '../../browser';
import { CLASS_HIDDEN } from '../../constants';
import { get, openContentInsideIframe, createAssetUrlCreator, createStylesheet } from '../../util';

const Box = global.Box || {};

// Extensions for code files
const CODE_EXTENSIONS = ['as', 'as3', 'asm', 'bat', 'c', 'cc', 'cmake', 'cpp', 'cs', 'css', 'cxx', 'diff', 'erb', 'groovy', 'h', 'haml', 'hh', 'htm', 'html', 'java', 'js', 'less', 'm', 'make', 'md', 'ml', 'mm', 'php', 'pl', 'plist', 'properties', 'py', 'rb', 'rst', 'sass', 'scala', 'script', 'scm', 'sml', 'sql', 'sh', 'vi', 'vim', 'webdoc', 'xhtml', 'yaml'];

// Inline web worker JS
const HIGHLIGHT_WORKER_JS = 'onmessage=function(event){importScripts(event.data.highlightSrc);var result=self.hljs.highlightAuto(event.data.text);postMessage(result.value)};';

// Only load up to 192Kb of text
const SIZE_LIMIT_BYTES = '196608';
const BYTE_RANGE = `bytes=0-${SIZE_LIMIT_BYTES}`;

class PlainText extends TextBase {

    /**
     * [constructor]
     *
     * @param {string|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {PlainText} PlainText instance
     */
    constructor(container, options) {
        super(container, options);
        this.textEl = this.containerEl.appendChild(document.createElement('pre'));
        this.textEl.className = 'box-preview-text box-preview-text-plain hljs';
        this.textEl.classList.add(CLASS_HIDDEN);

        this.codeEl = this.textEl.appendChild(document.createElement('code'));
        this.codeEl.classList.add(this.options.file.extension);

        // Whether or not we truncated text shown due to performance issues
        this.truncated = false;
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        const downloadBtnEl = this.textEl.querySelector('.box-preview-btn-download');
        if (downloadBtnEl) {
            downloadBtnEl.removeEventListener('click', this.download.bind(this));
        }
    }

    /**
     * Loads a text file.
     *
     * @param {string} textUrl The text file to load
     * @returns {Promise} Promise to load a text file
     */
    load(textUrl) {
        // Default to access token in query param since this is a 'simple'
        // CORS request that doesn't need an extra OPTIONS pre-flight
        let getPromise = get(this.appendAuthParam(textUrl), 'text');

        // If file is greater than size limit, only fetch first few bytes
        if (this.options.file.size > SIZE_LIMIT_BYTES) {
            getPromise = get(textUrl, this.appendAuthHeader({
                Range: BYTE_RANGE
            }), 'text');

            this.truncated = true;
        }

        getPromise.then((text) => {
            if (this.destroyed) {
                return;
            }

            let fetchedText = text;
            if (this.truncated) {
                fetchedText += '...';
            }

            // Only highlight code files
            if (CODE_EXTENSIONS.indexOf(this.options.file.extension) === -1) {
                this.finishLoading(fetchedText, false);
            } else {
                this.initHighlightJs(fetchedText);
            }
        });

        super.load();
    }

    /**
     * Prints text using an an iframe.
     *
     * @returns {void}
     */
    print() {
        this.printframe.contentWindow.focus();
        if (Browser.getName() === 'Explorer' || Browser.getName() === 'Edge') {
            this.printframe.contentWindow.document.execCommand('print', false, null);
        } else {
            this.printframe.contentWindow.print();
        }
    }

    /**
     * Loads highlight.js to highlight the file
     *
     * @param {string} text The text content to load
     * @returns {void}
     * @private
     */
    initHighlightJs(text) {
        const workerBlob = new Blob([HIGHLIGHT_WORKER_JS], {
            type: 'text/javascript'
        });
        this.workerSrc = URL.createObjectURL(workerBlob);
        const worker = new Worker(this.workerSrc);

        // Once highlighting is done, replace content and finish loading
        worker.onmessage = (event) => {
            this.finishLoading(event.data, true);
        };

        // Give worker location of highlight.js and text content to highlight
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        const highlightSrc = assetUrlCreator('third-party/text/highlight.min.js');
        worker.postMessage({
            highlightSrc,
            text
        });
    }

    /**
     * Sets up the print iframe.
     *
     * @returns {void}
     * @private
     */
    initPrint() {
        // Help in printing by creating an iframe with the contents
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        this.printframe = openContentInsideIframe(this.textEl.outerHTML);
        this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('third-party/text/github.css')));
        this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('text.css')));
    }

    /**
     * Finishes loading after text is highlighted.
     *
     * @param {string} content Text
     * @param {boolean} isHighlighted Whether or not text is highlighted
     * @returns {void}
     * @private
     */
    finishLoading(content, isHighlighted) {
        // Change embed strategy based on whether or not text was highlighted
        if (isHighlighted) {
            this.codeEl.innerHTML = content;
        } else {
            this.codeEl.textContent = content;
        }

        this.loadUI();
        this.textEl.classList.remove(CLASS_HIDDEN);

        this.loaded = true;
        this.emit('load');

        if (this.workerUrl) {
            URL.revokeObjectURL(this.workerUrl);
        }

        // Show message that text was truncated along with a download button
        if (this.truncated) {
            this.showTruncatedDownloadButton();
        }
    }

    /**
     * Shows notification that text was truncated along with download button.
     *
     * @returns {void}
     * @private
     */
    showTruncatedDownloadButton() {
        const truncatedEl = document.createElement('div');
        truncatedEl.classList.add('box-preview-text-truncated');

        const truncatedTextEl = document.createElement('p');
        truncatedTextEl.textContent = __('text_truncated');

        const downloadBtnEl = document.createElement('button');
        downloadBtnEl.className = 'box-preview-btn box-preview-btn-primary box-preview-btn-download';
        downloadBtnEl.textContent = __('download_file');

        truncatedEl.appendChild(truncatedTextEl);
        truncatedEl.appendChild(downloadBtnEl);
        this.textEl.appendChild(truncatedEl);

        downloadBtnEl.addEventListener('click', this.download.bind(this));
    }

    /**
     * Emits download event
     *
     * @returns {void}
     * @private
     */
    download() {
        this.emit('download');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Text = PlainText;
global.Box = Box;
export default PlainText;
