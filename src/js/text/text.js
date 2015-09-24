'use strict';

import '../../css/text.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import Base from '../base';
import 'file?name=highlight.js!../../third-party/highlight.js';
import 'file?name=github.css!../../third-party/github.css';

let document = global.document;
let Box = global.Box || {};
let hljs = global.hljs;

const TEXT_LOAD_TIMEOUT_IN_MILLIS = 5000;

@autobind
class PlainText extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super(container, options);
        this.textEl = this.containerEl.appendChild(document.createElement('pre'));
    }

    /**
     * Loads a swf object.
     * @param {String} textUrl The text to load
     * @public
     * @returns {Promise}
     */
    load(textUrl) {
        return new Promise((resolve, reject) => {

            fetch(textUrl).then((response) => {
                return response.text();
            }).then((txt) => {
                this.textEl.textContent = txt;
                hljs.highlightBlock(this.textEl);

                // Add our class after highlighting otherwise highlightjs doesnt work
                this.textEl.classList.add('box-preview-text');
                
                resolve(this);
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
Box.Preview.PlainText = PlainText;
global.Box = Box;
export default PlainText;