import throttle from 'lodash.throttle';
import Browser from './Browser';
import { CLASS_HIDDEN } from './constants';

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const CONTROLS_BUTTON_CLASS = 'bp-controls-btn';
const CONTROLS_PAGE_NUM_INPUT_CLASS = 'bp-doc-page-num-input';
const CONTROLS_PAGE_NUM_WRAPPER_CLASS = 'bp-doc-page-num-wrapper';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 2000;

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

        const controlsWrapperEl = this.containerEl.appendChild(document.createElement('div'));
        controlsWrapperEl.className = 'bp-controls-wrapper';

        this.controlsEl = controlsWrapperEl.appendChild(document.createElement('div'));
        this.controlsEl.className = 'bp-controls';

        this.containerEl.addEventListener('mousemove', this.mousemoveHandler);
        this.controlsEl.addEventListener('mouseenter', this.mouseenterHandler);
        this.controlsEl.addEventListener('mouseleave', this.mouseleaveHandler);
        this.controlsEl.addEventListener('focusin', this.focusinHandler);
        this.controlsEl.addEventListener('focusout', this.focusoutHandler);

        if (this.hasTouch) {
            this.containerEl.addEventListener('touchstart', this.mousemoveHandler);
            this.controlsEl.addEventListener('click', this.clickHandler);
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

        if (this.hasTouch) {
            this.containerEl.removeEventListener('touchstart', this.mousemoveHandler);
            this.controlsEl.removeEventListener('click', this.clickHandler);
        }

        this.buttonRefs.forEach((ref) => {
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
        return (
            !!element &&
            (element.classList.contains(CONTROLS_BUTTON_CLASS) ||
                element.parentNode.classList.contains(CONTROLS_PAGE_NUM_WRAPPER_CLASS))
        );
    }

    /**
     * @private
     * @return {void}
     */
    resetTimeout() {
        clearTimeout(this.controlDisplayTimeoutId);
        this.controlDisplayTimeoutId = setTimeout(() => {
            clearTimeout(this.controlDisplayTimeoutId);

            if (!this.shouldHide || this.isPageNumFocused()) {
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
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    focusinHandler = (event) => {
        // When we focus onto a preview control button, show controls
        if (this.isPreviewControlButton(event.target)) {
            this.containerEl.classList.add(SHOW_PREVIEW_CONTROLS_CLASS);
            this.shouldHide = false;
        }
    };

    /**
     * Handles all focusout events for the module.
     *
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    focusoutHandler = (event) => {
        // When we focus out of a control button and aren't focusing onto another control button, hide the controls
        if (this.isPreviewControlButton(event.target) && !this.isPreviewControlButton(event.relatedTarget)) {
            this.shouldHide = true;
        }
    };

    /**
     * Handles click events for the control bar.
     *
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    clickHandler = () => {
        // If we are not focused in on the page num input, allow hiding after timeout
        this.shouldHide = true;
    };

    /**
     * Adds buttons to controls
     *
     * @private
     * @param {string} text - button text
     * @param {Function} handler - button handler
     * @param {string} [classList] - optional class list
     * @param {string} [buttonContent] - Optional button content HTML
     * @return {void}
     */
    add(text, handler, classList = '', buttonContent = '') {
        const cell = document.createElement('div');
        cell.className = 'bp-controls-cell';

        const button = document.createElement('button');
        button.setAttribute('aria-label', text);
        button.setAttribute('title', text);
        button.className = `${CONTROLS_BUTTON_CLASS} ${classList}`;
        button.addEventListener('click', handler);

        if (buttonContent) {
            button.innerHTML = buttonContent;
        }

        cell.appendChild(button);
        this.controlsEl.appendChild(cell);

        // Maintain a reference for cleanup
        this.buttonRefs.push({
            button,
            handler
        });

        return button;
    }

    /**
     * Enables the controls.
     *
     * @return {void}
     */
    enable() {
        this.controlsEl.classList.remove(CLASS_HIDDEN);
    }

    /**
     * Disables the controls.
     *
     * @return {void}
     */
    disable() {
        this.controlsEl.classList.add(CLASS_HIDDEN);
    }

    /**
     * Determines if the page number input is focused.
     *
     * @return {boolean} Is the input focused
     */
    isPageNumFocused() {
        return document.activeElement.classList.contains(CONTROLS_PAGE_NUM_INPUT_CLASS);
    }
}

export default Controls;
