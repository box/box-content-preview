import autobind from 'autobind-decorator';
import Base from '../../base';

const Box = global.Box || {};

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
     * @returns {void}
     */
    load(swfUrl) {
        /* global swfobject */
        swfobject.embedSWF(this.appendAuthParam(swfUrl), this.playerEl.id, '100%', '100%', '9', null, null, SWF_PARAMS, null, () => {
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
