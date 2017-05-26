import AssetLoader from '../AssetLoader';
import IFrameViewer from './IFrameViewer';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'IFrame',
        CONSTRUCTOR: IFrameViewer,
        REP: ORIGINAL_REP_NAME,
        EXT: ['boxnote', 'boxdicom']
    }
];

class IFrameLoader extends AssetLoader {
    /**
     * [constructor]
     *
     * @return {IFrameLoader} IFrameLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new IFrameLoader();
