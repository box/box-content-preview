import EventEmitter from 'events';
import { CLASS_ACTIVE } from '../constants';
import { hideElement, showElement } from './annotatorUtil';

// Display Text
const TEXT_ANNOTATION_CANCEL = __('annotation_cancel');
const TEXT_ANNOTATION_POST = __('annotation_post');
const TEXT_ADD_COMMENT_PLACEHOLDER = __('annotation_add_comment_placeholder');

class CommentBox extends EventEmitter {
    /**
     * Text displayed in the Cancel button element.
     * 
     * @property {string}
     */
    cancelText = TEXT_ANNOTATION_CANCEL;

    /**
     * Text displayed in the Post button element.
     * 
     * @property {string}
     */
    postText = TEXT_ANNOTATION_POST;

    /**
     * Placeholder text displayed in the text area element.
     * 
     * @property {string}
     */
    placeholderText = TEXT_ADD_COMMENT_PLACEHOLDER;

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

    /* Events that the comment box can emit. */
    static CommentEvents = {
        cancel: 'comment_cancel',
        post: 'comment_post'
    };

    /**
     * Creates an element for text entry, submission and cancellation.
     *
     * @param {Object} [config] - Object containing text values to be displayed to the user.
     * config.cancel - Text displayed in the "Cancel" button
     * config.post - Text displayed in the "Post" button
     * config.placeholder - Placeholder text displayed in the text area
     */
    constructor(parentEl, config = {}) {
        super();

        this.parentEl = parentEl;

        this.cancelText = config.cancel || this.cancelText;
        this.postText = config.post || this.postText;
        this.placeholderText = config.placeholder || this.placeholderText;

        // Explicit scope binding for event listeners
        this.onCancel = this.onCancel.bind(this);
        this.onPost = this.onPost.bind(this);
    }

    /**
     * Focus on the text box.
     * 
     * @public
     * @return {void}
     */
    focus() {
        if (!this.containerEl) {
            return;
        }

        this.textAreaEl.focus();
    }

    /**
     * Clear out the text box.
     * 
     * @public
     * @return {void}
     */
    clear() {
        if (!this.containerEl) {
            return;
        }

        this.textAreaEl.value = '';
    }

    /**
     * Hide the element.
     *
     * @public
     * @return {void}
     */
    hide() {
        if (!this.containerEl) {
            return;
        }

        hideElement(this.containerEl);
    }

    /**
     * Show the element.
     *
     * @public
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
     * Destructor
     *
     * @public
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
            <textarea class="bp-textarea annotation-textarea ${CLASS_ACTIVE}"
                placeholder="${this.placeholderText}"></textarea>
            <div class="button-container">
                <button class="bp-btn cancel-annotation-btn">
                    ${this.cancelText}
                </button>
                <button class="bp-btn bp-btn-primary post-annotation-btn">
                    ${this.postText}
                </button>
            </div>`.trim();

        return containerEl;
    }

    /**
     * Clear the current text in the textarea element and notify listeners.
     * 
     * @private
     * @return {void}
     */
    onCancel() {
        this.clear();
        this.emit(CommentBox.CommentEvents.cancel);
    }

    /**
     * Notify listeners of submit event and then clear textarea element.
     * 
     * @private
     * @return {void}
     */
    onPost() {
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
        this.textAreaEl = containerEl.querySelector('.annotation-textarea');
        this.cancelEl = containerEl.querySelector('.cancel-annotation-btn');
        this.postEl = containerEl.querySelector('.post-annotation-btn');

        // Add event listeners
        this.cancelEl.addEventListener('click', this.onCancel);
        this.postEl.addEventListener('click', this.onPost);

        return containerEl;
    }
}

export default CommentBox;
