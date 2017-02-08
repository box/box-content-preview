import autobind from 'autobind-decorator';
import Controls from '../../controls';
import Base from '../base';
import {
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../icons/icons';

@autobind
class ImageBase extends Base {

    /**
     * [destructor]
     * @return {void}
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
     * @return {void}
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Zooms in
     * @public
     * @return {void}
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Resize image by calling zoom.
     * @public
     * @return {void}
     */
    resize() {
        this.zoom();
        super.resize();
    }

    /**
     * Zooms in
     * @private
     * @return {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(__('zoom_out'), this.zoomOut, 'bp-image-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'bp-image-zoom-in-icon', ICON_ZOOM_IN);
    }

    /**
     * Handles keyboard events for media
     *
     * @private
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
     */
    onKeydown(key) {
        // Return false when media controls are not ready or are focused
        if (!this.controls) {
            return false;
        }

        if (key === 'Shift++') {
            this.zoomIn();
            return true;
        } else if (key === 'Shift+_') {
            this.zoomOut();
            return true;
        }

        return false;
    }


    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Must be implemented to zoom image
     *
     * @return {void}
     */
    zoom() {}
}

export default ImageBase;
