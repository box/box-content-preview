import './text.scss';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import fetch from 'isomorphic-fetch';
import marked from 'marked';
import { openContentInsideIframe, createAssetUrlCreator, createStylesheet } from '../util';

const Box = global.Box || {};

@autobind
class MarkDown extends TextBase {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {MarkDown} MarkDown instance
     */
    constructor(container, options) {
        super(container, options);
        this.containerEl.innerHTML = '<pre class="hljs box-preview-text"><code></code></pre>';
        this.preEl = this.containerEl.firstElementChild;
        this.markDownEl = this.preEl.firstElementChild;
        this.preEl.style.visibility = 'hidden'; // Hide the element till data loads
    }

    /**
     * Loads a md file.
     *
     * @param {String} textUrl The text file to load
     * @public
     * @returns {Promise} Promise to load a text file
     */
    load(textUrl) {
        fetch(textUrl, {
            headers: this.appendAuthHeader()
        })
        .then((response) => response.text())
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

            if (this.options.ui !== false) {
                this.loadUI();
            }

            this.loaded = true;
            this.emit('load');
            this.preEl.style.visibility = 'visible';

            // Help in printing by creating an iframe with the contents
            const assetUrlCreator = createAssetUrlCreator(this.options.location);
            this.printframe = openContentInsideIframe(this.preEl.outerHTML);
            this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('third-party/text/github.css')));
            this.printframe.contentDocument.head.appendChild(createStylesheet(assetUrlCreator('third-party/text/markdown.css')));
        });

        super.load();
    }

    /**
     * Prints the text
     *
     * @returns {void}
     */
    print() {
        this.printframe.contentWindow.print();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.MarkDown = MarkDown;
global.Box = Box;
export default MarkDown;
