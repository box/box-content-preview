'use strict';

import autobind from 'autobind-decorator';
import Base from '../base';
import 'file?name=swfobject.js!../../third-party/swfobject.js';

let document = global.document;
let Promise = global.Promise;
let Box = global.Box || {};
let swfobject = global.swfobject;

const SWF_LOAD_TIMEOUT_IN_MILLIS = 10000;
const SWF_PARAMS = {
    allowfullscreen: 'true',
    allowFullScreen: 'true',
    allownetworking: 'none',
    allowNetworking: 'none',
    allowscriptaccess: 'never',
    allowScriptAccess: 'never',
    wmode: 'transparent'
};

@autobind
class SWF extends Base {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super(container, options);
        this.playerEl = this.containerEl.appendChild(document.createElement('div'));
        this.playerEl.id = 'flash-player';
    }

    /**
     * Loads a swf object.
     * @param {String} swfUrl The swf to load
     * @public
     * @returns {Promise}
     */
    load(swfUrl) {
        return new Promise((resolve, reject) => {
            swfobject.embedSWF(swfUrl, 'flash-player', '100%', '100%', '9', null, null, SWF_PARAMS, null, () => {
                resolve(this);
                this.loaded = true;
                this.emit('load');
            });

            setTimeout(() => {
                if (!this.loaded) {
                    reject();
                }
            }, SWF_LOAD_TIMEOUT_IN_MILLIS);
        });
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.SWF = SWF;
global.Box = Box;
export default Box.Preview.SWF;