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
        this.preEl = this.containerEl.appendChild(document.createElement('pre'));
        this.preEl.classList.add('box-preview-text');
        this.preEl.classList.add('hljs');
        this.preEl.classList.add(CLASS_HIDDEN);

        this.codeEl = this.preEl.appendChild(document.createElement('code'));
        this.codeEl.classList.add(this.options.file.extension);
    }

    /**
     * Loads a text file.
     *
     * @param {string} textUrl The text file to load
     * @returns {Promise} Promise to load a text file
     */
    load(textUrl) {
        get(textUrl, this.appendAuthHeader(), 'text')
        .then((text) => {
            if (this.destroyed) {
                return;
            }

            // Only highlight code files
            if (CODE_EXTENSIONS.indexOf(this.options.file.extension) !== -1) {
                this.initHighlightJs(text);
            } else {
                this.finishLoading(text, false);
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

        // // Only try to parse files smaller than 50KB otherwise the browser can hang
        // if (this.options.file && this.options.file.size < 50000) {
        //     hljs.highlightBlock(this.preEl);
        // }
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
        this.printframe = openContentInsideIframe(this.preEl.outerHTML);
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
        this.initPrint();
        this.preEl.classList.remove(CLASS_HIDDEN);

        this.loaded = true;
        this.emit('load');

        if (this.workerUrl) {
            URL.revokeObjectURL(this.workerUrl);
        }
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Text = PlainText;
global.Box = Box;
export default PlainText;
