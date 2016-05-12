import {
    CSS_CLASS_OVERLAY,
    CSS_CLASS_PULLUP,
    CSS_CLASS_PANEL_BUTTON,
    CSS_CLASS_SETTINGS_PANEL_LABEL,
    CSS_CLASS_SETTINGS_PANEL_ROW,
    CSS_CLASS_SETTINGS_PANEL_SELECTOR_LABEL,
    CSS_CLASS_DEFAULT_SETTING_SELECTOR,
    CSS_CLASS_HIDDEN
} from './model3d/model3d-constants';


/**
 * Create a label
 * @param {string} text The text to put in the label
 * @returns {HtmlElement} The newly created label element
 */
function createLabel(text = '') {
    const label = document.createElement('div');
    label.classList.add(CSS_CLASS_SETTINGS_PANEL_LABEL);
    label.textContent = text;
    return label;
}

/**
 * Create a button
 * @param {string} [text] Optional text to be displayed inside of the button
 * @returns {HtmlElement} The newly created button element
 */
function createButton(text = '') {
    const button = document.createElement('button');
    button.textContent = text;
    button.classList.add(CSS_CLASS_PANEL_BUTTON);
    return button;
}

/**
 * Create a pullup element
 * @returns {HtmlElement} The newly created pullup element
 */
function createPullup() {
    const pullupEl = document.createElement('div');
    pullupEl.classList.add(CSS_CLASS_OVERLAY);
    pullupEl.classList.add(CSS_CLASS_PULLUP);
    pullupEl.classList.add(CSS_CLASS_HIDDEN);
    return pullupEl;
}

/**
 * Create an element with a label, as a row
 * @param {string} [labelText] The text to display as the row label
 * @returns {HtmlElement} The row element created
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
 * Create a dropdown for the settings panel
 * @param {string} labelText A label to display above the dropdown
 * @param {string} listText The default text to display inside of the dropdown, when closed and
 * no other options yet selected
 * @param {Object[]} [listContent] A list of descriptors to fill the dropdown with text and actions. { text, callback }
 * entry.text {string} Text content displayed as the dropdown item
 * entry.callback {Function} A function to be called on the 'click' event of the dropdown
 * @returns {HtmlElement} The settings dropdown that can be added to the settings panel
 */
function createDropdown(labelText = '', listText = '', listContent = []) {
    const wrapperEl = createRow(labelText);

    const dropdownWrapperEl = document.createElement('div');
    dropdownWrapperEl.classList.add(CSS_CLASS_DEFAULT_SETTING_SELECTOR);
    wrapperEl.appendChild(dropdownWrapperEl);

    const listLabelEl = document.createElement('span');
    listLabelEl.textContent = listText;
    listLabelEl.classList.add(CSS_CLASS_SETTINGS_PANEL_SELECTOR_LABEL);
    listLabelEl.classList.add(CSS_CLASS_PANEL_BUTTON);
    dropdownWrapperEl.appendChild(listLabelEl);

    const dropdownEl = document.createElement('ul');
    dropdownEl.classList.add(CSS_CLASS_HIDDEN);
    dropdownWrapperEl.appendChild(dropdownEl);

    listContent.forEach((entry) => {
        const text = entry.text || '';
        const listItemEl = document.createElement('li');
        listItemEl.textContent = text;

        listItemEl.addEventListener('click', () => {
            listLabelEl.textContent = text;
            dropdownEl.classList.toggle(CSS_CLASS_HIDDEN);
        });

        const callback = entry.callback;
        // Callbacks come as a string OR a function
        if (callback && typeof callback === 'function') {
            listItemEl.addEventListener('click', callback);
        }

        dropdownEl.appendChild(listItemEl);
    });

    listLabelEl.addEventListener('click', () => {
        dropdownEl.classList.toggle(CSS_CLASS_HIDDEN);
    });

    return wrapperEl;
}

/**
 * Used to register HTMLElements and events for easy management and destruction later
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
     * Unregister and remove the UI item
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
     * Unregister the entire ui registry
     * @returns {void}
     */
    unregisterUiItems() {
        Object.keys(this.eventRegistry).forEach((uiItem) => {
            this.unregisterUiItem(this.eventRegistry[uiItem]);
        });
    }
}

export { createButton, createDropdown, createLabel, createPullup, createRow, UIRegistry };
