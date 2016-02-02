'use strict';

import Box3DControls from '../box3d-controls';

/**
 * Image360Controls
 * This class handles the UI for 3d preview controls. This includes Reset,
 * Render Mode selection, VR and fullscreen buttons.
 * @class
 */
class Image360Controls extends Box3DControls  {
    /**
     * Create additional controls for the control bar, that pertain to Image360 viewing
     * @inheritdoc
     * @constructor
     */
    constructor(containerEl) {
        super(containerEl);
    }

    /**
     * @inheritdoc
     */
    addUi() {
        super.addUi();

        const switch2DControl = this.createControlItem('controls-2d', this.switchTo2dViewer.bind(this), '2D');
        this.controlBar.appendChild(switch2DControl);
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
