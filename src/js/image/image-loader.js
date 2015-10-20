'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

const VIEWERS = [
    {
        REPRESENTATION: 'png',
        EXTENSIONS: [ 'ai', 'bmp', 'eps', 'png', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff' ],
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image'
    },
    {
        REPRESENTATION: 'jpg',
        EXTENSIONS: [ 'jpeg', 'jpg' ],
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image'
    },
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'gif' ],
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image'
    },
    {
        REPRESENTATION: 'multi-image',
        EXTENSIONS: [ 'tif', 'tiff' ],
        SCRIPTS: [ 'multi-image.js' ],
        STYLESHEETS: [ 'multi-image.css' ],
        CONSTRUCTOR: 'MultiImage'
    }
];

class ImageLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {ImageLoader}
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new ImageLoader();