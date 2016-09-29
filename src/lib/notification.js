/**
 * @fileoverview Manages notification popups
 * @author tjin
 */

import autobind from 'autobind-decorator';
import { CLASS_HIDDEN } from './constants';

const HIDE_TIMEOUT_MS = 5000; // 5s

@autobind
class Notification {

    /**
     * [constructor]
     *
     * @param {HTMLElement} containerEl Container element
     * @returns {Notification} Notification
     */
    constructor(containerEl) {
        const uniqueLabel = `notification_${(new Date()).getTime()}_label`;

        this.notificationEl = document.createElement('div');
        this.notificationEl.className = 'box-preview-notification box-preview-is-hidden';
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
        notificationWrapperEl.className = 'box-preview-notifications-wrapper';
        notificationWrapperEl.appendChild(this.notificationEl);
        containerEl.appendChild(notificationWrapperEl);
    }

    /**
     * Shows a notification message.
     *
     * @param {string} message Notification message
     * @param {string} [buttonText] Optional text to show in button
     * @returns {void}
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
        setTimeout(this.hide, HIDE_TIMEOUT_MS);
    }

    /**
     * Hides the notification message.
     *
     * @returns {void}
     */
    hide() {
        this.notificationEl.classList.add(CLASS_HIDDEN);
    }

    /**
     * Click handler for notification.
     *
     * @param {Event} event DOM event
     * @returns {void}
     */
    clickHandler(event) {
        event.stopPropagation();

        if (event.target === this.buttonEl) {
            this.hide();
        }
    }
}

export default Notification;
