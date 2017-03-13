import AssetLoader from '../AssetLoader';
import SWF from './SWF';
import { ORIGINAL_REP_NAME } from '../../constants';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        NAME: 'SWF',
        CONSTRUCTOR: SWF,
        REP: ORIGINAL_REP_NAME,
        EXT: ['swf']
    }
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
}

export default new SWFLoader();
