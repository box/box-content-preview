'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import Controls from '../controls';
import Base from '../base';

@autobind
class ImageBase extends Base {

    /**
     * Zooms in
     * @public
     * @returns {void}
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Zooms in
     * @public
     * @returns {void}
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Zooms in
     * @private
     * @returns {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-image-zoom-in-icon');
        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-image-zoom-out-icon');
        this.controls.add(__('fullscreen'), this.toggleFullscreen, 'box-preview-image-expand-icon');
    }        
}

export default ImageBase;
