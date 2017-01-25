import AssetLoader from '../asset-loader';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a gif file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the png representation (for watermarked versions).
const VIEWERS = [
    {
        REP: ORIGINAL_REP_NAME,
        EXT: ['svg', 'gif'],
        JS: ['image.js'],
        CSS: ['image.css'],
        NAME: 'Image',
        PREFETCH: 'img'
    },
    {
        REP: 'multi-image',
        EXT: ['tif', 'tiff'],
        JS: ['multi-image.js'],
        CSS: ['multi-image.css'],
        NAME: 'MultiImage',
        PREFETCH: 'img'
    },
    {
        REP: 'jpg',
        EXT: ['jpeg', 'jpg'],
        JS: ['image.js'],
        CSS: ['image.css'],
        NAME: 'Image',
        PREFETCH: 'img',
        ASSET: '1.jpg'
    },
    {
        REP: 'png',
        EXT: ['ai', 'bmp', 'dcm', 'eps', 'gif', 'png', 'ps', 'psd', 'svs', 'tga', 'tif', 'tiff'],
        JS: ['image.js'],
        CSS: ['image.css'],
        NAME: 'Image',
        PREFETCH: 'img',
        ASSET: '1.png'
    }
];

class ImageLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {ImageLoader} ImageLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new ImageLoader();
