'use strict';

import AssetLoader from '../asset-loader';

const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'jpg' ],
        SCRIPTS: [ 'boxsdk-0.1.1.js', 'box3d-resource-loader-0.1.1.js',
            'box3d-runtime-0.8.1.js', 'image360.js' ],
        STYLESHEETS: [ 'image360.css' ],
        CONSTRUCTOR: 'Image360'
    },
    {
        REPRESENTATION: 'png',
        EXTENSIONS: [ 'ai', 'bmp', 'eps', 'gif', 'png', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff' ],
        SCRIPTS: [ 'boxsdk-0.1.1.js', 'box3d-resource-loader-0.1.1.js',

            'box3d-runtime-0.8.1.js', 'image360.js' ],
        STYLESHEETS: [ 'image360.css' ],
        CONSTRUCTOR: 'Image360'
    }
];

class Image360Loader extends AssetLoader {

    /**
     * [constructor]
     * @returns {Image360Loader} The image360 loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * A unique identifier for this loader
     *
     * @public
     * @returns {String} id of this loader
     */
    get id() {
        return 'box-image-360';
    }
}

export default new Image360Loader();
