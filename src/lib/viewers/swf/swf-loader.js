import AssetLoader from '../asset-loader';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REP: ORIGINAL_REP_NAME,
        EXT: ['swf'],
        JS: ['third-party/swf/swfobject.js', 'swf.js'],
        CSS: [],
        NAME: 'SWF'
    }
];

class SwfLoader extends AssetLoader {

    /**
     * [constructor]
     * @returns {SwfLoader} SwfLoader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new SwfLoader();
