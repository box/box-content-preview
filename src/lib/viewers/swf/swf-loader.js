import AssetLoader from '../asset-loader';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REP: 'ORIGINAL',
        EXT: ['swf'],
        JS: ['third-party/swf/swfobject.js', 'swf.js'],
        CSS: [],
        NAME: 'SWF',
        ASSET: ''
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
