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
class Crocodoc extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {Crocodoc}
     */
    constructor(container, options) {
        super(container, options);
    }

    /**
     * Loads a swf object.
     * @param {String} jsonUrl The json to load
     * @public
     * @returns {Promise}
     */
    load(jsonUrl) {
        return new Promise((resolve, reject) => {

            fetch(jsonUrl).then((response) => {
                return response.json();
            }).then((json) => {

                // do something
                
                resolve(this);
                this.loaded = true;
                this.emit('load'); 
            });
            
            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, DOC_LOAD_TIMEOUT_IN_MILLIS);
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Crocodoc = Crocodoc;
global.Box = Box;
export default Crocodoc;