import { CLASS_HIDDEN } from './constants';
import {
    ICON_CLOSE
} from './icons/icons';
import {
    decodeKeydown
} from './util';

class Popup {

    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl - Container element
     * @return {Popup} Popup
     */
    constructor(containerEl) {
        this.containerEl = containerEl;
        const uniqueLabel = `popup_${(new Date()).getTime()}_label`;

        this.popupEl = document.createElement('div');
        this.popupEl.className = 'bp-modal-dialog bp-is-hidden';

        // ARIA for accessibility
        this.popupEl.setAttribute('role', 'alert');
        this.popupEl.setAttribute('aria-labeledby', uniqueLabel);

        this.popupEl.innerHTML = `
            <div class='bp-modal-header'>
                <button class='bp-modal-close-button'>
                    ${ICON_CLOSE}
                </button>
            </div>
            <div class='bp-modal-content'>
                <p class='bp-modal-message' id=${uniqueLabel}></p>
                <div class='bp-modal-actions'>
                    <button class='bp-btn bp-btn-primary bp-popup-btn'> </button>
                </div>
            </div>
            <div class='bp-modal-backdrop'> </div>
        `.trim();

        // Save references to message, buttons, content, and backdrop
        this.messageEl = this.popupEl.querySelector(`#${uniqueLabel}`);
        this.buttonEl = this.popupEl.querySelector('button.bp-popup-btn');
        this.closeButtonEl = this.popupEl.querySelector('button.bp-modal-close-button');
        this.contentEl = this.popupEl.querySelector('div.bp-modal-content');
        this.backdropEl = this.popupEl.querySelector('div.bp-modal-backdrop');
        this.buttonDisabled = false;

        this.popupEl.addEventListener('click', this.popupClickHandler);
        document.addEventListener('keydown', this.keydownHandler);

        // Append and position popup
        const popupWrapperEl = document.createElement('div');
        popupWrapperEl.className = 'bp-popup-modal';
        popupWrapperEl.appendChild(this.popupEl);
        containerEl.appendChild(popupWrapperEl);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (!this.popupEl) {
            return;
        }

        this.popupEl.removeEventListener('click', this.popupClickHandler);
        document.removeEventListener('keydown', this.keydownHandler);

        const popupWrapperEl = this.popupEl.parentNode;
        popupWrapperEl.parentNode.removeChild(popupWrapperEl);
        this.popupEl = null;
    }

    /**
     * Shows a popup with a message.
     *
     * @param {string} message - Popup message
     * @param {string} buttonText - Button text
     * @param {function} [buttonHandler] - Optional onclick function for the button
     * @param {string} [buttonText] - Optional text to show in button
     * @return {void}
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
     * @return {void}
     */
    hide() {
        this.popupEl.classList.add(CLASS_HIDDEN);
    }

    /**
     * Adds custom content to the modal.
     *
     * @param {string} element - DOM element
     * @param {boolean} prepend - prepends or appends the content to the content element
     *
     * @return {void}
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
     * @return {boolean} Whether or not popup is visible.
     */
    isVisible() {
        return !this.popupEl.classList.contains(CLASS_HIDDEN);
    }

    /**
     * Gets whether or not the button is disabled.
     *
     * @return {boolean} Whether or not button is diabled
     */
    isButtonDisabled() {
        return this.buttonDisabled;
    }

    /**
     * Disbles the button element.
     *
     * @return {void}
     */
    disableButton() {
        this.buttonDisabled = true;
        this.buttonEl.classList.add('is-disabled');
    }

    /**
     * Enables the button element.
     *
     * @return {void}
     */
    enableButton() {
        this.buttonDisabled = false;
        this.buttonEl.classList.remove('is-disabled');
    }

    /**
     * Click handler for popup.
     *
     * @param {Event} event - DOM event
     * @return {void}
     */
    popupClickHandler = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (event.target === this.closeButtonEl || event.target === this.backdropEl) {
            this.hide();
        } else if (event.target === this.buttonEl && !this.isButtonDisabled()) {
            if (typeof this.buttonEl.handler === 'function') {
                this.buttonEl.handler();
            } else {
                this.hide();
            }
        }
    }

    /**
     * Keydown handler for popup
     *
     * @param {string} key - Keydown key
     * @return {boolean} Consumed or not
     */
    keydownHandler = (event) => {
        const key = decodeKeydown(event);
        switch (key) {
            case 'Esc':
            case 'Escape':
                this.hide();
                break;
            default:
                return false;
        }
        return true;
    }
}

export default Popup;
