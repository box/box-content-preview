import EventEmitter from 'events';
import Controls from '../../Controls';
import { EVENT_RESET, EVENT_SCENE_LOADED, EVENT_TOGGLE_FULLSCREEN, EVENT_TOGGLE_VR } from './box3DConstants';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT, ICON_3D_VR } from '../../icons';
import './Box3DControls.scss';

import { CLASS_HIDDEN } from '../../constants';
import { UIRegistry } from './Box3DUIUtils';

class Box3DControls extends EventEmitter {
    /** @property {HTMLElement} - Reference to the parent container to nest UI in */
    el;

    /** @property {Controls} - Control bar used to interact with the 3D scene */
    controls;

    /** @property {UIRegistry} - Used to track and cleanup UI components */
    uiRegistry;

    /** @property {HTMLElement} - Button used to enable/disable VR mode */
    vrButtonEl;

    /** @property {boolean} - State used to show and hide the VR button */
    vrButtonVisible = false;

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

        this.el = containerEl;
        this.controls = new Controls(this.el);

        this.uiRegistry = new UIRegistry();

        this.handleToggleFullscreen = this.handleToggleFullscreen.bind(this);
        this.handleToggleVr = this.handleToggleVr.bind(this);
        this.handleReset = this.handleReset.bind(this);
    }

    /**
     * Add and create any UI to the container element and control bar
     *
     * @return {void}
     */
    addUi() {
        this.addVrButton();
        this.addFullscreenButton();
        this.hideVrButton();
    }

    /**
     * Adds full screen button
     *
     * @return {void}
     */
    addFullscreenButton() {
        this.controls.add(
            __('enter_fullscreen'),
            this.handleToggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN,
        );
        this.controls.add(
            __('exit_fullscreen'),
            this.handleToggleFullscreen,
            'bp-exit-fullscreen-icon',
            ICON_FULLSCREEN_OUT,
        );
    }

    /**
     * Adds vr toggle button
     *
     * @return {void}
     */
    addVrButton() {
        this.vrButtonEl = this.controls.add(__('box3d_toggle_vr'), this.handleToggleVr, '', ICON_3D_VR);
        if (this.vrButtonVisible) {
            this.showVrButton();
        } else {
            this.hideVrButton();
        }
    }

    /**
     * Emit scene loaded message
     *
     * @return {void}
     */
    handleSceneLoaded() {
        this.emit(EVENT_SCENE_LOADED);
    }

    /**
     * Handle a toggle of VR event, and emit a message
     *
     * @return {void}
     */
    handleToggleVr() {
        this.emit(EVENT_TOGGLE_VR);
    }

    /**
     * Handle toggling fullscreen, and update control bar items
     *
     * @return {void}
     */
    handleToggleFullscreen() {
        this.emit(EVENT_TOGGLE_FULLSCREEN);
    }

    /**
     * Send a reset event message
     *
     * @return {void}
     */
    handleReset() {
        this.emit(EVENT_RESET);
    }

    /**
     * Enables the VR button
     *
     * @return {void}
     */
    showVrButton() {
        this.vrButtonVisible = true;
        if (this.vrButtonEl) {
            this.vrButtonEl.classList.remove(CLASS_HIDDEN);
        }
    }

    /**
     * Disables the VR button
     *
     * @return {void}
     */
    hideVrButton() {
        this.vrButtonVisible = false;
        if (this.vrButtonEl) {
            this.vrButtonEl.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Set visibility of an element
     *
     * @param {HTMLElement} element - The element we are setting visibility on
     * @param {boolean} visible - True for visible, false for hidden
     * @return {void}
     */
    setElementVisibility(element, visible) {
        if (visible) {
            element.classList.remove(CLASS_HIDDEN);
        } else {
            element.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Toggle the visibility of an elements
     *
     * @param {HTMLElement} element - The element we want to toggle visibility on
     * @return {void}
     */
    toggleElementVisibility(element) {
        element.classList.toggle(CLASS_HIDDEN);
    }

    /**
     * Destroy all controls, and this module
     *
     * @return {void}
     */
    destroy() {
        if (this.controls) {
            this.controls.destroy();
        }

        if (this.uiRegistry) {
            this.uiRegistry.unregisterAll();
        }

        this.controls = null;
        this.uiRegistry = null;
    }
}

export default Box3DControls;
