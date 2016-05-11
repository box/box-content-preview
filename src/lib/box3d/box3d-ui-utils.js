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
 * @returns {HtmlElement} The newly create label element
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
 * Create a dropdown for the settings panel,
 * @param {[type]} labelText [description]
 * @param {[type]} listText [description]
 * @param {} listContent [desc] { text, callback, args }
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

    const length = listContent.length;
    for (let i = 0; i < length; ++i) {
        const text = listContent[i].text || '';
        const listItemEl = document.createElement('li');
        listItemEl.textContent = text;

        listItemEl.addEventListener('click', () => {
            listLabelEl.textContent = text;
            dropdownEl.classList.toggle(CSS_CLASS_HIDDEN);
        });

        const callback = listContent[i].callback;
        // Callbacks come as a string OR a function
        if (callback && typeof callback === 'function') {
            listItemEl.addEventListener('click', callback);
        }

        dropdownEl.appendChild(listItemEl);
    }

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
}

export { createButton, createDropdown, createLabel, createPullup, createRow, UIRegistry };
