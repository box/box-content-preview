import AssetLoader from '../asset-loader';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REP: ORIGINAL_REP_NAME,
        EXT: ['boxnote', 'boxdicom'],
        JS: ['iframe.js'],
        CSS: [],
        NAME: 'IFrame'
    }
];

class IFrameLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {IFrameLoader} IFrameLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

    /**
     * Override default prefetch functionality with no-op.
     * @override
     * @returns {void}
     */
    prefetch() {}
}

export default new IFrameLoader();
