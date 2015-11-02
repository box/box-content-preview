'use strict';

import AssetLoader from '../assets';

const VIEWER = {
    REPRESENTATION: 'original',
    EXTENSIONS: [ ],
    SCRIPTS: [ 'unsupported.js' ],
    STYLESHEETS: [ 'unsupported.css' ],
    CONSTRUCTOR: 'Unsupported'
};

class UnsupportedLoader extends AssetLoader {

    /**
     * Determines if this loader can be used
     * 
     * @override
     * @return {Boolean}
     */
    canLoad() {
        return true;    
    }

    /**
     * Chooses a viewer based on file extension.
     * 
     * @override
     * @return {Object} the viewer to use
     */
    determineViewer() {
        return VIEWER;
    }

    /**
     * Prefetches assets
     *
     * @override
     * @return {void}
     */
    prefetch() {
        // no-op
    }
}

export default new UnsupportedLoader();