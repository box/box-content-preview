/**
 * @fileoverview The annotation dialog class manages a dialog's HTML, event
 * handlers, and broadcasting annotations CRUD events.
 *
 * The following abstract methods must be implemented by a child class:
 * position() - position the dialog on the file using the location property
 * @author tjin
 */

import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import * as annotatorUtil from './annotator-util';
import * as constants from './annotation-constants';
import { CLASS_ACTIVE, CLASS_HIDDEN } from '../constants';
import { decodeKeydown } from '../util';
import { ICON_DELETE } from '../icons/icons';


@autobind
class AnnotationDialog extends EventEmitter {

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

        this._annotatedElement = data.annotatedElement;
        this._location = data.location;
        this._hasAnnotations = data.annotations.length > 0;
        this._canAnnotate = data.canAnnotate;
        this._locale = data.locale;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this._element) {
            this.unbindDOMListeners();

            if (this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }

            this._element = null;
        }
    }

    /**
     * Positions and shows the dialog.
     *
     * @return {void}
     */
    show() {
        const textAreaEl = this._hasAnnotations ?
            this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA) :
            this._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);

        // Don't re-position if reply textarea is already active
        const textareaIsActive = textAreaEl.classList.contains(CLASS_ACTIVE);
        if (textareaIsActive) {
            return;
        }

        // Position and show - we need to reposition every time since the DOM
        // could have changed from zooming
        this.position();

        // Activate appropriate textarea
        if (this._hasAnnotations) {
            this._activateReply();
        } else {
            textAreaEl.classList.add(CLASS_ACTIVE);
        }

        // Move cursor to end of text area
        if (textAreaEl.selectionStart) {
            textAreaEl.selectionEnd = textAreaEl.value.length;
            textAreaEl.selectionStart = textAreaEl.selectionEnd;
        }

        // If user cannot annotate, hide reply/edit/delete UI
        if (!this._canAnnotate) {
            this._element.classList.add(constants.CLASS_CANNOT_ANNOTATE);
        }

        // Focus the textarea if visible
        if (annotatorUtil.isElementInViewport(textAreaEl)) {
            textAreaEl.focus();
        }
    }

    /**
     * Hides the dialog.
     *
     * @param {boolean} [noDelay] - Whether or not to have a timeout delay
     * @return {void}
     */
    hide() {
        annotatorUtil.hideElement(this._element);
        this._deactivateReply();
    }

    /**
     * Adds an annotation to the dialog.
     *
     * @param {Annotation} annotation - Annotation to add
     * @return {void}
     */
    addAnnotation(annotation) {
        // Show new section if needed
        if (!this._hasAnnotations) {
            const createSectionEl = this._element.querySelector('[data-section="create"]');
            const showSectionEl = this._element.querySelector('[data-section="show"]');
            annotatorUtil.hideElement(createSectionEl);
            annotatorUtil.showElement(showSectionEl);
            this._hasAnnotations = true;
        }

        this._addAnnotationElement(annotation);
        this._deactivateReply(true); // Deactivate reply area and focus
    }

    /**
     * Removes an annotation from the dialog.
     *
     * @param {string} annotationID - ID of annotation to remove
     * @return {void}
     */
    removeAnnotation(annotationID) {
        const annotationEl = this._element.querySelector(`[data-annotation-id="${annotationID}"]`);
        if (annotationEl) {
            annotationEl.parentNode.removeChild(annotationEl);
            this._deactivateReply(); // Deactivate reply area and focus
        }
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets annotation dialog.
     *
     * @return {HTMLElement} Dialog
     */
    get element() {
        return this._element;
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
        this._element = document.createElement('div');
        this._element.setAttribute('data-type', 'annotation-dialog');
        this._element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
        this._element.innerHTML = `
            <div class="bp-annotation-caret"></div>
            <div class="annotation-container">
                <section class="${annotations.length ? CLASS_HIDDEN : ''}" data-section="create">
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
                <section class="${annotations.length ? '' : CLASS_HIDDEN}" data-section="show">
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
                </section>
            </section>`.trim();

        // Add annotation elements
        annotations.forEach((annotation) => {
            this._addAnnotationElement(annotation);
        });

        this.bindDOMListeners();
    }

    /**
     * Binds DOM event listeners.
     *
     * @return {void}
     * @protected
     */
    bindDOMListeners() {
        this._element.addEventListener('keydown', this.keydownHandler);
        this._element.addEventListener('click', this.clickHandler);
        this._element.addEventListener('mouseup', this.stopPropagation);
        this._element.addEventListener('mouseenter', this.mouseenterHandler);
        this._element.addEventListener('mouseleave', this.mouseleaveHandler);
        this._element.addEventListener('wheel', this.stopPropagation);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @return {void}
     * @protected
     */
    unbindDOMListeners() {
        this._element.removeEventListener('keydown', this.keydownHandler);
        this._element.removeEventListener('click', this.clickHandler);
        this._element.removeEventListener('mouseup', this.stopPropagation);
        this._element.removeEventListener('mouseenter', this.mouseenterHandler);
        this._element.removeEventListener('mouseleave', this.mouseleaveHandler);
        this._element.removeEventListener('wheel', this.stopPropagation);
    }

    /**
     * Keydown handler for dialog.
     *
     * @param {Event} event - DOM event
     * @return {void}
     * @protected
     */
    keydownHandler(event) {
        event.stopPropagation();

        const key = decodeKeydown(event);
        if (key === 'Escape') {
            this.hide(); // hide without delay
        } else {
            const dataType = annotatorUtil.findClosestDataType(event.target);
            if (dataType === 'reply-textarea') {
                this._activateReply();
            }
        }
    }

    /**
     * Stops propagation of DOM event.
     *
     * @param {Event} event - DOM event
     * @return {void}
     * @protected
     */
    stopPropagation(event) {
        event.stopPropagation();
    }

    /**
     * Mouseenter handler. Clears hide timeout.
     *
     * @return {void}
     * @protected
     */
    mouseenterHandler() {
        if (this._element.classList.contains(CLASS_HIDDEN)) {
            annotatorUtil.showElement(this._element);

            const replyTextArea = this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
            const commentsTextArea = this._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            if (replyTextArea.textContent !== '' || commentsTextArea.textContent !== '') {
                this.emit('annotationcommentpending');
            }

            // Ensure textarea stays open
            this._activateReply();
        }
    }

    /**
     * Mouseleave handler. Hides dialog if we aren't creating the first one.
     *
     * @return {void}
     * @protected
     */
    mouseleaveHandler() {
        if (this._hasAnnotations) {
            this.hide();
        }
    }

    /**
     * Click handler on dialog.
     *
     * @param {Event} event - DOM event
     * @return {void}
     * @protected
     */
    clickHandler(event) {
        event.stopPropagation();

        const eventTarget = event.target;
        const dataType = annotatorUtil.findClosestDataType(eventTarget);
        const annotationID = annotatorUtil.findClosestDataType(eventTarget, 'data-annotation-id');

        switch (dataType) {
            // Clicking 'Post' button to create an annotation
            case 'post-annotation-btn':
                this._postAnnotation();
                break;

            // Clicking 'Cancel' button to cancel the annotation
            case 'cancel-annotation-btn':
                this._cancelAnnotation();
                this._deactivateReply(true);
                break;

            // Clicking inside reply text area
            case 'reply-textarea':
                this._activateReply();
                break;

            // Canceling a reply
            case 'cancel-reply-btn':
                this._deactivateReply(true);
                break;

            // Clicking 'Post' button to create a reply annotation
            case 'post-reply-btn':
                this._postReply();
                break;

            // Clicking trash icon to initiate deletion
            case 'delete-btn':
                this._showDeleteConfirmation(annotationID);
                break;

            // Clicking 'Cancel' button to cancel deletion
            case 'cancel-delete-btn':
                this._hideDeleteConfirmation(annotationID);
                break;

            // Clicking 'Delete' button to confirm deletion
            case 'confirm-delete-btn': {
                this._deleteAnnotation(annotationID);
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
     * @param {Annotation} annotation - Annotation to add
     * @return {void}
     * @private
     */
    _addAnnotationElement(annotation) {
        // If annotation text is blank, don't add to the comments dialog
        if (!annotation.text) {
            return;
        }

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
        const created = new Date(annotation.created).toLocaleString(
            this._locale, { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        );
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

        const annotationContainerEl = this._element.querySelector(constants.SELECTOR_COMMENTS_CONTAINER);
        annotationContainerEl.appendChild(annotationEl);
    }

    /**
     * Posts an annotation in the dialog.
     *
     * @return {void}
     * @private
     */
    _postAnnotation() {
        const annotationTextEl = this._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
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
     * @return {void}
     * @private
     */
    _cancelAnnotation() {
        this.emit('annotationcancel');
    }

    /**
     * Activates reply textarea.
     *
     * @return {void}
     * @private
     */
    _activateReply() {
        const replyTextEl = this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);

        // Don't activate if reply textarea is already active
        const isActive = replyTextEl.classList.contains(CLASS_ACTIVE);
        if (isActive) {
            return;
        }

        const replyButtonEls = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
        replyTextEl.classList.add(CLASS_ACTIVE);
        annotatorUtil.showElement(replyButtonEls);

        // Auto scroll annotations dialog to bottom where new comment was added
        const annotationsEl = this._element.querySelector('.annotation-container');
        annotationsEl.scrollTop = annotationsEl.scrollHeight - annotationsEl.clientHeight;
    }

    /**
     * Deactivate reply textarea.
     *
     * @param {Boolean} clearText - Whether or not text in text area should be cleared
     * @return {void}
     * @private
     */
    _deactivateReply(clearText) {
        if (!this._element) {
            return;
        }

        const replyTextEl = this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
        const replyButtonEls = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
        annotatorUtil.resetTextarea(replyTextEl, clearText);
        annotatorUtil.hideElement(replyButtonEls);

        if (annotatorUtil.isElementInViewport(replyTextEl)) {
            replyTextEl.focus();
        }

        // Auto scroll annotations dialog to bottom where new comment was added
        const annotationsEl = this._element.querySelector('.annotation-container');
        annotationsEl.scrollTop = annotationsEl.scrollHeight - annotationsEl.clientHeight;
    }

    /**
     * Posts a reply in the dialog.
     *
     * @return {void}
     * @private
     */
    _postReply() {
        const replyTextEl = this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
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
     * @param {string} annotationID - ID of annotation to delete
     * @return {void}
     * @private
     */
    _showDeleteConfirmation(annotationID) {
        const annotationEl = this._element.querySelector(`[data-annotation-id="${annotationID}"]`);
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
     * @param {string} annotationID - ID of annotation to delete
     * @return {void}
     * @private
     */
    _hideDeleteConfirmation(annotationID) {
        const annotationEl = this._element.querySelector(`[data-annotation-id="${annotationID}"]`);
        const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
        const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
        annotatorUtil.showElement(deleteButtonEl);
        annotatorUtil.hideElement(deleteConfirmationEl);
        deleteButtonEl.focus();
    }

    /**
     * Broadcasts message to delete an annotation.
     *
     * @param {string} annotationID - ID of annotation to delete
     * @return {void}
     * @private
     */
    _deleteAnnotation(annotationID) {
        this.emit('annotationdelete', { annotationID });
    }
}

export default AnnotationDialog;
