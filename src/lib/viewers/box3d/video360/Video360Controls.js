import EventEmitter from 'events';
import { EVENT_TOGGLE_VR } from '../box3DConstants';
import { ICON_3D_VR } from '../../../icons';

const CSS_CLASS_HIDDEN = 'bp-is-hidden';
const CSS_CLASS_MEDIA_CONTROLS_CONTAINER = 'bp-media-controls-container';
const CSS_CLASS_MEDIA_CONTROL_BUTTON = 'bp-media-controls-btn';

class Video360Controls extends EventEmitter {
    /** @property {HTMLElement} - Parent container for the controls */
    el;

    /** @property {HTMLElement} - Container that provides enabling/disabling of VR mode */
    vrButtonEl;

    /**
     * Base class for building 3D previews on. Contains events for VR, Fullscreen,
     * Scene Reset, and Scene Loaded. Also, used for programmatic building of control
     * bar UI.
     *
     * @constructor
     * @param {HTMLElement} containerEl - The container element to put controls ui into
     * @return {Box3DControls} Instance of Box3DControls
     */
    constructor(containerEl) {
        super();

        this.vrButtonEl = null;
        this.el = containerEl;
        this.handleToggleVr = this.handleToggleVr.bind(this);

        // Add any ui you want, to the parent container
        this.addUi();
        this.attachEventHandlers();
    }

    /**
     * Add and create any UI to the container element and control bar.
     *
     * @return {void}
     */
    addUi() {
        const mediaControlsEl = this.el.querySelector(`.${CSS_CLASS_MEDIA_CONTROLS_CONTAINER}`);

        // Create the VR toggle button and then hide it.
        this.vrButtonEl = mediaControlsEl.appendChild(document.createElement('button'));
        this.vrButtonEl.classList.add(CSS_CLASS_MEDIA_CONTROL_BUTTON);
        this.vrButtonEl.setAttribute('aria-label', __('box3d_toggle_vr'));
        this.vrButtonEl.setAttribute('title', __('box3d_toggle_vr'));
        this.vrButtonEl.classList.add(CSS_CLASS_HIDDEN);
        // Add icon to VR Button
        const vrButtonSpanEl = this.vrButtonEl.appendChild(document.createElement('span'));
        vrButtonSpanEl.innerHTML = ICON_3D_VR;
    }

    /**
     * Attaches event handlers to buttons.
     *
     * @return {void}
     */
    attachEventHandlers() {
        if (this.vrButtonEl) {
            this.vrButtonEl.addEventListener('click', this.handleToggleVr);
        }
    }

    /**
     * Detach event handlers from buttons.
     *
     * @return {void}
     */
    detachEventHandlers() {
        if (this.vrButtonEl) {
            this.vrButtonEl.removeEventListener('click', this.handleToggleVr);
        }
    }

    /**
     * Handle a toggle of VR event, and emit a message.
     *
     * @return {void}
     */
    handleToggleVr() {
        this.emit(EVENT_TOGGLE_VR);
    }

    /**
     * Enables the VR button.
     *
     * @return {void}
     */
    showVrButton() {
        if (this.vrButtonEl) {
            this.vrButtonEl.classList.remove(CSS_CLASS_HIDDEN);
        }
    }

    /**
     * Destroy all controls, and this module.
     *
     * @return {void}
     */
    destroy() {
        this.removeAllListeners();
        this.detachEventHandlers();

        if (this.vrButtonEl && this.vrButtonEl.parentElement) {
            this.vrButtonEl.parentElement.removeChild(this.vrButtonEl);
        }

        this.vrButtonEl = null;
        this.el = null;
        this.handleToggleVr = null;
    }
}

export default Video360Controls;
