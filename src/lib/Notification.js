import autobind from 'autobind-decorator';
import { CLASS_HIDDEN } from './constants';

const HIDE_TIMEOUT_MS = 5000; // 5s

@autobind class Notification {
    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl - Container element
     * @return {Notification} Notification
     */
    constructor(containerEl) {
        const uniqueLabel = `notification_${new Date().getTime()}_label`;

        this.notificationEl = document.createElement('div');
        this.notificationEl.className = 'bp-notification bp-is-hidden';
        this.notificationEl.addEventListener('click', this.clickHandler);

        // ARIA for accessibility
        this.notificationEl.setAttribute('role', 'alert');
        this.notificationEl.setAttribute('aria-labeledby', uniqueLabel);

        this.notificationEl.innerHTML = `
            <span id="${uniqueLabel}"></span>
            <button class="close-btn">${__('notification_button_default_text')}</button>
        `.trim();

        // Save references to message and button
        this.messageEl = this.notificationEl.querySelector(`#${uniqueLabel}`);
        this.buttonEl = this.notificationEl.querySelector('button');

        // Append and position notification
        const notificationWrapperEl = document.createElement('div');
        notificationWrapperEl.className = 'bp-notifications-wrapper';
        notificationWrapperEl.appendChild(this.notificationEl);
        containerEl.appendChild(notificationWrapperEl);
    }

    /**
     * Shows a notification message.
     *
     * @param {string} message - Notification message
     * @param {string} [buttonText] - Optional text to show in button
     * @return {void}
     */
    show(message, buttonText) {
        this.messageEl.textContent = message;

        if (buttonText) {
            this.buttonEl.textContent = buttonText;
        } else {
            this.buttonEl.textContent = __('notification_button_default_text');
        }

        this.notificationEl.classList.remove(CLASS_HIDDEN);
        this.notificationEl.focus();

        // Hide notification automatically after a delay
        this.timeout = setTimeout(this.hide.bind(this), HIDE_TIMEOUT_MS);
    }

    /**
     * Hides the notification message. Does nothing if the notification is already hidden.
     *
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
     * @param {Event} event - DOM event
     * @return {void}
     */
    clickHandler = (event) => {
        event.stopPropagation();

        if (event.target === this.buttonEl) {
            this.hide();
        }
    };
}

export default Notification;
