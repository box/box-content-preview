'use strict';

import autobind from 'autobind-decorator';
import Controls from '../controls';
import Base from '../base';

@autobind
class ImageBase extends Base {

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        // Destroy the controls
        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        // Remove listeners
        if (this.imageEl) {
            this.imageEl.removeEventListener('mouseup', this.handleMouseUp);
        }
        
        super.destroy();
    }

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
