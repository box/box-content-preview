import autobind from 'autobind-decorator';
import throttle from 'lodash.throttle';

import { CLASS_HIDDEN } from './constants';

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 1500;

@autobind
class Controls {

    /**
     * [constructor]
     *
     * @param {HTMLElement} container The container
     * @returns {Controls} Instance of controls
     */
    constructor(container) {
        // Maintain a list of buttons for cleanup
        this.buttonRefs = [];

        // Container for the buttons
        this.containerEl = container;

        this.controlsWrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.controlsWrapperEl.className = 'box-preview-controls-wrapper';

        this.controlsEl = this.controlsWrapperEl.appendChild(document.createElement('div'));
        this.controlsEl.className = 'box-preview-controls';

        this.mousemoveHandler = throttle(() => {
            this.containerEl.classList.add(SHOW_PREVIEW_CONTROLS_CLASS);
            this.resetTimeout();
        }, CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS - 500);

        this.containerEl.addEventListener('mousemove', this.mousemoveHandler);
        this.controlsEl.addEventListener('mouseenter', this.mouseenterHandler);
        this.controlsEl.addEventListener('mouseleave', this.mouseleaveHandler);
        this.controlsEl.addEventListener('focusin', this.focusinHandler);
        this.controlsEl.addEventListener('focusout', this.focusoutHandler);
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        this.containerEl.removeEventListener('mousemove', this.mousemoveHandler);
        this.controlsEl.removeEventListener('mouseenter', this.mouseenterHandler);
        this.controlsEl.removeEventListener('mouseleave', this.mouseleaveHandler);
        this.controlsEl.removeEventListener('focusin', this.focusinHandler);
        this.controlsEl.removeEventListener('focusout', this.focusoutHandler);

        this.buttonRefs.forEach((ref) => {
            ref.button.removeEventListener('click', ref.handler);
        });
    }

    /**
     * Checks if the button is a preview controls button
     *
     * @private
     * @param {HTMLElement|null} element button element
     * @returns {Boolean} true if element is a preview control button
     */
    isPreviewControlButton(element) {
        return !!element && element.classList.contains('box-preview-controls-btn');
    }

    /**
     * @private
     * @returns {void}
     */
    resetTimeout() {
        clearTimeout(this.controlDisplayTimeoutId);
        this.controlDisplayTimeoutId = setTimeout(() => {
            clearTimeout(this.controlDisplayTimeoutId);

            if (this.blockHiding) {
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
     * @private
     * @returns {void}
     */
    mouseenterHandler() {
        this.blockHiding = true;
    }

    /**
     * @private
     * @returns {void}
     */
    mouseleaveHandler() {
        this.blockHiding = false;
    }

    /**
     * Handles all focusin events for the module.
     * @param {Event} event A DOM-normalized event object.
     * @returns {void}
     */
    focusinHandler(event) {
        // When we focus onto a preview control button, show controls
        if (this.isPreviewControlButton(event.target)) {
            this.containerEl.classList.add(SHOW_PREVIEW_CONTROLS_CLASS);
        }
    }

    /**
     * Handles all focusout events for the module.
     * @param {Event} event A DOM-normalized event object.
     * @returns {void}
     */
    focusoutHandler(event) {
        // When we focus out of a control button and aren't focusing onto another control button, hide the controls
        if (this.isPreviewControlButton(event.target) && !this.isPreviewControlButton(event.relatedTarget)) {
            this.containerEl.classList.remove(SHOW_PREVIEW_CONTROLS_CLASS);
        }
    }

    /**
     * Adds buttons to controls
     *
     * @private
     * @param {String} text button text
     * @param {Function} handler button handler
     * @param {String} [classList] optional class list
     * @param {String} [buttonContent] Optional button content HTML
     * @returns {void}
     */
    add(text, handler, classList = '', buttonContent = '') {
        const cell = document.createElement('div');
        cell.className = 'box-preview-controls-cell';

        const button = document.createElement('button');
        button.setAttribute('aria-label', text);
        button.className = `box-preview-controls-btn ${classList}`;
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
     * @returns {void}
     */
    enable() {
        this.controlsEl.classList.remove(CLASS_HIDDEN);
    }

    /**
     * Disables the controls.
     *
     * @returns {void}
     */
    disable() {
        this.controlsEl.classList.add(CLASS_HIDDEN);
    }

}

export default Controls;
