'use strict';

import Promise from 'bluebird';
import AssetLoader from '../assets';

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