import './text.scss';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import marked from 'marked';
import Browser from '../../browser';
import { get, openContentInsideIframe, createAssetUrlCreator, createStylesheet } from '../../util';
import { CLASS_INVISIBLE } from '../../constants';

const Box = global.Box || {};

@autobind
class MarkDown extends TextBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {MarkDown} MarkDown instance
     */
    constructor(container, options) {
        super(container, options);
        this.containerEl.innerHTML = '<pre class="hljs box-preview-text box-preview-text-plain"><code></code></pre>';
        this.preEl = this.containerEl.firstElementChild;
        this.markDownEl = this.preEl.firstElementChild;
        this.preEl.classList.add(CLASS_INVISIBLE); // Hide the element till data loads
    }

    /**
     * Loads a md file.
     *
     * @param {string} textUrl The text file to load
     * @public
     * @returns {Promise} Promise to load a text file
     */
    load(textUrl) {
        get(this.appendAuthParam(textUrl), 'text')
        .then((txt) => {
            /* global hljs */

            if (this.destroyed) {
                return;
            }

            marked.setOptions({
                highlightClass: 'hljs',
                highlight: (code) => hljs.highlightAuto(code).value
            });

            this.markDownEl.innerHTML = marked(txt);

            this.loadUI();

            this.loaded = true;
            this.emit('load');
            this.preEl.classList.remove(CLASS_INVISIBLE);

            // Help in printing by creating an iframe with the contents
            const assetUrlCreator = createAssetUrlCreator(this.options.location);
            this.printframe = openContentInsideIframe(this.preEl.outerHTML);
            this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('third-party/text/github.css')));
            this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('markdown.css')));
        });

        super.load();
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
Box.Preview.MarkDown = MarkDown;
global.Box = Box;
export default MarkDown;
