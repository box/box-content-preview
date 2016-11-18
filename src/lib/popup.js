/**
 * @fileoverview Manages modal popups
 * @author jpress
 */

import autobind from 'autobind-decorator';
import { CLASS_HIDDEN } from './constants';
import {
    ICON_CLOSE
} from './icons/icons';

@autobind
class Popup {

    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl Container element
     * @returns {Popup} Popup
     */
    constructor(containerEl) {
        this.containerEl = containerEl;
        const uniqueLabel = `popup_${(new Date()).getTime()}_label`;

        this.popupEl = document.createElement('div');
        this.popupEl.className = 'box-preview-modal-dialog box-preview-is-hidden';

        // ARIA for accessibility
        this.popupEl.setAttribute('role', 'alert');
        this.popupEl.setAttribute('aria-labeledby', uniqueLabel);

        this.popupEl.innerHTML = `
            <div class='box-preview-modal-header'>
                <button class='box-preview-modal-close-button'>
                    ${ICON_CLOSE}
                </button>
            </div>
            <div class='box-preview-modal-content'>
                <p class='box-preview-modal-message' id=${uniqueLabel}></p>
                <div class='box-preview-modal-actions'>
                    <button class='box-preview-btn box-preview-btn-primary box-preview-popup-btn'> </button>
                </div>
            </div>
            <div class='box-preview-modal-backdrop'> </div>
        `.trim();

        // Save references to message, buttons, content, and backdrop
        this.messageEl = this.popupEl.querySelector(`#${uniqueLabel}`);
        this.buttonEl = this.popupEl.querySelector('button.box-preview-popup-btn');
        this.closeButtonEl = this.popupEl.querySelector('button.box-preview-modal-close-button');
        this.contentEl = this.popupEl.querySelector('div.box-preview-modal-content');
        this.backdropEl = this.popupEl.querySelector('div.box-preview-modal-backdrop');
        this.buttonDisabled = false;

        this.popupEl.addEventListener('click', this.popupClickHandler);

        // Append and position popup
        const popupWrapperEl = document.createElement('div');
        popupWrapperEl.className = 'box-preview-popup-modal';
        popupWrapperEl.appendChild(this.popupEl);
        containerEl.appendChild(popupWrapperEl);
    }

    /**
     * Shows a popup with a message.
     *
     * @param {string} message Popup message
     * @param {string} buttonText Button text
     * @param {function} [buttonHandler] Optional onclick function for the button
     * @param {string} [buttonText] Optional text to show in button
     * @returns {void}
     */
    show(message, buttonText, buttonHandler) {
        this.messageEl.textContent = message;

        if (buttonText) {
            this.buttonEl.textContent = buttonText;
        } else {
            this.buttonEl.textContent = __('notification_button_default_text');
        }

        if (buttonHandler && typeof buttonHandler === 'function') {
            this.buttonEl.handler = buttonHandler;
        }

        this.popupEl.classList.remove(CLASS_HIDDEN);
        this.popupEl.focus();
    }

    /**
     * Hides the popup message.
     *
     * @returns {void}
     */
    hide() {
        this.popupEl.classList.add(CLASS_HIDDEN);
    }

    /**
     * Adds custom content to the modal.
     *
     * @param {string} element DOM element
     * @param {boolean} prepend prepends or appends the content to the content element
     *
     * @returns {void}
     */
    addContent(element, prepend) {
        const contentEl = this.contentEl;
        if (prepend) {
            contentEl.insertBefore(element, contentEl.firstChild);
        } else {
            contentEl.appendChild(element);
        }
    }

    /**
     * Returns whether or not the popup is visible.
     *
     * @returns {boolean} Whether or not popup is visible.
     */
    isVisible() {
        return !this.popupEl.classList.contains(CLASS_HIDDEN);
    }

    /**
     * Gets whether or not the button is disabled.
     *
     * @returns {boolean} Whether or not button is diabled
     */
    isButtonDisabled() {
        return this.buttonDisabled;
    }

    /**
     * Disbles the button element.
     *
     * @returns {void}
     */
    disableButton() {
        this.buttonDisabled = true;
        this.buttonEl.classList.add('is-disabled');
    }

    /**
     * Enables the button element.
     *
     * @returns {void}
     */
    enableButton() {
        this.buttonDisabled = false;
        this.buttonEl.classList.remove('is-disabled');
    }

    /**
     * Click handler for popup.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    popupClickHandler(event) {
        event.preventDefault();
        event.stopPropagation();

        if (event.target === this.closeButtonEl || event.target === this.backdropEl) {
            this.hide();
        } else if (event.target === this.buttonEl) {
            if (typeof this.buttonEl.handler === 'function') {
                this.buttonEl.handler();
            } else {
                this.hide();
            }
        }
    }
}

export default Popup;
