'use strict';

import EventEmitter from 'events';
import {
    CSS_CLASS_HIDDEN,
    EVENT_ENABLE_VR,
    EVENT_DISABLE_VR,
    EVENT_RESET,
    EVENT_TOGGLE_FULLSCREEN
} from './box3d-constants';

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

        this.controlBar = document.createElement('ul');
        this.controlBar.classList.add('box3d-controls', 'preview-overlay', 'preview-controls-3dcg');

        this.el.appendChild(this.controlBar);

        // Add any ui you want, to the parent container
        this.addUi();
    }

    /**
     * Add and create any UI to the container element and control bar
     * @returns {void}
     */
    addUi() {
        this.vrControl = this.createControlItem('icon-vr-toggle', this.handleToggleVr.bind(this));
        this.setElementVisibility(this.vrControl, false);
        this.controlBar.appendChild(this.vrControl);

        let resetControl = this.createControlItem('icon-reset', this.handleReset.bind(this));
        this.controlBar.appendChild(resetControl);

        this.enterFullscreenControl = this.createControlItem('icon-fullscreen', this.handleToggleFullscreen.bind(this));
        this.controlBar.appendChild(this.enterFullscreenControl);

        this.exitFullscreenControl = this.createControlItem('icon-minimize', this.handleToggleFullscreen.bind(this));
        this.setElementVisibility(this.exitFullscreenControl, false);
        this.controlBar.appendChild(this.exitFullscreenControl);
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
     * Create a button for the control bar
     * @param {string} iconClass The name of the class for the icon the user can click
     * @param {function} [callback] A callback to call on click of this button
     * @param {HTMLElement|string} [content] Additional HTML|string content to insert into the
     * control item, after the icon
     * @returns {HTMLElement} The button that has been create for the control bar
     */
    createControlItem(iconClass, callback = null, content = null) {
        const iconContainer = document.createElement('li');
        const iconContainerName = iconClass + 'control';
        iconContainer.classList.add('control-item', iconContainerName);

        const icon = document.createElement('span');
        icon.classList.add(iconClass);

        iconContainer.appendChild(icon);

        if (content) {
            if (typeof content === 'string') {
                iconContainer.innerHTML += content;
            } else {
                iconContainer.appendChild(content);
            }
        }

        if (typeof callback === 'function') {
            this.registerUiItem(iconContainerName, iconContainer, 'click', callback);
        }

        return iconContainer;
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
     * Remove all controls in the control bar, as well as remove event handlers
     * create in createControlButton()
     * @returns {void}
     */
    destroyControls() {
        //remove all controls from control bar
        Object.keys(this.eventRegistry).forEach((itemKey) => {
            const controlItem = this.eventRegistry[itemKey];
            this.destroyControlItem(controlItem);
            delete this.eventRegistry[itemKey];
        });
    }

    /**
     * Destroy a control item, and remove it from the control bar
     * @param {ControItem} controlItem A ControlItem with the element we want to remove
     * @returns {void}
     */
    destroyControlItem(controlItem) {
        controlItem.el.parentElement.removeChild(controlItem.el);
        this.clearControlItem(controlItem);
    }

    /**
     * Unbind all registered events from the registered Control Item
     * @param {ControlItem} controlItem The control item we want to remove events from
     * @returns {void}
     */
    clearControlItem(controlItem) {
        const events = controlItem.events;
        Object.keys(events).forEach((eventName) => {
            events[eventName].forEach((callback) => controlItem.el.removeEventListener(eventName, callback));
            delete events[eventName];
        });
    }

    /**
     * Destroy all controls, and this module
     * @returns {void}
     */
    destroy() {
        this.destroyControls();
    }

}

export default Box3DControls;
