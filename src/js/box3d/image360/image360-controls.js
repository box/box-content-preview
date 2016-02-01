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
     * [constructor]
     * @param {HTMLElement} containerEl the container element
     * @returns {Image360Controls} Image360Controls instance
     */
    constructor(containerEl) {
        super(containerEl);
    }

    addUi() {
        super.addUi();

        let switch2DControl = this.createControlItem('controls-2d', this.switchTo2dViewer.bind(this), '2D');
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
