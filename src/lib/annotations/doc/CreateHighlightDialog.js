import EventEmitter from 'events';
import { ICON_HIGHLIGHT, ICON_HIGHLIGHT_COMMENT } from '../../icons/icons';
import CommentBox from '../CommentBox';
import { hideElement, showElement } from '../annotatorUtil';
import * as constants from '../annotationConstants';

const CLASS_CREATE_DIALOG = 'bp-create-annotation-dialog';
const TITLE_HIGHLIGHT_TOGGLE = __('annotation_highlight_toggle');
const TITLE_HIGHLIGHT_COMMENT = __('annotation_highlight_comment');
const DATA_TYPE_HIGHLIGHT = 'highlight-btn';
const DATA_TYPE_ADD_HIGHLIGHT_COMMENT = 'add-highlight-comment-btn';
const CREATE_HIGHLIGHT_DIALOG_TEMPLATE = `
    <div class="${constants.CLASS_ANNOTATION_CARET}" style="left: 50%;"></div>
    <div>
        <div class="${constants.CLASS_ANNOTATION_HIGHLIGHT_DIALOG}">
            <span class="${constants.CLASS_HIGHLIGHT_BTNS}">
                <button class="bp-btn-plain ${constants.CLASS_ADD_HIGHLIGHT_BTN}"
                    data-type="${DATA_TYPE_HIGHLIGHT}""
                    title="${TITLE_HIGHLIGHT_TOGGLE}">
                    ${ICON_HIGHLIGHT}
                </button>
                <button class="bp-btn-plain ${constants.CLASS_ADD_HIGHLIGHT_COMMENT_BTN}"
                    data-type="${DATA_TYPE_ADD_HIGHLIGHT_COMMENT}""
                    title="${TITLE_HIGHLIGHT_COMMENT}">
                    ${ICON_HIGHLIGHT_COMMENT}
                </button>
            </span>
        </div>
    </div>`.trim();

/**
 * Events emitted by this component.
 */
export const CreateEvents = {
    plain: 'plain_highlight_create',
    comment: 'comment_highlight_edit',
    commentPost: 'comment_highlight_post'
};

class CreateHighlightDialog extends EventEmitter {
    /**
     * Container element for the dialog.
     *
     * @property {HTMLElement}
     */
    containerEl;

    /**
     * The clickable element for creating plain highlights.
     *
     * @property {HTMLElement}
     */
    highlightCreateEl;

    /**
     * The clickable element got creating comment highlights.
     *
     * @property {HTMLElement}
     */
    commentCreateEl;

    /**
     * The parent container to nest the dialog element in.
     *
     * @property {HTMLElement}
     */
    parentEl;

    /**
     * The element containing the buttons that can creaet highlights.
     *
     * @property {HTMLElement}
     */
    buttonsEl;

    /**
     * The comment box instance. Contains area for text input and post/cancel buttons.
     *
     * @property {CommentBox}
     */
    commentBox;

    /**
     * Position, on the DOM, to align the dialog to the end of a highlight.
     *
     * @property {Object}
     */
    position = {
        x: 0,
        y: 0
    };

    /**
     * A dialog used to create plain and comment highlights.
     *
     * [constructor]
     *
     * @param {HTMLElement} parentEl - Parent element
     * @return {CreateHighlightDialog} CreateHighlightDialog instance
     */
    constructor(parentEl) {
        super();

        this.parentEl = parentEl;

        // Explicit scope binding for event listeners
        this.onHighlightClick = this.onHighlightClick.bind(this);
        this.onCommentClick = this.onCommentClick.bind(this);
        this.onCommentPost = this.onCommentPost.bind(this);
        this.onCommentCancel = this.onCommentCancel.bind(this);
    }

    /**
     * Set the parent container to next this dialog in.
     *
     * @public
     * @param {HTMLElement} newParentEl - The element that will contain this.
     * @return {void}
     */
    setParentEl(newParentEl) {
        this.parentEl = newParentEl;
    }

    /**
     * Set the coordinates to position the dialog at, and force an update.
     *
     * @public
     * @param {number} x - The x coordinate to position the dialog at
     * @param {number} y - The y coordinate to position the dialog at
     * @return {void}
     */
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        this.updatePosition();
    }

    /**
     * Show the dialog. Adds to the parent container if it isn't already there.
     *
     * @public
     * @param {HTMLElement} [newParentEl] - The new parent container to nest this in.
     * @return {void}
     */
    show(newParentEl) {
        if (!this.containerEl) {
            this.containerEl = this.createElement();
        }

        // Move to the correct parent element
        if (newParentEl) {
            this.setParentEl(newParentEl);
        }

        // Add to parent if it hasn't been added already
        if (!this.parentEl.querySelector(`.${CLASS_CREATE_DIALOG}`)) {
            this.parentEl.appendChild(this.containerEl);
        }

        this.setButtonVisibility(true);
        showElement(this.containerEl);
    }

    /**
     * Hide the dialog, and clear out the comment box text entry.
     *
     * @return {void}
     */
    hide() {
        if (!this.containerEl) {
            return;
        }

        hideElement(this.containerEl);
        this.commentBox.hide();
        this.commentBox.clear();
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

        this.hide();

        // Stop interacting with this element from triggering outside actions
        this.containerEl.removeEventListener('click', this.stopPropagation);
        this.containerEl.removeEventListener('mouseup', this.stopPropagation);
        this.containerEl.removeEventListener('touchend', this.stopPropagation);
        this.containerEl.removeEventListener('dblclick', this.stopPropagation);

        // Event listeners
        this.highlightCreateEl.removeEventListener('click', this.onHighlightClick);
        this.commentCreateEl.removeEventListener('click', this.onCommentClick);
        this.commentBox.removeListener(CommentBox.CommentEvents.post, this.onCommentPost);
        this.commentBox.removeListener(CommentBox.CommentEvents.cancel, this.onCommentCancel);

        this.containerEl.remove();
        this.containerEl = null;
        this.parentEl = null;

        this.commentBox.destroy();
        this.commentBox = null;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Update the position styling for the dialog so that the chevron points to
     * the desired location.
     *
     * @return {void}
     */
    updatePosition() {
        // Plus 1 pixel for caret
        this.containerEl.style.left = `${this.position.x - 1 - this.containerEl.clientWidth / 2}px`;
        // Plus 5 pixels for caret
        this.containerEl.style.top = `${this.position.y + 5}px`;
    }

    /**
     * Fire an event notifying that the plain highlight button has been clicked.
     *
     * @return {void}
     */
    onHighlightClick() {
        this.emit(CreateEvents.plain);
    }

    /**
     * Fire an event notifying that the comment button has been clicked. Also
     * show the comment box, and give focus to the text area conatined by it.
     *
     * @return {void}
     */
    onCommentClick() {
        this.emit(CreateEvents.comment);

        this.commentBox.show();
        this.commentBox.focus();
        this.setButtonVisibility(false);
        this.updatePosition();
    }

    /**
     * Fire an event notifying that the post button has been pressed. Clears
     * out the comment box.
     *
     * @param {string} text - Text entered into the comment box
     * @return {void}
     */
    onCommentPost(text) {
        this.emit(CreateEvents.commentPost, text);
        this.commentBox.clear();
    }

    /**
     * The cancel button has been pressed. Close the comment box, and return to
     * default state.
     *
     * @return {void}
     */
    onCommentCancel() {
        this.commentBox.hide();
        this.setButtonVisibility(true);
        this.updatePosition();
    }

    /**
     * Hide or show the plain and comment buttons, in the dialog.
     *
     * @param {boolean} visible - If true, shows the plain and comment buttons
     * @return {void}
     */
    setButtonVisibility(visible) {
        if (visible) {
            showElement(this.buttonsEl);
        } else {
            hideElement(this.buttonsEl);
        }
    }

    /**
     * Stop the dialog from propagating events to parent container. Pairs with
     * giving focus to the text area in the comment box and clicking "Post".
     *
     * @param {Event} event - The DOM event coming from interacting with the element.
     * @return {void}
     */
    stopPropagation(event) {
        event.stopPropagation();
    }

    /**
     * Create the element containing highlight create and comment buttons, and comment box.
     *
     * @private
     * @return {HTMLElement} The element containing Highlight creation UI
     */
    createElement() {
        const highlightDialogEl = document.createElement('div');
        highlightDialogEl.classList.add(CLASS_CREATE_DIALOG);
        highlightDialogEl.innerHTML = CREATE_HIGHLIGHT_DIALOG_TEMPLATE;

        const containerEl = highlightDialogEl.querySelector(constants.SELECTOR_ANNOTATION_HIGHLIGHT_DIALOG);

        // Reference HTML
        this.highlightCreateEl = containerEl.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
        this.commentCreateEl = containerEl.querySelector(`.${constants.CLASS_ADD_HIGHLIGHT_COMMENT_BTN}`);
        this.buttonsEl = containerEl.querySelector(constants.SELECTOR_HIGHLIGHT_BTNS);

        // Create comment box
        this.commentBox = new CommentBox(containerEl);

        // Stop interacting with this element from triggering outside actions
        highlightDialogEl.addEventListener('click', this.stopPropagation);
        highlightDialogEl.addEventListener('mouseup', this.stopPropagation);
        highlightDialogEl.addEventListener('touchend', this.stopPropagation);
        highlightDialogEl.addEventListener('dblclick', this.stopPropagation);

        // Event listeners
        this.highlightCreateEl.addEventListener('click', this.onHighlightClick);
        this.commentCreateEl.addEventListener('click', this.onCommentClick);
        this.commentBox.addListener(CommentBox.CommentEvents.post, this.onCommentPost);
        this.commentBox.addListener(CommentBox.CommentEvents.cancel, this.onCommentCancel);

        // Hide comment box, by default
        this.commentBox.hide();

        return highlightDialogEl;
    }
}

export default CreateHighlightDialog;
