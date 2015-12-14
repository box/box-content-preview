'use strict';

import AssetLoader from '../asset-loader';

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

    /**
     * A unique identifier for this loader
     *
     * @public
     * @returns {String} id of this loader
     */
    get id() {
        return 'box-unsupported';
    }
}

export default new UnsupportedLoader();