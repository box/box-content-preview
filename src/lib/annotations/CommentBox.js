import EventEmitter from 'events';
import * as constants from './annotationConstants';
import { hideElement, showElement } from './annotatorUtil';

class CommentBox extends EventEmitter {
    /**
     * Text displayed in the Cancel button element.
     *
     * @property {string}
     */
    cancelText;

    /**
     * Text displayed in the Post button element.
     *
     * @property {string}
     */
    postText;

    /**
     * Placeholder text displayed in the text area element.
     *
     * @property {string}
     */
    placeholderText;

    /**
     * Reference to the comment box element. Contains buttons and text area.
     *
     * @property {HTMLElement}
     */
    containerEl;

    /**
     * Reference to the cancel button element in the comment box.
     *
     * @property {HTMLElement}
     */
    cancelEl;

    /**
     * Reference to the post button element in the comment box.
     *
     * @property {HTMLElement}
     */
    postEl;

    /**
     * Reference to the text area element in the comment box.
     *
     * @property {HTMLElement}
     */
    textAreaEl;

    /**
     * Reference to parent element that the comment box should be nested inside.
     *
     * @property {HTMLElement}
     */
    parentEl;

    /** Whether or not we should use touch events */
    hasTouch;

    /* Events that the comment box can emit. */
    static CommentEvents = {
        cancel: 'comment_cancel',
        post: 'comment_post'
    };

    /**
     * Creates an element for text entry, submission and cancellation.
     *
     * @param {HTMLElement} parentEl - Parent element
     * @param {Object} [config] - Object containing text values to be displayed to the user.
     * @param {Object} config.localized - Translated strings for UI
     */
    constructor(parentEl, config = {}) {
        super();

        this.parentEl = parentEl;

        this.hasTouch = config.hasTouch;
        this.cancelText = config.localized.cancelButton;
        this.postText = config.localized.postButton;
        this.placeholderText = config.localized.addCommentPlaceholder;

        // Explicit scope binding for event listeners
        this.onCancel = this.onCancel.bind(this);
        this.onPost = this.onPost.bind(this);
    }

    /**
     * Focus on the text box.
     *
     * @return {void}
     */
    focus() {
        if (this.textAreaEl) {
            this.textAreaEl.focus();
        }
    }

    /**
     * Unfocus the text box.
     *
     * @return {void}
     */
    blur() {
        if (document.activeElement) {
            document.activeElement.blur();
        }
    }

    /**
     * Clear out the text box.
     *
     * @return {void}
     */
    clear() {
        if (this.textAreaEl) {
            this.textAreaEl.value = '';
        }
    }

    /**
     * Hide the element.
     *
     * @return {void}
     */
    hide() {
        if (this.containerEl) {
            hideElement(this.containerEl);
        }
    }

    /**
     * Show the element.
     *
     * @return {void}
     */
    show() {
        if (!this.containerEl) {
            this.containerEl = this.createCommentBox();
            this.parentEl.appendChild(this.containerEl);
        }

        showElement(this.containerEl);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (!this.containerEl) {
            return;
        }

        this.containerEl.remove();
        this.parentEl = null;
        this.containerEl = null;
        this.cancelEl.removeEventListener('click', this.onCancel);
        this.postEl.removeEventListener('click', this.onPost);
        if (this.hasTouch) {
            this.cancelEl.removeEventListener('touchstart', this.onCancel);
            this.postEl.removeEventListener('touchstart', this.onPost);
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Create HTML containing the UI for the comment box.
     *
     * @private
     * @return {HTMLElement} HTML containing UI for the comment box.
     */
    createHTML() {
        const containerEl = document.createElement('section');
        containerEl.classList.add('bp-create-highlight-comment');
        containerEl.innerHTML = `
            <textarea class="${constants.CLASS_TEXTAREA} ${constants.CLASS_ANNOTATION_TEXTAREA} ${constants.CLASS_ACTIVE}"
                placeholder="${this.placeholderText}"></textarea>
            <div class="${constants.CLASS_BUTTON_CONTAINER}">
                <button class="bp-btn ${constants.CLASS_ANNOTATION_BUTTON_CANCEL}">
                    ${this.cancelText}
                </button>
                <button class="bp-btn bp-btn-primary ${constants.CLASS_ANNOTATION_BUTTON_POST}">
                    ${this.postText}
                </button>
            </div>`.trim();

        return containerEl;
    }

    /**
     * Stop default behaviour of an element.
     *
     * @param {Event} event Event created by an input event.
     * @return {void}
     */
    preventDefaultAndPropagation(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    /**
     * Clear the current text in the textarea element and notify listeners.
     *
     * @private
     * @param {Event} event Event created by input event
     * @return {void}
     */
    onCancel(event) {
        // stops touch propogating to a click event
        this.preventDefaultAndPropagation(event);
        this.clear();
        this.emit(CommentBox.CommentEvents.cancel);
    }

    /**
     * Notify listeners of submit event and then clear textarea element.
     *
     * @private
     * @param {Event} event Event created by input event
     * @return {void}
     */
    onPost(event) {
        // stops touch propogating to a click event
        this.preventDefaultAndPropagation(event);
        this.emit(CommentBox.CommentEvents.post, this.textAreaEl.value);
        this.clear();
    }

    /**
     * Create HTML for the comment box. Assigns references to elements, attach event listeners.
     * ie) Post button, cancel button
     *
     * @private
     * @return {HTMLElement} The HTML to append to this.parentElement
     */
    createCommentBox() {
        const containerEl = this.createHTML();

        // Reference HTML
        this.textAreaEl = containerEl.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
        this.cancelEl = containerEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_CANCEL);
        this.postEl = containerEl.querySelector(constants.SELECTOR_ANNOTATION_BUTTON_POST);

        // Add event listeners
        this.cancelEl.addEventListener('click', this.onCancel);
        this.postEl.addEventListener('click', this.onPost);
        if (this.hasTouch) {
            containerEl.addEventListener('touchend', this.preventDefaultAndPropagation.bind(this));
            this.cancelEl.addEventListener('touchend', this.onCancel);
            this.postEl.addEventListener('touchend', this.onPost);
        }

        return containerEl;
    }
}

export default CommentBox;
