import AssetLoader from '../asset-loader';

const VIEWERS = [{
    REPRESENTATION: 'original',
    EXTENSIONS: [],
    SCRIPTS: ['error.js'],
    STYLESHEETS: ['error.css'],
    CONSTRUCTOR: 'PreviewError'
}];

class ErrorLoader extends AssetLoader {

    /**
     * Instantiates a loader errors.
     * @constructor
     * @returns {ErrorLoader} The error loader instance
     */
    constructor() {
        super();
        this.viewers = VIEWERS;
    }

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
        return VIEWERS[0];
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
