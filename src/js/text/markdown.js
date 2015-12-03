'use strict';

import '../../css/text/text.css';
import autobind from 'autobind-decorator';
import TextBase from './text-base';
import fetch from 'isomorphic-fetch';
import marked from 'marked';
import 'file?name=highlight.js!../../third-party/text/highlight.js';
import 'file?name=github.css!../../third-party/text/github.css';

let Promise = global.Promise;
let Box = global.Box || {};
let hljs = global.hljs;

const TEXT_LOAD_TIMEOUT_IN_MILLIS = 5000;

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
    }

    /**
     * Loads a md file.
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

                marked.setOptions({
                    highlightClass: 'hljs',
                    highlight: (code) => hljs.highlightAuto(code).value
                });

                this.markDownEl.innerHTML = marked(txt);
                resolve(this);

                if (this.options.ui !== false) {
                    this.loadUI();
                }

                this.loaded = true;
                this.emit('load');
            });

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, TEXT_LOAD_TIMEOUT_IN_MILLIS);
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.MarkDown = MarkDown;
global.Box = Box;
export default MarkDown;