'use strict';

import AssetLoader from '../asset-loader';

// Order of the viewers matters. Prefer original before others. Go from specific to general.
const VIEWERS = [
    {
        REPRESENTATION: 'original',
        EXTENSIONS: [ 'swf' ],
        SCRIPTS: [ 'swfobject.js', 'swf.js' ],
        STYLESHEETS: [ ],
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

    /**
     * A unique identifier for this loader
     *
     * @public
     * @returns {String} id of this loader
     */
    get id() {
        return 'box-swf';
    }
}

export default new SwfLoader();