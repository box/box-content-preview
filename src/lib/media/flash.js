import autobind from 'autobind-decorator';
import Base from '../base';
import { createAssetUrlCreator } from '../util';

const CSS_CLASS_FLASH = 'box-preview-media-flash';
const Box = global.Box || {};
const SWF_PARAMS = {
    allowfullscreen: 'true',
    allowFullScreen: 'true',
    allownetworking: 'always',
    allowNetworking: 'always',
    allowscriptaccess: 'always',
    allowScriptAccess: 'always',
    wmode: 'transparent'
};

@autobind
class Flash extends Base {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @returns {MP4} MP4 instance
     */
    constructor(container, options) {
        super(container, options);
        this.playerEl = this.containerEl.appendChild(document.createElement('div'));
        this.playerEl.classList.add(CSS_CLASS_FLASH);
        this.playerEl.id = 'flash-player';
    }

    load(mediaUrl) {
        this.mediaUrl = this.appendAuthParam(mediaUrl);
        this.initFlash();
    }


    /**
     * Init flash player, mousewheel, etc
     * @returns {void}
     */
    initFlash() {
        const flashvars = {
            backgroundColor: '#ffffff',
            conversion_on_realtime: true,
            lightbox_preview: true
        };

        const assetUrlCreator = createAssetUrlCreator(this.options.location);
        /* global swfobject */
        swfobject.embedSWF(assetUrlCreator('third-party/media/preview.swf'), 'flash-player', '100%', '100%', '9', null, flashvars, SWF_PARAMS);

        setTimeout(this.continueFlashInit, 5000);
    }

    /**
     * Continute initialization of the swf object when it is fully prepared by the swfobject method (external)
     * @returns {void}
     */
    continueFlashInit() {
        if (this.destroyed) {
            return;
        }

        const flashEl = this.containerEl.querySelector('object');
        const flashXML = `<?xml version="1.0" encoding="UTF-8"?>
            <document>
                <versions>
                    <version number="1" kind="video_480" status="success" printable="no" layout="continuous" autoscale="actual" scale="actual" low_fidelity="no">
                        <video url="${this.mediaUrl}"></video>
                    </version>
                </versions>
            </document>`;

        const itemContextDataToLoad = [{
            identifier: this.options.file.id,
            xml: flashXML.replace(/>\s*</g, '><')
        }];

        flashEl.updateFiles(itemContextDataToLoad, this.options.file.id);
        this.loaded = true;
        this.emit('load');
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Flash = Flash;
global.Box = Box;
export default Flash;
