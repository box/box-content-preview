import { CLASS_HIDDEN, CLASS_BOX_PREVIEW_NOTIFICATION, CLASS_BOX_PREVIEW_NOTIFICATION_WRAPPER } from './constants';
import { ICON_CLOSE } from './icons';

const HIDE_TIMEOUT_MS = 5000; // 5s

class Notification {
    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl - Container element
     * @return {Notification} Notification
     */
    constructor(containerEl) {
        const uniqueLabel = `notification_${new Date().getTime()}_label`;

        this.notificationEl = document.createElement('div');
        this.notificationEl.classList.add(CLASS_BOX_PREVIEW_NOTIFICATION);
        this.notificationEl.classList.add(CLASS_HIDDEN);
        this.notificationEl.addEventListener('click', this.clickHandler);

        // ARIA for accessibility
        this.notificationEl.setAttribute('role', 'alert');
        this.notificationEl.setAttribute('aria-labeledby', uniqueLabel);

        this.notificationEl.innerHTML = `
            <span id="${uniqueLabel}"></span>
            <button class="close-btn" type="button">${ICON_CLOSE}</button>
        `.trim();

        // Save references to message and button
        this.messageEl = this.notificationEl.querySelector(`#${uniqueLabel}`);
        this.buttonEl = this.notificationEl.querySelector('button');

        // Append and position notification
        const notificationWrapperEl = document.createElement('div');
        notificationWrapperEl.classList.add(CLASS_BOX_PREVIEW_NOTIFICATION_WRAPPER);
        notificationWrapperEl.appendChild(this.notificationEl);
        containerEl.appendChild(notificationWrapperEl);
    }

    /**
     * Shows a notification message.
     *
     * @public
     * @param {string} message - Notification message
     * @param {string} [buttonText] - Optional text to show in button
     * @param {boolean} persist - Should the notification show until dismissal or respect the timeout
     * @return {void}
     */
    show(message, buttonText, persist = false) {
        this.messageEl.textContent = message;

        if (buttonText) {
            this.buttonEl.textContent = buttonText;
            this.buttonEl.classList.remove('default-close-btn');
            this.buttonEl.removeAttribute('aria-label');
        } else {
            this.buttonEl.innerHTML = ICON_CLOSE;
            this.buttonEl.classList.add('default-close-btn');
            this.buttonEl.setAttribute('aria-label', __('notification_button_default_label'));
        }

        this.notificationEl.classList.remove(CLASS_HIDDEN);
        this.notificationEl.focus();

        // Hide notification automatically after a delay
        this.timeout = persist ? null : setTimeout(this.hide.bind(this), HIDE_TIMEOUT_MS);
    }

    /**
     * Hides the notification message. Does nothing if the notification is already hidden.
     *
     * @public
     * @return {void}
     */
    hide() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        if (this.notificationEl) {
            this.notificationEl.classList.add(CLASS_HIDDEN);
        }
    }

    /**
     * Click handler for notification.
     *
     * @private
     * @param {Event} event - DOM event
     * @return {void}
     */
    clickHandler = event => {
        event.stopPropagation();

        if (event.target === this.buttonEl) {
            this.hide();
        }
    };
}

export default Notification;
