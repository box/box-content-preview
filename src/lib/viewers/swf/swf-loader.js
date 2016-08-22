import AssetLoader from '../../asset-loader';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: ['swf'],
        SCRIPTS: ['third-party/swf/swfobject.js', 'swf.js'],
        STYLESHEETS: [],
        CONSTRUCTOR: 'SWF'
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
