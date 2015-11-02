'use strict';

import AssetLoader from '../assets';

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
     * @returns {ImageLoader}
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }
}

export default new SwfLoader();