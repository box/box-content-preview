/**
 * @fileoverview Image annotator class. Extends base annotator class
 * @author spramod
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotation/annotator';

@autobind
class ImageAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [destructor]
     *
     * @override
     * @returns {void}
     */
    destroy() {
        super.destroy();
        this.removeAllListeners('pointmodeenter');
    }
}

export default ImageAnnotator;
