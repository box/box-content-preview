'use strict';

import '../../css/text/text.css';
import autobind from 'autobind-decorator';
import fetch from 'isomorphic-fetch';
import TextBase from './text-base';
import 'file?name=highlight.js!../../third-party/text/highlight.js';
import 'file?name=github.css!../../third-party/text/github.css';

let Promise = global.Promise;
let Box = global.Box || {};
let hljs = global.hljs;

const TEXT_LOAD_TIMEOUT_IN_MILLIS = 5000;

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
    }

    /**
     * Loads a text file.
     *
     * @param {String} textUrl The text file to load
     * @public
     * @returns {Promise} Promise to load a text file
     */
    load(textUrl) {
        return new Promise((resolve, reject) => {

            fetch(textUrl, {
                headers: this.appendAuthHeader()
            }).then((response) => {
                return response.text();
            }).then((txt) => {
                this.finishLoading(txt, resolve);
            });

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, TEXT_LOAD_TIMEOUT_IN_MILLIS);

        });
    }

    /**
     * Loads highlight.js to highlight the file
     *
     * @param {String} txt The text content to load
     * @param {Function} resolve Resolution handler
     * @private
     * @returns {void}
     */
    finishLoading(txt, resolve) {
        this.codeEl.textContent = txt;

        // Only try to parse files smaller than 50KB otherwise the browser can hang
        if (this.options.file && this.options.file.size < 50000) {
            hljs.highlightBlock(this.preEl);
        }

        // Add our class after highlighting otherwise highlightjs doesnt work
        this.preEl.classList.add('box-preview-text');

        resolve(this);

        if (this.options.ui !== false) {
            this.loadUI();
        }

        this.loaded = true;
        this.emit('load');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Text = PlainText;
global.Box = Box;
export default PlainText;