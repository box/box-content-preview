import EventEmitter from 'events';
import Controls from '../controls';
import autobind from 'autobind-decorator';
import {
    EVENT_ENABLE_VR,
    EVENT_DISABLE_VR,
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_TOGGLE_FULLSCREEN
} from './box3d-constants';
import {
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../icons/icons';

const CSS_CLASS_HIDDEN = 'box-preview-is-hidden';

@autobind
class Box3DControls extends EventEmitter {

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

        // List of registered elements and their events
        this.eventRegistry = {};


        this.el = containerEl;

        this.controls = null;
        this.resetButtonEl = null;
        this.vrButtonEl = null;
    }

    /**
     * Add and create any UI to the container element and control bar
     * @returns {void}
     */
    addUi() {
        this.controls = new Controls(this.el);
        this.resetButtonEl = this.controls.add(__('reset_camera'), this.handleReset, 'box-preview-reset-icon');
        this.vrButtonEl = this.controls.add(__('vr'), this.handleToggleVr, 'box-preview-vr-toggle-icon');
        this.controls.add(__('enter_fullscreen'), this.handleToggleFullscreen, 'box-preview-3d-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.handleToggleFullscreen, 'box-preview-3d-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);

        this.hideVrButton();
    }

    /**
     * Register an element for automatic event unbinding and cleanup
     * @param {string} uniqueId  A unique identifier for accessing the given element
     * @param {HTMLElement} element   The element we are registering
     * @param {string} [eventName] An event we want to bind to
     * @param {Function} [callback]  A function we want to call, on the provided event happening
     * @returns {void}
     */
    registerUiItem(uniqueId, element, eventName, callback) {
        if (!this.eventRegistry[uniqueId]) {
            this.eventRegistry[uniqueId] = {
                el: element,
                uuid: uniqueId,
                events: {}
            };
        }

        if (eventName && callback) {
            element.addEventListener(eventName, callback);

            const registeredEvents = this.eventRegistry[uniqueId].events;
            registeredEvents[eventName] = registeredEvents[eventName] || [];
            registeredEvents[eventName].push(callback);
        }
    }

    /**
     * Unregistrer and remove the UI item
     * @param {Object} item The ui item created in registerUiItem()
     * @returns {void}
     */
    unregisterUiItem(item) {
        if (!this.eventRegistry[item.uuid]) {
            return;
        }

        if (item.el.parentElement) {
            item.el.parentElement.removeChild(item.el);
        }

        Object.keys(item.events).forEach((eventName) => {
            item.events[eventName].forEach((callback) => {
                item.el.removeEventListener(eventName, callback);
            });
            /*eslint-disable*/
            delete item.events[eventName];
            delete item.el;
            /*eslint-enable*/
        });

        delete this.eventRegistry[item.uuid];
    }

    /**
     * Unregister the entire ui registry
     * @returns {void}
     */
    unregisterUiItems() {
        Object.keys(this.eventRegistry).forEach((uiItem) => {
            this.unregisterUiItem(this.eventRegistry[uiItem]);
        });
    }

    /**
     * Emit scene loaded message
     * @returns {void}
     */
    handleSceneLoaded() {
        this.emit(EVENT_SCENE_LOADED);
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
     * Handle toggling fullscreen, and update control bar items
     * @returns {[type]} [description]
     */
    handleToggleFullscreen() {
        this.emit(EVENT_TOGGLE_FULLSCREEN);
    }

    /**
     * Send a reset event message
     * @returns {void}
     */
    handleReset() {
        this.emit(EVENT_RESET);
    }


    /**
     * Enables the VR button
     * @returns {void}
     */
    showVrButton() {
        this.vrButtonEl.classList.remove(CSS_CLASS_HIDDEN);
    }

    /**
     * Disables the VR button
     * @returns {void}
     */
    hideVrButton() {
        this.vrButtonEl.classList.add(CSS_CLASS_HIDDEN);
    }

    /**
     * Set visibility of an element
     * @param {HTMLElement} element The element we are setting visibility on
     * @param {Boolean} visible True for visible, false for hidden
     * @returns {void}
     */
    setElementVisibility(element, visible) {
        if (visible) {
            element.classList.remove(CSS_CLASS_HIDDEN);
        } else {
            element.classList.add(CSS_CLASS_HIDDEN);
        }
    }

    /**
     * Toggle the visibility of an elements
     * @param {HTMLElement} element The element we want to toggle visibility on
     * @returns {void}
     */
    toggleElementVisibility(element) {
        element.classList.toggle(CSS_CLASS_HIDDEN);
    }

    /**
     * Destroy all controls, and this module
     * @returns {void}
     */
    destroy() {
        if (this.controls) {
            this.controls.destroy();
        }
        this.unregisterUiItems();
    }

}

export default Box3DControls;
