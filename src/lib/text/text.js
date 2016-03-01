import './text.scss';
import autobind from 'autobind-decorator';
import fetch from 'isomorphic-fetch';
import TextBase from './text-base';

let Box = global.Box || {};

@autobind
class PlainText extends TextBase {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container
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
     * @param {String} txt The text content to load
     * @returns {void}
     */
    finishLoading(txt) {
        this.codeEl.textContent = txt;

        // Only try to parse files smaller than 50KB otherwise the browser can hang
        if (this.options.file && this.options.file.size < 50000) {
            hljs.highlightBlock(this.preEl);
        }

        // Add our class after highlighting otherwise highlightjs doesnt work
        this.preEl.classList.add('box-preview-text');

        if (this.options.ui !== false) {
            this.loadUI();
        }

        this.loaded = true;
        this.emit('load');
        this.preEl.style.visibility = 'visible';
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Text = PlainText;
global.Box = Box;
export default PlainText;
