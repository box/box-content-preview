import EventEmitter from 'events';
import { ICON_HIGHLIGHT, ICON_HIGHLIGHT_COMMENT } from '../../icons/icons';
import CommentBox from '../CommentBox';
import { hideElement, showElement, generateBtn } from '../annotatorUtil';
import * as constants from '../annotationConstants';

const CLASS_CREATE_DIALOG = 'bp-create-annotation-dialog';
const DATA_TYPE_HIGHLIGHT = 'add-highlight-btn';
const DATA_TYPE_ADD_HIGHLIGHT_COMMENT = 'add-highlight-comment-btn';

/**
 * Events emitted by this component.
 * TODO(@spramod): Evaluate if these events need to be propogated to viewer
 */
export const CreateEvents = {
    init: 'init_highlight_create',
    plain: 'plain_highlight_create',
    comment: 'comment_highlight_edit',
    commentPost: 'comment_highlight_post'
};

class CreateHighlightDialog extends EventEmitter {
    /** @property {HTMLElement} - Container element for the dialog. */
    containerEl;

    /** @property {HTMLElement} - The clickable element for creating plain highlights. */
    highlightCreateEl;

    /** @property {HTMLElement} - The clickable element got creating comment highlights. */
    commentCreateEl;

    /** @property {HTMLElement} - The parent container to nest the dialog element in. */
    parentEl;

    /** @property {HTMLElement} - The element containing the buttons that can creaet highlights. */
    buttonsEl;

    /** @property {CommentBox} - The comment box instance. Contains area for text input and post/cancel buttons. */
    commentBox;

    /** @property {Object} - Position, on the DOM, to align the dialog to the end of a highlight. */
    position = {
        x: 0,
        y: 0
    };

    /** @property {boolean} - Whether or not we're on a mobile device. */
    isMobile;

    /** @property {boolean} - Whether or not we support touch. */
    hasTouch;

    /** @property {boolean} - Whether or not this is visible. */
    isVisible;

    /** @property {boolean} - Whether or not to allow plain highlight interaction. */
    allowHighlight;

    /** @property {boolean} - Whether or not to allow comment interactions. */
    allowComment;

    /** @property {Object} - Translated strings for dialog */
    localized;

    /**
     * A dialog used to create plain and comment highlights.
     *
     * [constructor]
     *
     * @param {HTMLElement} parentEl - Parent element
     * @param {Object} [config] - For configuring the dialog.
     * @param {boolean} [config.hasTouch] - True to add touch events.
     * @param {boolean} [config.isMobile] - True if on a mobile device.
     * @return {CreateHighlightDialog} CreateHighlightDialog instance
     */
    constructor(parentEl, config = {}) {
        super();

        this.parentEl = parentEl;
        this.isMobile = config.isMobile || false;
        this.hasTouch = config.hasTouch || false;
        this.allowHighlight = config.allowHighlight !== undefined ? !!config.allowHighlight : true;
        this.allowComment = config.allowComment !== undefined ? !!config.allowComment : true;
        this.localized = config.localized;

        // Explicit scope binding for event listeners
        if (this.allowHighlight) {
            this.onHighlightClick = this.onHighlightClick.bind(this);
        }

        if (this.allowComment) {
            this.onCommentClick = this.onCommentClick.bind(this);
            this.onCommentPost = this.onCommentPost.bind(this);
            this.onCommentCancel = this.onCommentCancel.bind(this);
        }
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
        this.isVisible = true;
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
        this.emit(CreateEvents.init);
    }

    /**
     * Hide the dialog, and clear out the comment box text entry.
     *
     * @return {void}
     */
    hide() {
        this.isVisible = false;
        if (!this.containerEl) {
            return;
        }

        hideElement(this.containerEl);

        if (this.commentBox) {
            this.commentBox.hide();
            this.commentBox.clear();
        }
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
        this.containerEl.removeEventListener('dblclick', this.stopPropagation);

        // Event listeners
        this.highlightCreateEl.removeEventListener('click', this.onHighlightClick);
        this.commentCreateEl.removeEventListener('click', this.onCommentClick);

        if (this.hasTouch) {
            this.highlightCreateEl.removeEventListener('touchstart', this.stopPropagation);
            this.commentCreateEl.removeEventListener('touchstart', this.stopPropagation);
            this.highlightCreateEl.removeEventListener('touchend', this.onHighlightClick);
            this.commentCreateEl.removeEventListener('touchend', this.onCommentClick);
            this.containerEl.removeEventListener('touchend', this.stopPropagation);
        }

        this.containerEl.remove();
        this.containerEl = null;
        this.parentEl = null;

        if (this.commentBox) {
            this.commentBox.removeListener(CommentBox.CommentEvents.post, this.onCommentPost);
            this.commentBox.removeListener(CommentBox.CommentEvents.cancel, this.onCommentCancel);
            this.commentBox.destroy();
            this.commentBox = null;
        }
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
        if (this.isMobile) {
            return;
        }

        // Plus 1 pixel for caret
        this.containerEl.style.left = `${this.position.x - 1 - this.containerEl.clientWidth / 2}px`;
        // Plus 5 pixels for caret
        this.containerEl.style.top = `${this.position.y + 5}px`;
    }

    /**
     * Fire an event notifying that the plain highlight button has been clicked.
     *
     * @param {Event} event - The DOM event coming from interacting with the element.
     * @return {void}
     */
    onHighlightClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.emit(CreateEvents.plain);
    }

    /**
     * Fire an event notifying that the comment button has been clicked. Also
     * show the comment box, and give focus to the text area conatined by it.
     *
     * @param {Event} event - The DOM event coming from interacting with the element.
     * @return {void}
     */
    onCommentClick(event) {
        event.preventDefault();
        event.stopPropagation();
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
        if (text) {
            this.commentBox.clear();
            this.commentBox.blur();
        }
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

        if (!this.isMobile) {
            const caretTemplate = document.createElement('div');
            caretTemplate.classList.add(constants.CLASS_ANNOTATION_CARET);
            caretTemplate.left = '50%';
            highlightDialogEl.appendChild(caretTemplate);
        }

        const buttonsEl = document.createElement('span');
        buttonsEl.classList.add(constants.CLASS_HIGHLIGHT_BTNS);

        if (this.allowHighlight) {
            const highlightEl = generateBtn(
                constants.CLASS_ADD_HIGHLIGHT_BTN,
                this.localized.highlightToggle,
                ICON_HIGHLIGHT,
                DATA_TYPE_HIGHLIGHT
            );
            buttonsEl.appendChild(highlightEl);
        }

        if (this.allowComment) {
            const commentEl = generateBtn(
                constants.CLASS_ADD_HIGHLIGHT_COMMENT_BTN,
                this.localized.highlightComment,
                ICON_HIGHLIGHT_COMMENT,
                DATA_TYPE_ADD_HIGHLIGHT_COMMENT
            );
            buttonsEl.appendChild(commentEl);
        }

        const dialogEl = document.createElement('div');
        dialogEl.classList.add(constants.CLASS_ANNOTATION_HIGHLIGHT_DIALOG);
        dialogEl.appendChild(buttonsEl);
        highlightDialogEl.appendChild(dialogEl);

        // Get rid of the caret
        if (this.isMobile) {
            highlightDialogEl.classList.add('bp-mobile-annotation-dialog');
            highlightDialogEl.classList.add('bp-annotation-dialog');
        }

        const containerEl = highlightDialogEl.querySelector(constants.SELECTOR_ANNOTATION_HIGHLIGHT_DIALOG);

        // Reference HTML
        this.buttonsEl = containerEl.querySelector(constants.SELECTOR_HIGHLIGHT_BTNS);

        // Stop interacting with this element from triggering outside actions
        highlightDialogEl.addEventListener('click', this.stopPropagation);
        highlightDialogEl.addEventListener('mouseup', this.stopPropagation);
        highlightDialogEl.addEventListener('dblclick', this.stopPropagation);

        // Events for highlight button
        if (this.allowHighlight) {
            this.highlightCreateEl = containerEl.querySelector(constants.SELECTOR_ADD_HIGHLIGHT_BTN);
            this.highlightCreateEl.addEventListener('click', this.onHighlightClick);

            if (this.hasTouch) {
                this.highlightCreateEl.addEventListener('touchstart', this.stopPropagation);
                this.highlightCreateEl.addEventListener('touchend', this.onHighlightClick);
            }
        }

        // Events for comment button
        if (this.allowComment) {
            // Create comment box
            this.commentBox = new CommentBox(containerEl, {
                hasTouch: this.hasTouch,
                localized: this.localized
            });
            this.commentCreateEl = containerEl.querySelector(`.${constants.CLASS_ADD_HIGHLIGHT_COMMENT_BTN}`);
            this.commentCreateEl.addEventListener('click', this.onCommentClick);

            // Event listeners
            this.commentBox.addListener(CommentBox.CommentEvents.post, this.onCommentPost);
            this.commentBox.addListener(CommentBox.CommentEvents.cancel, this.onCommentCancel);

            // Hide comment box, by default
            this.commentBox.hide();

            if (this.hasTouch) {
                this.commentCreateEl.addEventListener('touchstart', this.stopPropagation);
                this.commentCreateEl.addEventListener('touchend', this.onCommentClick);
            }
        }

        // touch events
        if (this.hasTouch) {
            highlightDialogEl.addEventListener('touchend', this.stopPropagation);
        }

        return highlightDialogEl;
    }
}

export default CreateHighlightDialog;
