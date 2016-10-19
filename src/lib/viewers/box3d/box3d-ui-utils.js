import {
    CSS_CLASS_OVERLAY,
    CSS_CLASS_PULLUP,
    CSS_CLASS_SETTINGS_PANEL_LABEL,
    CSS_CLASS_SETTINGS_PANEL_ROW,
    CSS_CLASS_HIDDEN
} from './model3d/model3d-constants';

import {
    CLASS_BOX_PREVIEW_BUTTON,
    CLASS_BOX_PREVIEW_LINK,
    CLASS_BOX_PREVIEW_MENU,
    CLASS_BOX_PREVIEW_OVERLAY,
    CLASS_BOX_PREVIEW_OVERLAY_WRAPPER,
    CLASS_BOX_PREVIEW_TOGGLE_OVERLAY,
    CLASS_IS_VISIBLE
} from '../../constants';

/**
 * Create a label element.
 *
 * @param {string} [text] The text to be displayed
 * @returns {HTMLElement} The newly created label element
 */
function createLabel(text = '') {
    const label = document.createElement('div');
    label.classList.add(CSS_CLASS_SETTINGS_PANEL_LABEL);
    label.textContent = text;
    return label;
}

/**
 * Create a button element.
 *
 * @param {string} [text] Optional text to be displayed inside of the button
 * @returns {HTMLElement} The newly created button element
 */
function createButton(text = '') {
    const button = document.createElement('button');
    button.textContent = text;
    button.classList.add(CLASS_BOX_PREVIEW_BUTTON);
    return button;
}

/**
 * Create a checkbox.
 * @returns {HtmlElement} The newly created checkbox element
 */
function createCheckbox() {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    return checkbox;
}

/**
 * Create a pullup element.
 * @returns {HtmlElement} The newly created pullup element
 */
function createPullup() {
    const pullupEl = document.createElement('div');
    // Separate add() calls for compatability
    pullupEl.classList.add(CSS_CLASS_OVERLAY);
    pullupEl.classList.add(CSS_CLASS_PULLUP);
    pullupEl.classList.add(CSS_CLASS_HIDDEN);
    return pullupEl;
}

/**
 * Create an element with a label, as a row.
 *
 * @param {string} [labelText] The text to display as the row label
 * @returns {HTMLElement} The row element created
 */
function createRow(labelText) {
    const rowEl = document.createElement('div');
    rowEl.classList.add(CSS_CLASS_SETTINGS_PANEL_ROW);

    if (labelText) {
        const rowLabel = createLabel(labelText);
        rowEl.appendChild(rowLabel);
    }

    return rowEl;
}

/**
 * Create a dropdown for the settings panel.
 *
 * @param {string} labelText A label to display above the dropdown
 * @param {string} listText The default text to display inside of the dropdown, when closed and
 * no other options yet selected
 * @param {Object[]} [listContent] A list of descriptors to fill the dropdown with text and actions. { text, callback }
 * entry.text {string} Text content displayed as the dropdown item
 * entry.callback {Function} A function to be called on the 'click' event of the dropdown
 * @returns {HTMLElement} The settings dropdown that can be added to the settings panel
 */
function createDropdown(labelText = '', listText = '', listContent = []) {
    const wrapperEl = createRow(labelText);

    const overlayContainerEl = document.createElement('div');
    overlayContainerEl.classList.add(CLASS_BOX_PREVIEW_TOGGLE_OVERLAY);

    const overlayWrapperEl = document.createElement('div');
    overlayWrapperEl.classList.add(CLASS_BOX_PREVIEW_OVERLAY_WRAPPER);

    overlayWrapperEl.innerHTML = `<div class=${CLASS_BOX_PREVIEW_OVERLAY}>
                                        <menu class=${CLASS_BOX_PREVIEW_MENU}>
                                            <div class="link-group">
                                                <ul></ul>
                                            </div>
                                        </menu>
                                    </div>`;

    // Button for dropdown
    const dropdownButtonEl = document.createElement('button');
    dropdownButtonEl.textContent = listText;
    dropdownButtonEl.classList.add(CLASS_BOX_PREVIEW_BUTTON);
    dropdownButtonEl.addEventListener('click', () => {
        overlayWrapperEl.classList.toggle(CLASS_IS_VISIBLE);
    });

    const listEl = overlayWrapperEl.querySelector('ul');
    // Create list items
    listContent.forEach((entry) => {
        const li = document.createElement('li');
        const labelEl = document.createElement('a');
        labelEl.classList.add(CLASS_BOX_PREVIEW_LINK);
        labelEl.textContent = entry.text;
        labelEl.addEventListener('click', () => {
            dropdownButtonEl.textContent = entry.text;
            overlayWrapperEl.classList.toggle(CLASS_IS_VISIBLE);
            entry.callback();
        });
        li.appendChild(labelEl);
        listEl.appendChild(li);
    });

    // Add button and wrapper, in order
    overlayContainerEl.appendChild(dropdownButtonEl);
    overlayContainerEl.appendChild(overlayWrapperEl);

    wrapperEl.appendChild(overlayContainerEl);

    return wrapperEl;
}

/**
 * Used to register HTMLElements and events for easy management and destruction later.
 *
 * @class
 */
class UIRegistry {

    /**
     * @constructor
     */
    constructor() {
        // List of registered elements and their events
        this.eventRegistry = {};
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
     * Unregister and remove the UI item.
     *
     * @param {Object} item The ui item created in registerUiItem()
     * @returns {void}
     */
    unregisterUiItem(item) {
        // Assignment for modification of properties
        const uiItem = item;

        if (!this.eventRegistry[uiItem.uuid]) {
            return;
        }

        if (uiItem.el.parentElement) {
            uiItem.el.parentElement.removeChild(uiItem.el);
        }

        Object.keys(uiItem.events).forEach((eventName) => {
            uiItem.events[eventName].forEach((callback) => {
                uiItem.el.removeEventListener(eventName, callback);
            });
            delete uiItem.events[eventName];
            delete uiItem.el;
        });

        delete this.eventRegistry[uiItem.uuid];
    }

    /**
     * Unregister the entire ui registry.
     *
     * @returns {void}
     */
    unregisterUiItems() {
        Object.keys(this.eventRegistry).forEach((uiItem) => {
            this.unregisterUiItem(this.eventRegistry[uiItem]);
        });
    }
}

export {
    createButton,
    createCheckbox,
    createDropdown,
    createLabel,
    createPullup,
    createRow,
    UIRegistry
};
