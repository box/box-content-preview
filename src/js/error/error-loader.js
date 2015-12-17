'use strict';

import AssetLoader from '../asset-loader';

const VIEWER = {
    REPRESENTATION: 'original',
    EXTENSIONS: [ ],
    SCRIPTS: [ 'error.js' ],
    STYLESHEETS: [ 'error.css' ],
    CONSTRUCTOR: 'Error'
};

class ErrorLoader extends AssetLoader {

    /**
     * Determines if this loader can be used
     *
     * @override
     * @returns {Boolean} always true
     */
    canLoad() {
        return true;
    }

    /**
     * Chooses a viewer based on file extension.
     *
     * @override
     * @returns {Object} the viewer to use
     */
    determineViewer() {
        return VIEWER;
    }

    /**
     * Prefetches assets
     *
     * @override
     * @returns {void}
     */
    prefetch() {
        // no-op
    }
}

export default new ErrorLoader();