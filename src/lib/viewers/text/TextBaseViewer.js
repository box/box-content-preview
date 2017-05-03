import autobind from 'autobind-decorator';
import Controls from '../../Controls';
import BaseViewer from '../BaseViewer';
import { checkPermission } from '../../file';
import { CLASS_IS_SELECTABLE, PERMISSION_DOWNLOAD } from '../../constants';
import {
    ICON_FILE_DOCUMENT,
    ICON_FILE_SPREADSHEET,
    ICON_FILE_CODE,
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../../icons/icons';

const LOADING_ICON_MAP = {
    csv: ICON_FILE_SPREADSHEET,
    log: ICON_FILE_DOCUMENT,
    tsv: ICON_FILE_SPREADSHEET,
    txt: ICON_FILE_DOCUMENT
};

@autobind
class TextBaseViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        const fileExt = this.options.file.extension;
        this.fileLoadingIcon = LOADING_ICON_MAP[fileExt] || ICON_FILE_CODE;

        // Call super() to set up common layout
        super.setup();
    }

    /**
     * [destructor]
     * @return {void}
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
     * @param {string} inOrOut - in or out
     * @return {void}
     */
    zoom(inOrOut) {
        const el = this.containerEl.querySelector('.bp-text');
        const size = parseInt(el.style.fontSize, 10) || 100;
        let newFontSize = 0;

        if (inOrOut === 'in') {
            newFontSize = `${size + 10}%`;
        } else if (inOrOut === 'out') {
            newFontSize = `${size - 10}%`;
        }

        el.style.fontSize = newFontSize;
        this.emit('zoom', {
            zoom: newFontSize,
            canZoomIn: true,
            canZoomOut: true
        });
    }

    /**
     * Zooms in.
     *
     * @return {void}
     * @public
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Zooms out.
     *
     * @return {void}
     * @public
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Loads content.
     *
     * @override
     * @return {void}
     */
    load() {
        // Enable text selection if user has download permissions and 'disableTextLayer' option is not true
        if (checkPermission(this.options.file, PERMISSION_DOWNLOAD) &&
            !this.getViewerOption('disableTextLayer')) {
            this.containerEl.classList.add(CLASS_IS_SELECTABLE);
        }

        super.load();
    }

    /**
     * Loads controls for zooming and fullscreen.
     *
     * @return {void}
     * @protected
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(__('zoom_out'), this.zoomOut, 'bp-text-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'bp-text-zoom-in-icon', ICON_ZOOM_IN);
        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Resize handler
     *
     * @override
     * @return {void}
     * @protected
     */
    resize() {
        super.resize();
    }

    /**
     * Handles keyboard events for media
     *
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
     * @protected
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

export default TextBaseViewer;
