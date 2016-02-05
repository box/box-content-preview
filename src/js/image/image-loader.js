'use strict';

import AssetLoader from '../asset-loader';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a gif file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the png representation (for watermarked versions).
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'gif' ],
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image',
        PREFETCH: 'xhr'
    },
    {
        REPRESENTATION: 'multi-image',
        EXTENSIONS: [ 'tif', 'tiff' ],
        SCRIPTS: [ 'multi-image.js' ],
        STYLESHEETS: [ 'multi-image.css' ],
        CONSTRUCTOR: 'MultiImage'
    },
    {
        REPRESENTATION: 'jpg',
        EXTENSIONS: [ 'jpeg', 'jpg' ],
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image',
        PREFETCH: 'xhr'
    },
    {
        REPRESENTATION: 'png',
        EXTENSIONS: [ 'ai', 'bmp', 'dcm', 'eps', 'gif', 'png', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff' ],
        SCRIPTS: [ 'image.js' ],
        STYLESHEETS: [ 'image.css' ],
        CONSTRUCTOR: 'Image',
        PREFETCH: 'xhr'
    }
];

class ImageLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {ImageLoader} ImageLoader instance
     */
    constructor() {
        super();
        this.type = 'image';
        this.viewers = VIEWERS;
    }
}

export default new ImageLoader();