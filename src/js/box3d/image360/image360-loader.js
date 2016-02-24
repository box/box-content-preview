'use strict';

import AssetLoader from '../../asset-loader';

const STATIC_URI = 'third-party/model3d/';
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'jpg', 'png' ],
        SCRIPTS: [ STATIC_URI + 'boxsdk-0.2.0.js', STATIC_URI + 'box3d-resource-loader-0.1.2.js', STATIC_URI + 'box3d-runtime-0.9.1.js', 'image360.js' ],
        STYLESHEETS: [ 'image360.css' ],
        CONSTRUCTOR: 'Image360'
    },
    {
        REPRESENTATION: 'png',
        EXTENSIONS: [ 'ai', 'bmp', 'dcm', 'eps', 'gif', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff' ],
        SCRIPTS: [ STATIC_URI + 'boxsdk-0.2.0.js', STATIC_URI + 'box3d-resource-loader-0.1.2.js', STATIC_URI + 'box3d-runtime-0.9.1.js', 'image360.js' ],
        STYLESHEETS: [ 'image360.css' ],
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
