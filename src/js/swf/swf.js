'use strict';

import autobind from 'autobind-decorator';
import Base from '../base';

let Box = global.Box || {};
let swfobject = global.swfobject;

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
     *
     * @param {String|HTMLElement} container The container
     * @param {Object} options some options
     * @returns {SWF} SWF instance
     */
    constructor(container, options) {
        super(container, options);
        this.playerEl = this.containerEl.appendChild(document.createElement('div'));
        this.playerEl.id = 'flash-player';
    }

    /**
     * Loads a swf object.
     *
     * @public
     * @param {String} swfUrl The swf to load
     * @returns {Promise} Promise to load a swf
     */
    load(swfUrl) {
        swfobject.embedSWF(this.appendAuthParam(swfUrl), 'flash-player', '100%', '100%', '9', null, null, SWF_PARAMS, null, () => {
            if (this.destroyed) {
                return;
            }
            this.loaded = true;
            this.emit('load');
        });
        super.load();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.SWF = SWF;
global.Box = Box;
export default SWF;