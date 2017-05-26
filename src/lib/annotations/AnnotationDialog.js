import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import * as annotatorUtil from './annotatorUtil';
import * as constants from './annotationConstants';
import { CLASS_ACTIVE, CLASS_HIDDEN } from '../constants';
import { decodeKeydown } from '../util';
import { ICON_CLOSE, ICON_DELETE } from '../icons/icons';

@autobind class AnnotationDialog extends EventEmitter {
    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing a dialog.
     * @typedef {Object} AnnotationDialogData
     * @property {HTMLElement} annotatedElement HTML element being annotated on
     * @property {Annotation[]} annotations Annotations in dialog, can be an
     * empty array for a new thread
     * @property {Object} location Location object
     * @property {boolean} canAnnotate Whether or not user can annotate
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationDialogData} data - Data for constructing thread
     * @return {AnnotationDialog} Annotation dialog instance
     */
    constructor(data) {
        super();

        this.annotatedElement = data.annotatedElement;
        this.location = data.location;
        this.hasAnnotations = data.annotations.length > 0;
        this.canAnnotate = data.canAnnotate;
        this.locale = data.locale;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.element) {
            this.unbindDOMListeners();

            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.element = null;
        }
    }

    /**
     * Positions and shows the dialog.
     *
     * @return {void}
     */
    show() {
        // Populate mobile annotations dialog with annotations information
        if (this.isMobile) {
            this.element = document.querySelector(`.${constants.CLASS_MOBILE_ANNOTATION_DIALOG}`);
            annotatorUtil.showElement(this.element);
            this.element.appendChild(this.dialogEl);
            if (this.highlightDialogEl && !this.hasComments) {
                this.element.classList.add('bp-plain-highlight');
            }

            const dialogCloseButtonEl = this.element.querySelector('.bp-annotation-dialog-close');
            dialogCloseButtonEl.addEventListener('click', this.hideMobileDialog);

            this.bindDOMListeners();
        }

        const textAreaEl = this.hasAnnotations
            ? this.element.querySelector(constants.SELECTOR_REPLY_TEXTAREA)
            : this.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);

        // Don't re-position if reply textarea is already active
        const textareaIsActive = textAreaEl.classList.contains(CLASS_ACTIVE);
        if (textareaIsActive && this.element.parentNode) {
            return;
        }

        // Position and show - we need to reposition every time since the DOM
        // could have changed from zooming
        if (!this.isMobile) {
            this.position();
        }

        // Activate appropriate textarea
        if (this.hasAnnotations) {
            this.activateReply();
        } else {
            textAreaEl.classList.add(CLASS_ACTIVE);
        }

        // Move cursor to end of text area
        if (textAreaEl.selectionStart) {
            textAreaEl.selectionEnd = textAreaEl.value.length;
            textAreaEl.selectionStart = textAreaEl.selectionEnd;
        }

        // If user cannot annotate, hide reply/edit/delete UI
        if (!this.canAnnotate) {
            this.element.classList.add(constants.CLASS_CANNOT_ANNOTATE);
        }

        // Focus the textarea if visible
        if (annotatorUtil.isElementInViewport(textAreaEl)) {
            textAreaEl.focus();
        }
    }

    /**
     * Hides and resets the shared mobile dialog.
     *
     * @return {void}
     */
    hideMobileDialog() {
        if (!this.element) {
            return;
        }

        // Clear annotations from dialog
        this.element.innerHTML = `
            <div class="bp-annotation-mobile-header">
                <button class="bp-annotation-dialog-close">${ICON_CLOSE}</button>
            </div>`.trim();
        this.element.classList.remove('bp-plain-highlight');

        const dialogCloseButtonEl = this.element.querySelector('.bp-annotation-dialog-close');
        dialogCloseButtonEl.removeEventListener('click', this.hideMobileDialog);

        annotatorUtil.hideElement(this.element);
    }

    /**
     * Hides the dialog.
     *
     * @param {boolean} [noDelay] - Whether or not to have a timeout delay
     * @return {void}
     */
    hide() {
        if (this.isMobile) {
            this.hideMobileDialog();
        }
        annotatorUtil.hideElement(this.element);
        this.deactivateReply();
    }

    /**
     * Adds an annotation to the dialog.
     *
     * @param {Annotation} annotation - Annotation to add
     * @return {void}
     */
    addAnnotation(annotation) {
        // Show new section if needed
        if (!this.hasAnnotations) {
            const createSectionEl = this.element.querySelector('[data-section="create"]');
            const showSectionEl = this.element.querySelector('[data-section="show"]');
            annotatorUtil.hideElement(createSectionEl);
            annotatorUtil.showElement(showSectionEl);
            this.hasAnnotations = true;
        }

        this.addAnnotationElement(annotation);
        this.deactivateReply(true); // Deactivate reply area and focus
    }

    /**
     * Removes an annotation from the dialog.
     *
     * @param {string} annotationID - ID of annotation to remove
     * @return {void}
     */
    removeAnnotation(annotationID) {
        const annotationEl = this.element.querySelector(`[data-annotation-id="${annotationID}"]`);
        if (annotationEl) {
            annotationEl.parentNode.removeChild(annotationEl);
            this.deactivateReply(); // Deactivate reply area and focus
        }
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Must be implemented to position the dialog on the preview.
     *
     * @return {void}
     */
    position() {}

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Sets up the dialog element.
     *
     * @param {Annotation[]} Annotations - to show in the dialog
     * @return {void}
     * @protected
     */
    setup(annotations) {
        // Generate HTML of dialog
        this.dialogEl = this.generateDialogEl(annotations.length);
        this.dialogEl.classList.add('annotation-container');

        if (!this.isMobile) {
            this.element = document.createElement('div');
            this.element.setAttribute('data-type', 'annotation-dialog');
            this.element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            this.element.innerHTML = '<div class="bp-annotation-caret"></div>';
            this.element.appendChild(this.dialogEl);

            // Adding thread number to dialog
            if (annotations.length > 0) {
                this.element.dataset.threadNumber = annotations[0].thread;
            }

            this.bindDOMListeners();
        }

        // Add annotation elements
        annotations.forEach((annotation) => {
            this.addAnnotationElement(annotation);
        });
    }

    /**
     * Binds DOM event listeners.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        this.element.addEventListener('keydown', this.keydownHandler);
        this.element.addEventListener('click', this.clickHandler);
        this.element.addEventListener('mouseup', this.stopPropagation);
        this.element.addEventListener('wheel', this.stopPropagation);
        if (!this.isMobile) {
            this.element.addEventListener('mouseenter', this.mouseenterHandler);
            this.element.addEventListener('mouseleave', this.mouseleaveHandler);
        }
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        this.element.removeEventListener('keydown', this.keydownHandler);
        this.element.removeEventListener('click', this.clickHandler);
        this.element.removeEventListener('mouseup', this.stopPropagation);
        this.element.removeEventListener('wheel', this.stopPropagation);
        if (!this.isMobile) {
            this.element.removeEventListener('mouseenter', this.mouseenterHandler);
            this.element.removeEventListener('mouseleave', this.mouseleaveHandler);
        }
    }

    /**
     * Keydown handler for dialog.
     *
     * @protected
     * @param {Event} event - DOM event
     * @return {void}
     */
    keydownHandler(event) {
        event.stopPropagation();

        const key = decodeKeydown(event);
        if (key === 'Escape') {
            this.hide(); // hide without delay
        } else {
            const dataType = annotatorUtil.findClosestDataType(event.target);
            if (dataType === 'reply-textarea') {
                this.activateReply();
            }
        }
    }

    /**
     * Stops propagation of DOM event.
     *
     * @protected
     * @param {Event} event - DOM event
     * @return {void}
     */
    stopPropagation(event) {
        event.stopPropagation();
    }

    /**
     * Mouseenter handler. Clears hide timeout.
     *
     * @protected
     * @return {void}
     */
    mouseenterHandler() {
        if (this.element.classList.contains(CLASS_HIDDEN)) {
            annotatorUtil.showElement(this.element);

            const replyTextArea = this.element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            const commentsTextArea = this.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            if (replyTextArea.textContent !== '' || commentsTextArea.textContent !== '') {
                this.emit('annotationcommentpending');
            }

            // Ensure textarea stays open
            this.activateReply();
        }
    }

    /**
     * Mouseleave handler. Hides dialog if we aren't creating the first one.
     *
     * @protected
     * @return {void}
     */
    mouseleaveHandler() {
        if (this.hasAnnotations) {
            this.hide();
        }
    }

    /**
     * Click handler on dialog.
     *
     * @protected
     * @param {Event} event - DOM event
     * @return {void}
     */
    clickHandler(event) {
        event.stopPropagation();

        const eventTarget = event.target;
        const dataType = annotatorUtil.findClosestDataType(eventTarget);
        const annotationID = annotatorUtil.findClosestDataType(eventTarget, 'data-annotation-id');

        switch (dataType) {
            // Clicking 'Post' button to create an annotation
            case 'post-annotation-btn':
                this.postAnnotation();
                break;
            // Clicking 'Cancel' button to cancel the annotation
            case 'cancel-annotation-btn':
                this.cancelAnnotation();
                this.deactivateReply(true);
                break;
            // Clicking inside reply text area
            case 'reply-textarea':
                this.activateReply();
                break;
            // Canceling a reply
            case 'cancel-reply-btn':
                this.deactivateReply(true);
                break;
            // Clicking 'Post' button to create a reply annotation
            case 'post-reply-btn':
                this.postReply();
                break;
            // Clicking trash icon to initiate deletion
            case 'delete-btn':
                this.showDeleteConfirmation(annotationID);
                break;
            // Clicking 'Cancel' button to cancel deletion
            case 'cancel-delete-btn':
                this.hideDeleteConfirmation(annotationID);
                break;
            // Clicking 'Delete' button to confirm deletion
            case 'confirm-delete-btn': {
                this.deleteAnnotation(annotationID);
                break;
            }

            default:
                break;
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Adds an annotation to the dialog.
     *
     * @private
     * @param {Annotation} annotation - Annotation to add
     * @return {void}
     */
    addAnnotationElement(annotation) {
        const userId = annotatorUtil.htmlEscape(annotation.user.id || '0');

        // Temporary until annotation user API is available
        let userName;
        if (userId === '0') {
            userName = __('annotation_posting_message');
        } else {
            userName = annotatorUtil.htmlEscape(annotation.user.name) || __('annotation_anonymous_user_name');
        }

        const avatarUrl = annotatorUtil.htmlEscape(annotation.user.avatarUrl || '');
        const avatarHtml = annotatorUtil.getAvatarHtml(avatarUrl, userId, userName);
        const created = new Date(annotation.created).toLocaleString(this.locale, {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const text = annotatorUtil.htmlEscape(annotation.text);

        const annotationEl = document.createElement('div');
        annotationEl.classList.add('annotation-comment');
        annotationEl.setAttribute('data-annotation-id', annotation.annotationID);
        annotationEl.innerHTML = `
            <div class="profile-image-container">${avatarHtml}</div>
            <div class="profile-container">
                <div class="user-name">${userName}</div>
                <div class="comment-date">${created}</div>
            </div>
            <div class="comment-text">${text}</div>
            <button class="bp-btn-plain delete-comment-btn ${annotation.permissions.can_delete ? '' : 'bp-is-hidden'}" data-type="delete-btn" title="${__('annotation_delete')}">
                ${ICON_DELETE}
            </button>
            <div class="delete-confirmation ${CLASS_HIDDEN}">
                <div class="delete-confirmation-message">
                    ${__('annotation_delete_confirmation_message')}
                </div>
                <div class="button-container">
                    <button class="bp-btn cancel-delete-btn" data-type="cancel-delete-btn">
                        ${__('annotation_cancel')}
                    </button>
                    <button class="bp-btn bp-btn-primary confirm-delete-btn" data-type="confirm-delete-btn">
                        ${__('annotation_delete')}
                    </button>
                </div>
            </div>`.trim();

        const annotationContainerEl = this.dialogEl.querySelector(constants.SELECTOR_COMMENTS_CONTAINER);
        annotationContainerEl.appendChild(annotationEl);
    }

    /**
     * Posts an annotation in the dialog.
     *
     * @private
     * @return {void}
     */
    postAnnotation() {
        const annotationTextEl = this.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
        const text = annotationTextEl.value;
        if (text.trim() === '') {
            return;
        }

        this.emit('annotationcreate', { text });
        annotationTextEl.value = '';
    }

    /**
     * Cancels posting an annotation.
     *
     * @private
     * @return {void}
     */
    cancelAnnotation() {
        this.emit('annotationcancel');
    }

    /**
     * Activates reply textarea.
     *
     * @private
     * @return {void}
     */
    activateReply() {
        if (!this.dialogEl) {
            return;
        }

        const replyTextEl = this.dialogEl.querySelector(constants.SELECTOR_REPLY_TEXTAREA);

        // Don't activate if reply textarea is already active
        const isActive = replyTextEl.classList.contains(CLASS_ACTIVE);
        if (isActive) {
            return;
        }

        const replyButtonEls = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
        replyTextEl.classList.add(CLASS_ACTIVE);
        annotatorUtil.showElement(replyButtonEls);

        // Auto scroll annotations dialog to bottom where new comment was added
        const annotationsEl = this.dialogEl.querySelector('.annotation-container');
        if (annotationsEl) {
            annotationsEl.scrollTop = annotationsEl.scrollHeight - annotationsEl.clientHeight;
        }
    }

    /**
     * Deactivate reply textarea.
     *
     * @private
     * @param {Boolean} clearText - Whether or not text in text area should be cleared
     * @return {void}
     */
    deactivateReply(clearText) {
        if (!this.dialogEl) {
            return;
        }

        const replyTextEl = this.dialogEl.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
        const replyButtonEls = this.dialogEl.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
        annotatorUtil.resetTextarea(replyTextEl, clearText);
        annotatorUtil.hideElement(replyButtonEls);

        if (annotatorUtil.isElementInViewport(replyTextEl)) {
            replyTextEl.focus();
        }

        // Auto scroll annotations dialog to bottom where new comment was added
        const annotationsEl = this.dialogEl.querySelector('.annotation-container');
        if (annotationsEl) {
            annotationsEl.scrollTop = annotationsEl.scrollHeight - annotationsEl.clientHeight;
        }
    }

    /**
     * Posts a reply in the dialog.
     *
     * @private
     * @return {void}
     */
    postReply() {
        const replyTextEl = this.element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
        const text = replyTextEl.value;
        if (text.trim() === '') {
            return;
        }

        this.emit('annotationcreate', { text });
        replyTextEl.value = '';
    }

    /**
     * Shows delete confirmation.
     *
     * @private
     * @param {string} annotationID - ID of annotation to delete
     * @return {void}
     */
    showDeleteConfirmation(annotationID) {
        const annotationEl = this.element.querySelector(`[data-annotation-id="${annotationID}"]`);
        const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
        const cancelDeleteButtonEl = annotationEl.querySelector('.cancel-delete-btn');
        const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
        annotatorUtil.hideElement(deleteButtonEl);
        annotatorUtil.showElement(deleteConfirmationEl);
        cancelDeleteButtonEl.focus();
    }

    /**
     * Hides delete confirmation.
     *
     * @private
     * @param {string} annotationID - ID of annotation to delete
     * @return {void}
     */
    hideDeleteConfirmation(annotationID) {
        const annotationEl = this.element.querySelector(`[data-annotation-id="${annotationID}"]`);
        const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
        const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
        annotatorUtil.showElement(deleteButtonEl);
        annotatorUtil.hideElement(deleteConfirmationEl);
        deleteButtonEl.focus();
    }

    /**
     * Broadcasts message to delete an annotation.
     *
     * @private
     * @param {string} annotationID - ID of annotation to delete
     * @return {void}
     */
    deleteAnnotation(annotationID) {
        this.emit('annotationdelete', { annotationID });
    }

    /**
     * Generates the annotation dialog DOM element
     *
     * @private
     * @param {number} numAnnotations - length of annotations array
     * @return {HTMLElement} Annotation dialog DOM element
     */
    generateDialogEl(numAnnotations) {
        const dialogEl = document.createElement('div');
        dialogEl.innerHTML = `
            <section class="${numAnnotations ? CLASS_HIDDEN : ''}" data-section="create">
                <textarea class="bp-textarea annotation-textarea"
                    placeholder="${__('annotation_add_comment_placeholder')}"></textarea>
                <div class="button-container">
                    <button class="bp-btn cancel-annotation-btn" data-type="cancel-annotation-btn">
                        ${__('annotation_cancel')}
                    </button>
                    <button class="bp-btn bp-btn-primary post-annotation-btn" data-type="post-annotation-btn">
                        ${__('annotation_post')}
                    </button>
                </div>
            </section>
            <section class="${numAnnotations ? '' : CLASS_HIDDEN}" data-section="show">
                <div class="annotation-comments"></div>
                <div class="reply-container">
                    <textarea class="bp-textarea reply-textarea"
                        placeholder="${__('annotation_reply_placeholder')}" data-type="reply-textarea"></textarea>
                    <div class="button-container ${CLASS_HIDDEN}">
                        <button class="bp-btn cancel-annotation-btn" data-type="cancel-reply-btn">
                            ${__('annotation_cancel')}
                        </button>
                        <button class="bp-btn bp-btn-primary post-annotation-btn" data-type="post-reply-btn">
                            ${__('annotation_post')}
                        </button>
                    </div>
                </div>
            </section>`.trim();
        return dialogEl;
    }
}

export default AnnotationDialog;
