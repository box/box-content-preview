import Base360Loader from '../base360-loader';
import Browser from '../../../browser';
import { replacePlaceholders } from '../../../util';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REP: '3d',
        EXT: ['jpg', 'jpeg', 'png', 'ai', 'bmp', 'dcm', 'eps', 'gif', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff'],
        JS: [
            `${STATIC_URI}boxsdk.js`,
            `${STATIC_URI}box3d-runtime.js`,
            `${STATIC_URI}webvr-polyfill.js`,
            `${STATIC_URI}WebVR/VRConfig.js`,
            'image360.js'
        ],
        CSS: ['image360.css'],
        NAME: 'Image360',
        PREFETCH: 'xhr',
        ASSET: 'entities.json'
    }
];

class Image360Loader extends Base360Loader {

    /**
     * Instantiates a loader for 360 degree image preview.
     * @constructor
     * @return {Image360Loader} The image360 loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * @inheritdoc
     */
    determineViewer(file, disabledViewers = []) {
        const viewer = super.determineViewer(file, disabledViewers);
        if (viewer && !Browser.hasWebGL()) {
            const message = replacePlaceholders(__('error_unsupported'), [__('360_images')]);
            throw new Error(message);
        }

        return viewer;
    }
}

export default new Image360Loader();
