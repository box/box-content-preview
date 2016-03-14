import Box3DControls from '../box3d-controls';

/**
 * Image360Controls
 * This class handles the UI for 3d preview controls. This includes Reset,
 * Render Mode selection, VR and fullscreen buttons.
 * @class
 */
class Image360Controls extends Box3DControls {
    /**
     * @inheritdoc
     */
    addUi() {
        super.addUi();
        this.controls.add(__('view_as_2D'), this.switchTo2dViewer.bind(this), 'box-preview-media-controls-2d box-preview-no-user-highlight', '2D');
    }

    /**
     * Switches back to 2D viewer
     * @returns {void}
     */
    switchTo2dViewer() {
        this.emit('switch2d');
    }
}

export default Image360Controls;
