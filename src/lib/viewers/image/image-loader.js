import AssetLoader from '../asset-loader';
import Image from './image';
import MultiImage from './multi-image';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
// For example, a gif file can be previewed both natively (majority use case) using the original
// representation but can fallback to using the png representation (for watermarked versions).
const VIEWERS = [
    {
        REP: ORIGINAL_REP_NAME,
        EXT: ['svg', 'gif'],
        NAME: Image
    },
    {
        REP: 'multi-image',
        EXT: ['tif', 'tiff'],
        NAME: MultiImage
    },
    {
        REP: 'jpg',
        EXT: ['jpeg', 'jpg'],
        NAME: Image,
        ASSET: '1.jpg'
    },
    {
        REP: 'png',
        EXT: ['ai', 'bmp', 'dcm', 'eps', 'gif', 'png', 'ps', 'psd', 'svs', 'tga', 'tif', 'tiff'],
        NAME: Image,
        PREFETCH: 'img',
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
