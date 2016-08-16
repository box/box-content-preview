import EventEmitter from 'events';
import {
    EVENT_ENABLE_VR,
    EVENT_DISABLE_VR
} from '../box3d-constants';
import {
    ICON_3D_VR
} from '../../icons/icons';

const CSS_CLASS_HIDDEN = 'box-preview-is-hidden';

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
        const mediaControlsEl = this.el.querySelector('.box-preview-media-controls-container');

        // Create the VR toggle button and then hide it.
        this.vrButton = mediaControlsEl.appendChild(document.createElement('button'));
        this.vrButton.classList.add('box-preview-media-controls-btn');
        this.vrButton.setAttribute('aria-label', __('box3d_toggle_vr'));
        this.vrButton.setAttribute('title', __('box3d_toggle_vr'));
        this.vrButtonSpan = this.vrButton.appendChild(document.createElement('span'));
        this.vrButtonSpan.innerHTML = ICON_3D_VR;
        this.vrButton.classList.add(CSS_CLASS_HIDDEN);
    }

    /**
     * Attaches event handlers to buttons
     * @returns {void}
     */
    attachEventHandlers() {
        this.vrButton.addEventListener('click', this.handleToggleVr.bind(this));
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
        this.vrButton.classList.remove(CSS_CLASS_HIDDEN);
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
