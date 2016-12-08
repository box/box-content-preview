import Base360Loader from '../base360-loader';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REPRESENTATION: '3d',
        EXTENSIONS: ['jpg', 'jpeg', 'png', 'ai', 'bmp', 'dcm', 'eps', 'gif', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff'],
        SCRIPTS: [
            `${STATIC_URI}boxsdk.js`,
            `${STATIC_URI}box3d-runtime.js`,
            `${STATIC_URI}webvr-polyfill.js`,
            `${STATIC_URI}WebVR/VREffect.js`,
            `${STATIC_URI}WebVR/VRControls.js`,
            `${STATIC_URI}WebVR/VRConfig.js`,
            'image360.js'
        ],
        STYLESHEETS: ['image360.css'],
        CONSTRUCTOR: 'Image360',
        PREFETCH: 'xhr'
    }
];

class Image360Loader extends Base360Loader {

    /**
     * Instantiates a loader for 360 degree image preview.
     * @constructor
     * @returns {Image360Loader} The image360 loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new Image360Loader();
