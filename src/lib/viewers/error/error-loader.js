import AssetLoader from '../asset-loader';
import { ORIGINAL_REP_NAME } from '../../constants';

const VIEWERS = [{
    REP: ORIGINAL_REP_NAME,
    EXT: [],
    JS: ['error.js'],
    CSS: ['error.css'],
    NAME: 'PreviewError'
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
     * @returns {boolean} always true
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
