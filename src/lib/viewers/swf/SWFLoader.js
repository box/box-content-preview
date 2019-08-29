import AssetLoader from '../AssetLoader';
import SWFViewer from './SWFViewer';
import { ORIGINAL_REP_NAME } from '../../constants';
import { ERROR_CODE } from '../../events';
import Browser from '../../Browser';
import PreviewError from '../../PreviewError';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'SWF',
        CONSTRUCTOR: SWFViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['swf'],
    },
];

class SWFLoader extends AssetLoader {
    /**
     * [constructor]
     * @return {SwfLoader} SwfLoader instance
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
        if (viewer && !Browser.hasFlash()) {
            throw new PreviewError(ERROR_CODE.FLASH_NOT_ENABLED, __('error_flash_not_enabled'));
        }

        return viewer;
    }
}

export default new SWFLoader();
