import AssetLoader from '../../asset-loader';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['360.jpg', '360.png'],
        SCRIPTS: [`${STATIC_URI}boxsdk.js`, `${STATIC_URI}box3d-resource-loader.js`,
            `${STATIC_URI}box3d-runtime.js`, 'image360.js'],
        STYLESHEETS: ['image360.css'],
        CONSTRUCTOR: 'Image360'
    },
    {
        REPRESENTATION: 'png',
        EXTENSIONS: ['360.ai', '360.bmp', '360.dcm', '360.eps', '360.gif', '360.ps', '360.psd',
            '360.svg', '360.svs', '360.tga', '360.tif', '360.tiff'],
        SCRIPTS: [`${STATIC_URI}boxsdk.js`, `${STATIC_URI}box3d-resource-loader.js`,
            `${STATIC_URI}box3d-runtime.js`, 'image360.js'],
        STYLESHEETS: ['image360.css'],
        CONSTRUCTOR: 'Image360'
    }
];

class Image360Loader extends AssetLoader {

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
