'use strict';

import '../../css/doc/doc.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Promise from 'bluebird';
import Base from '../base';

let document = global.document;
let Box = global.Box || {};

const DOC_LOAD_TIMEOUT_IN_MILLIS = 5000;

@autobind
class PDF extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {PDF}
     */
    constructor(container, options) {
        super(container, options);
    }

    /**
     * Loads a swf object.
     * @param {String} pdfUrl The pdf to load
     * @public
     * @returns {Promise}
     */
    load(pdfUrl) {
        return new Promise((resolve, reject) => {

            // do something with pdfUrl
                
            resolve(this);
            this.loaded = true;
            this.emit('load');

            
            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, DOC_LOAD_TIMEOUT_IN_MILLIS);
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.PDF = PDF;
global.Box = Box;
export default PDF;