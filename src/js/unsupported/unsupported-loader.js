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
     * @param {Object} file box file
     * @return {Boolean}
     */
    canLoad() {
        return true;    
    }

    /**
     * Chooses a viewer based on file extension.
     * 
     * @param {Object} file box file
     * @return {Object} the viewer to use
     */
    determineViewer() {
        return VIEWER;
    }
}

export default new UnsupportedLoader();