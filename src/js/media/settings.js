'use strict';

import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import settingTemplate from 'raw!../../html/media/settings.html';

const CLASS_SETTINGS = 'settings';
const CLASS_SETTINGS_SELECTED = 'settings-icon-selected';
const SELECTOR_SETTINGS_ICON = '.settings-icon';
const SELECTOR_SETTINGS_VALUE = '.settings-value';

@autobind
class Settings extends EventEmitter {

    /**
     * Service to handle the position and movement of a slider element
     *
     * [constructor]
     * @param {HTMLElement} containerEl container node
     * @param {String} quality the starting quality
     * @param {String} speed the starting speed
     * @returns {Settings} Settings menu instance
     */
    constructor(containerEl, quality, speed) {
        super();
        this.containerEl = containerEl;

        let template = settingTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        this.containerEl.appendChild(document.createRange().createContextualFragment(template));
        this.settings = this.containerEl.lastElementChild;
        this.settings.addEventListener('click', this.menuClickHandler);

        this.values = {};
        this.visible = false;
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        if (this.settings) {
            this.settings.removeEventListener('click', this.menuClickHandler);
        }
        document.removeEventListener('click', this.blurHandler);
    }

    /**
     * [destructor]
     * @returns {void}
     */
    reset() {
        this.settings.className = CLASS_SETTINGS;
    }

    /**
     * Finds the parent node that has dataset type
     *
     * @param {HTMLElement} target start dom location
     * @returns {HTMLElement} parent that has dataset type
     */
    findParentDataType(target) {
        let currentNode = target;
        while (currentNode && currentNode !== this.settings) {
            if (typeof currentNode.dataset.type === 'string') {
                return currentNode;
            } else {
                currentNode = currentNode.parentNode;
            }
        }
        return null;
    }

    /**
     * Extracts info out of the click target
     *
     * @param {Event} event click event
     * @returns {void}
     */
    menuClickHandler(event) {

        // Extract the parent target dataset element
        let target = this.findParentDataType(event.target);
        if (!target) {
            return;
        }

        let type = target.dataset.type;
        let value = target.dataset.value;

        if (type === 'menu') {
            // We are in the sub menu and going back to the main menu
            this.reset();
        } else if (type && value) {
            // We are in the sub-menu and clicked a valid option
            this.reset();
            this.hide();
            this.values[type] = value;
            this.emit(type, value);
            this.settings.querySelector('[data-type="' + type + '"] ' + SELECTOR_SETTINGS_VALUE).innerHTML = target.querySelector(SELECTOR_SETTINGS_VALUE).innerHTML;
            this.settings.querySelector('[data-type="' + type + '"] ' + SELECTOR_SETTINGS_ICON + '.' + CLASS_SETTINGS_SELECTED).classList.remove(CLASS_SETTINGS_SELECTED);
            target.querySelector(SELECTOR_SETTINGS_ICON).classList.add(CLASS_SETTINGS_SELECTED);
        } else if (type) {
            // We are in the main menu and clicked a valid option
            this.settings.classList.add('show-' + type);
        }
    }

    /**
     * Handles blur of the menu
     *
     * @private
     * @param {Event} event click event
     * @returns {void}
     */
    blurHandler(event) {
        if (!this.settings.contains(event.target)) {
            this.hide();
        }
    }

    /**
     * Getter for the value of quality
     *
     * @public
     * @returns {String} The quality
     */
    isVisible() {
        return this.visible;
    }

    /**
     * Shows the menu
     *
     * @public
     * @returns {void}
     */
    show() {
        this.settings.style.display = 'block';
        this.visible = true;

        // Asynchronously add a blur handler.
        // Needs to be async so that event is not caught on bubble when settings icon is clicked
        setTimeout(() => {
            document.addEventListener('click', this.blurHandler);
        }, 0);
    }

    /**
     * Hides the menu
     *
     * @public
     * @returns {void}
     */
    hide() {
        this.settings.style.display = 'none';
        this.visible = false;
        document.removeEventListener('click', this.blurHandler);
    }
}

export default Settings;