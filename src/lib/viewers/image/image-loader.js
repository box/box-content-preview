import AssetLoader from '../asset-loader';
import Image from './image';
import MultiImage from './multi-image';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a gif file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the png representation (for watermarked versions).
const VIEWERS = [
    {
        NAME: 'Image',
        CONSTRUCTOR: Image,
        REP: ORIGINAL_REP_NAME,
        EXT: ['svg', 'gif']
    },
    {
        NAME: 'MultiImage',
        CONSTRUCTOR: MultiImage,
        REP: 'png',
        EXT: ['tif', 'tiff'],
        ASSET: '{page}.png'
    },
    {
        NAME: 'Image',
        CONSTRUCTOR: Image,
        REP: 'jpg',
        EXT: ['jpeg', 'jpg'],
        ASSET: '1.jpg'
    },
    {
        NAME: 'Image',
        CONSTRUCTOR: Image,
        REP: 'png',
        EXT: ['ai', 'bmp', 'dcm', 'eps', 'gif', 'png', 'ps', 'psd', 'svs', 'tga', 'tif', 'tiff'],
        ASSET: '1.png'
    }
];

class ImageLoader extends AssetLoader {

    /**
     * [constructor]
     * @return {ImageLoader} ImageLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new ImageLoader();
