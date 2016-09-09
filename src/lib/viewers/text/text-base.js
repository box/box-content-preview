import autobind from 'autobind-decorator';
import Controls from '../../controls';
import Base from '../../base';
import {
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../../icons/icons';

@autobind
class TextBase extends Base {

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        // Destroy the controls
        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        super.destroy();
    }

    /**
     * Zooms by increasing or decreasing font size
     * @public
     * @param {string} inOrOut in or out
     * @returns {void}
     */
    zoom(inOrOut) {
        const el = this.containerEl.firstElementChild;
        const size = parseInt(el.style.fontSize, 10) || 100;

        if (inOrOut === 'in') {
            el.style.fontSize = `${size + 10}%`;
        } else if (inOrOut === 'out') {
            el.style.fontSize = `${size - 10}%`;
        }

        this.emit('resize');
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
        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-text-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-text-zoom-in-icon', ICON_ZOOM_IN);
        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'box-preview-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'box-preview-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Handles keyboard events for media
     *
     * @private
     * @param {string} key keydown key
     * @returns {boolean} consumed or not
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
}

export default TextBase;
