import Base360Loader from '../base360-loader';
import Browser from '../../../browser';
import { replacePlaceholders } from '../../../util';
import Image360 from './image360';

const VIEWERS = [
    {
        REP: '3d',
        EXT: ['jpg', 'jpeg', 'png', 'ai', 'bmp', 'dcm', 'eps', 'gif', 'ps', 'psd', 'svg', 'svs', 'tga', 'tif', 'tiff'],
        NAME: Image360
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
