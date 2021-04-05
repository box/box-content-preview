import { CLASS_HIDDEN } from './constants';
import { ICON_CLOSE } from './icons';
import { decodeKeydown } from './util';

class Popup {
    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl - Container element
     * @return {Popup} Popup
     */
    constructor(containerEl) {
        this.containerEl = containerEl;
        const uniqueLabel = `popup_${new Date().getTime()}_label`;

        this.popupEl = document.createElement('div');
        this.popupEl.className = 'bp-modal-dialog bp-is-hidden';

        // ARIA for accessibility
        this.popupEl.setAttribute('role', 'alert');
        this.popupEl.setAttribute('aria-labeledby', uniqueLabel);

        this.popupEl.innerHTML = `
            <div class="bp-modal-header">
                <button class="bp-modal-close-button" type="button">
                    ${ICON_CLOSE}
                </button>
            </div>
            <div class="bp-modal-content">
                <p class="bp-modal-message" id=${uniqueLabel}></p>
                <div class="bp-modal-actions">
                    <button class="bp-btn bp-btn-primary bp-popup-btn" type="button"> </button>
                </div>
            </div>
            <div class="bp-modal-backdrop"> </div>
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
     * @public
     * @param {string} message - Popup message
     * @param {string} [buttonText] - Optional text to show in button
     * @param {Function} [buttonHandler] - Optional onclick function for the button
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
     * @public
     * @return {void}
     */
    hide() {
        this.popupEl.classList.add(CLASS_HIDDEN);
    }

    /**
     * Adds custom content to the modal.
     *
     * @public
     * @param {string} element - DOM element
     * @param {boolean} prepend - prepends or appends the content to the content element
     *
     * @return {void}
     */
    addContent(element, prepend) {
        if (prepend) {
            this.contentEl.insertBefore(element, this.contentEl.firstChild);
        } else {
            this.contentEl.appendChild(element);
        }
    }

    /**
     * Returns whether or not the popup is visible.
     *
     * @public
     * @return {boolean} Whether or not popup is visible.
     */
    isVisible() {
        return !this.popupEl.classList.contains(CLASS_HIDDEN);
    }

    /**
     * Gets whether or not the button is disabled.
     *
     * @public
     * @return {boolean} Whether or not button is diabled
     */
    isButtonDisabled() {
        return this.buttonDisabled;
    }

    /**
     * Disbles the button element.
     *
     * @public
     * @return {void}
     */
    disableButton() {
        this.buttonDisabled = true;
        this.buttonEl.classList.add('is-disabled');
    }

    /**
     * Enables the button element.
     *
     * @public
     * @return {void}
     */
    enableButton() {
        this.buttonDisabled = false;
        this.buttonEl.classList.remove('is-disabled');
    }

    /**
     * Click handler for popup.
     *
     * @private
     * @param {Event} event - DOM event
     * @return {void}
     */
    popupClickHandler = event => {
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
    };

    /**
     * Keydown handler for popup
     *
     * @private
     * @param {Event} event - Keydown event
     * @return {boolean} Consumed or not
     */
    keydownHandler = event => {
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
    };
}

export default Popup;
