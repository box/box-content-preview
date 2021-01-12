import throttle from 'lodash/throttle';
import Browser from './Browser';
import { CLASS_HIDDEN } from './constants';

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const CONTROLS_BUTTON_CLASS = 'bp-controls-btn';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 2000;

export const CLASS_BOX_CONTROLS_GROUP_BUTTON = 'bp-controls-group-btn';

class Controls {
    /** @property {HTMLElement} - Controls container element */
    containerEl;

    /** @property {HTMLElement} - Controls element */
    controlsEl;

    /** @property {Object[]} - Array of button elements and their event listeners, used for cleanup */
    buttonRefs = [];

    /** @property {boolean} - Whether control bar should be hidden */
    shouldHide = true;

    /** @property {boolean} - Whether browser supports touch */
    hasTouch = Browser.hasTouch();

    /**
     * [constructor]
     *
     * @param {HTMLElement} container - The container
     * @return {Controls} Instance of controls
     */
    constructor(container) {
        this.containerEl = container;

        this.controlsEl = this.containerEl.appendChild(document.createElement('div'));
        this.controlsEl.className = 'bp-controls';
        this.controlsEl.setAttribute('data-testid', 'bp-controls');
        this.controlsEl.setAttribute('data-resin-component', 'toolbar');

        this.containerEl.addEventListener('mousemove', this.mousemoveHandler);
        this.controlsEl.addEventListener('mouseenter', this.mouseenterHandler);
        this.controlsEl.addEventListener('mouseleave', this.mouseleaveHandler);
        this.controlsEl.addEventListener('focusin', this.focusinHandler);
        this.controlsEl.addEventListener('focusout', this.focusoutHandler);
        this.controlsEl.addEventListener('click', this.clickHandler);

        if (this.hasTouch) {
            this.containerEl.addEventListener('touchstart', this.mousemoveHandler);
        }
    }

    /**
     * [destructor]
     * @return {void}
     */
    destroy() {
        this.containerEl.removeEventListener('mousemove', this.mousemoveHandler);
        this.controlsEl.removeEventListener('mouseenter', this.mouseenterHandler);
        this.controlsEl.removeEventListener('mouseleave', this.mouseleaveHandler);
        this.controlsEl.removeEventListener('focusin', this.focusinHandler);
        this.controlsEl.removeEventListener('focusout', this.focusoutHandler);
        this.controlsEl.removeEventListener('click', this.clickHandler);

        if (this.hasTouch) {
            this.containerEl.removeEventListener('touchstart', this.mousemoveHandler);
        }

        this.buttonRefs.forEach(ref => {
            ref.button.removeEventListener('click', ref.handler);
        });
    }

    /**
     * Checks if the button is a preview controls button
     *
     * @private
     * @param {HTMLElement|null} element - button element
     * @return {boolean} true if element is a preview control button
     */
    isPreviewControlButton(element) {
        return !!element && element.classList.contains(CONTROLS_BUTTON_CLASS);
    }

    /**
     * @private
     * @return {void}
     */
    resetTimeout() {
        clearTimeout(this.controlDisplayTimeoutId);
        this.controlDisplayTimeoutId = setTimeout(() => {
            clearTimeout(this.controlDisplayTimeoutId);

            if (!this.shouldHide) {
                this.resetTimeout();
            } else {
                this.containerEl.classList.remove(SHOW_PREVIEW_CONTROLS_CLASS);

                if (this.controlsEl.contains(document.activeElement)) {
                    document.activeElement.blur(); // blur out any potential button focuses within preview controls
                }
            }
        }, CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS);
    }

    /**
     * Mouse move handler
     *
     * @private
     * @return {void}
     */
    mousemoveHandler = throttle(() => {
        this.containerEl.classList.add(SHOW_PREVIEW_CONTROLS_CLASS);
        this.resetTimeout();
    }, CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS - 500);

    /**
     * Mouse enter handler
     *
     * @private
     * @return {void}
     */
    mouseenterHandler = () => {
        this.shouldHide = false;
    };

    /**
     * Mouse leave handler
     *
     * @private
     * @return {void}
     */
    mouseleaveHandler = () => {
        this.shouldHide = true;
    };

    /**
     * Handles all focusin events for the module.
     *
     * @private
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    focusinHandler = event => {
        // When we focus onto a preview control button, show controls
        if (this.isPreviewControlButton(event.target)) {
            this.containerEl.classList.add(SHOW_PREVIEW_CONTROLS_CLASS);
            this.shouldHide = false;
        }
    };

    /**
     * Handles all focusout events for the module.
     *
     * @private
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    focusoutHandler = event => {
        // When we focus out of a control button and aren't focusing onto another control button, hide the controls
        if (this.isPreviewControlButton(event.target) && !this.isPreviewControlButton(event.relatedTarget)) {
            this.shouldHide = true;
        }
    };

    /**
     * Handles click events for the control bar.
     *
     * @private
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    clickHandler = event => {
        if (event) {
            event.stopPropagation();
        }

        if (this.hasTouch) {
            this.shouldHide = true;
        }
    };

    /**
     * Adds element to controls
     *
     * @public
     * @param {string} text - text
     * @param {Function} handler - on click handler
     * @param {string} [classList] - optional class list
     * @param {string} [content] - Optional content HTML
     * @param {string} [tag] - Optional html tag, defaults to 'button'
     * @param {HTMLElement} [parent] - Optional parent tag, defaults to the controls element
     * @return {HTMLElement} The created HTMLElement inserted into the control
     */
    add(text, handler, classList = '', content = '', tag = 'button', parent = this.controlsEl) {
        const parentElement = this.controlsEl.contains(parent) ? parent : this.controlsEl;

        const cell = document.createElement('div');
        cell.className = 'bp-controls-cell';

        const element = document.createElement(tag);
        element.setAttribute('aria-label', text);
        element.setAttribute('title', text);

        if (tag === 'button') {
            element.setAttribute('type', 'button');
            element.className = `${CONTROLS_BUTTON_CLASS} ${classList}`;
            element.addEventListener('click', handler);
        } else {
            element.className = `${classList}`;
        }

        if (content) {
            element.innerHTML = content;
        }

        cell.appendChild(element);
        parentElement.appendChild(cell);

        if (handler) {
            // Maintain a reference for cleanup
            this.buttonRefs.push({
                button: element,
                handler,
            });
        }

        return element;
    }

    /**
     * Add div for a group of controls
     *
     * @public
     * @param {string} classNames - optional class names
     * @return {HTMLElement} The created HTMLElement for a group of controls
     */
    addGroup(classNames = '') {
        const group = document.createElement('div');
        group.className = `bp-controls-group ${classNames}`;

        this.controlsEl.appendChild(group);

        return group;
    }

    /**
     * Enables the controls.
     *
     * @public
     * @return {void}
     */
    enable() {
        this.controlsEl.classList.remove(CLASS_HIDDEN);
    }

    /**
     * Disables the controls.
     *
     * @public
     * @return {void}
     */
    disable() {
        this.controlsEl.classList.add(CLASS_HIDDEN);
    }
}

export default Controls;
