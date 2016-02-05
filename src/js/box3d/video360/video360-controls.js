'use strict';

import EventEmitter from 'events';
import {
    CSS_CLASS_HIDDEN,
    EVENT_ENABLE_VR,
    EVENT_DISABLE_VR
} from '../box3d-constants';
import {
    EVENT_SWITCH_2D
} from './video360-constants';

class Video360Controls extends EventEmitter {

    /**
     * Base class for building 3D previews on. Contains events for VR, Fullscreen,
     * Scene Reset, and Scene Loaded. Also, used for programmatic building of control
     * bar UI.
     * @constructor
     * @param {HTMLElement} containerEl The container element to put controls ui into
     * @returns {Box3DControls} Instance of Box3DControls
     */
    constructor(containerEl) {
        super();

        this.vrEnabled = false;

        this.el = containerEl;

        // Add any ui you want, to the parent container
        this.addUi();
        this.attachEventHandlers();
    }

    /**
     * Add and create any UI to the container element and control bar
     * @returns {void}
     */
    addUi() {
        let mediaControlsEl = this.el.querySelector('.box-preview-media-controls-container');

        // Create the VR toggle button and then hide it.
        this.vrButton = mediaControlsEl.appendChild(document.createElement('button'));
        this.vrButton.classList.add('box-preview-media-controls-btn', 'controls-vr');
        this.vrButton.title = 'Enable VR Mode';
        this.vrButtonSpan = this.vrButton.appendChild(document.createElement('span'));
        this.vrButtonSpan.classList.add('icon-vr-toggle');
        this.vrButtonSpan.style.display = 'none';
        this.vrButton.style.display = 'none';

        // Cretae the button to toggle back to 2D viewing
        this.toggle2dButton = mediaControlsEl.appendChild(document.createElement('button'));
        this.toggle2dButton.classList.add('box-preview-media-controls-btn', 'controls-2d');
        this.toggle2dButton.title = 'Switch to 2D Viewer';
        let toggle2dButtonSpan = this.toggle2dButton.appendChild(document.createElement('span'));
        toggle2dButtonSpan.classList.add('switch-2d');
        toggle2dButtonSpan.innerText = 'Back to 2D';
        toggle2dButtonSpan.style.display = 'inline-block';

        // Hide the 360 button that Dash creates
        let toggle360Button = this.el.querySelector('.box-preview-image-switch-360-icon');
        toggle360Button.style.display = 'none';
    }

    /**
     * Attaches event handlers to buttons
     * @returns {void}
     */
    attachEventHandlers() {
        this.vrButton.addEventListener('click', this.handleToggleVr.bind(this));
        this.toggle2dButton.addEventListener('click', this.switchTo2dViewer.bind(this));
    }

    /**
     * Handle a toggle of VR event, and emit a message
     * @returns {void}
     */
    handleToggleVr() {
        this.vrEnabled = !this.vrEnabled;
        this.emit(this.vrEnabled ? EVENT_ENABLE_VR : EVENT_DISABLE_VR);
    }

    /**
     * Enables the VR button
     * @returns {void}
     */
    showVrButton() {
        this.vrButtonSpan.style.display = 'inline-block';
        this.vrButton.style.display = 'inline';
    }

    /**
     * Switches back to 2D viewer
     * @returns {void}
     */
    switchTo2dViewer() {
        this.emit(EVENT_SWITCH_2D);
    }

    /**
     * Destroy all controls, and this module
     * @returns {void}
     */
    destroy() {
        this.removeAllListeners();
        this.vrButton.removeEventListener('click', this.handleToggleVr);
        this.vrButton.parentElement.remove(this.vrButton);
    }

}

export default Video360Controls;
