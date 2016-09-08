import './text.scss';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import Browser from '../../browser';
import { get, openContentInsideIframe, createAssetUrlCreator, createStylesheet } from '../../util';

const Box = global.Box || {};

@autobind
class PlainText extends TextBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {PlainText} PlainText instance
     */
    constructor(container, options) {
        super(container, options);
        this.containerEl.innerHTML = '<pre class="hljs"><code></code></pre>';
        this.preEl = this.containerEl.firstElementChild;
        this.codeEl = this.preEl.firstElementChild;
        this.preEl.style.visibility = 'hidden'; // Hide the element till data loads
    }

    /**
     * Loads a text file.
     *
     * @param {string} textUrl The text file to load
     * @public
     * @returns {Promise} Promise to load a text file
     */
    load(textUrl) {
        get(textUrl, this.appendAuthHeader(), 'text')
        .then((txt) => {
            if (this.destroyed) {
                return;
            }
            this.finishLoading(txt);
        });

        super.load();
    }

    /**
     * Loads highlight.js to highlight the file
     *
     * @private
     * @param {string} txt The text content to load
     * @returns {void}
     */
    finishLoading(txt) {
        /* global hljs */

        this.codeEl.textContent = txt;

        // Only try to parse files smaller than 50KB otherwise the browser can hang
        if (this.options.file && this.options.file.size < 50000) {
            hljs.highlightBlock(this.preEl);
        }

        // Add our class after highlighting otherwise highlightjs doesnt work
        this.preEl.classList.add('box-preview-text');

        this.loadUI();

        this.loaded = true;
        this.emit('load');
        this.preEl.style.visibility = 'visible';

        // Help in printing by creating an iframe with the contents
        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        this.printframe = openContentInsideIframe(this.preEl.outerHTML);
        this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('third-party/text/github.css')));
        this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('text.css')));
    }

    /**
     * Prints the text
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
}

Box.Preview = Box.Preview || {};
Box.Preview.Text = PlainText;
global.Box = Box;
export default PlainText;
