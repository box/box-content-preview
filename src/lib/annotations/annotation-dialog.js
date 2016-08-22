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

const DIALOG_HIDE_TIMEOUT = 500;

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
     * @property {Boolean} canAnnotate Whether or not user can annotate
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationDialogData} data Data for constructing thread
     * @returns {AnnotationDialog} Annotation dialog instance
     */
    constructor(data) {
        super();

        this._annotatedElement = data.annotatedElement;
        this._location = data.location;
        this._hasAnnotations = data.annotations.length > 0;
        this._canAnnotate = data.canAnnotate;

        this.setup(data.annotations);
    }

    /**
     * [destructor]
     *
     * @returns {void}
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
     * @returns {void}
     */
    show() {
        // Reset hide timeout handler
        clearTimeout(this._timeoutHandler);
        this._timeoutHandler = null;

        // Position and show - we need to reposition every time since the DOM
        // could have changed from zooming
        this.position();

        // If user cannot annotate, hide reply/edit/delete UI
        if (!this._canAnnotate) {
            this._element.classList.add(constants.CLASS_CANNOT_ANNOTATE);
        }

        // Focus the textarea if visible
        const textAreaEl = this._hasAnnotations ?
            this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA) :
            this._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
        if (annotatorUtil.isElementInViewport(textAreaEl)) {
            textAreaEl.focus();
        }
    }

    /**
     * Hides the dialog.
     *
     * @param {Boolean} [noDelay] Whether or not to have a timeout delay
     * @returns {void}
     */
    hide(noDelay = false) {
        if (noDelay) {
            annotatorUtil.hideElement(this._element);
            clearTimeout(this._timeoutHandler);
            this._timeoutHandler = null;
        } else if (!this._timeoutHandler) {
            this._timeoutHandler = setTimeout(() => {
                annotatorUtil.hideElement(this._element);
                this._timeoutHandler = null;
            }, DIALOG_HIDE_TIMEOUT);
        }
    }

    /**
     * Adds an annotation to the dialog.
     *
     * @param {Annotation} annotation Annotation to add
     * @returns {void}
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
        this._deactivateReply(); // Deactivate reply area and focus
    }

    /**
     * Removes an annotation from the dialog.
     *
     * @param {String} annotationID ID of annotation to remove
     * @returns {void}
     */
    removeAnnotation(annotationID) {
        const annotationEl = this._element.querySelector(`[data-annotation-id="${annotationID}"]`);
        if (annotationEl) {
            annotationEl.parentNode.removeChild(annotationEl);
            this._deactivateReply(); // Deactivate reply area and focus
        }
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Must be implemented to position the dialog on the preview.
     *
     * @returns {void}
     */
    position() {}

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Sets up the dialog element.
     *
     * @param {Annotation[]} Annotations to show in the dialog
     * @returns {void}
     * @protected
     */
    setup(annotations) {
        // Generate HTML of dialog
        this._element = document.createElement('div');
        this._element.setAttribute('data-type', 'annotation-dialog');
        this._element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
        this._element.innerHTML = `
            <div class="box-preview-annotation-caret"></div>
            <div class="annotation-container">
                <section class="${annotations.length ? CLASS_HIDDEN : ''}" data-section="create">
                    <textarea class="box-preview-textarea annotation-textarea ${CLASS_ACTIVE}"
                        placeholder="${__('annotation_add_comment_placeholder')}"></textarea>
                    <div class="button-container">
                        <button class="box-preview-btn cancel-annotation-btn" data-type="cancel-annotation-btn">
                            ${__('annotation_cancel')}
                        </button>
                        <button class="box-preview-btn box-preview-btn-primary post-annotation-btn" data-type="post-annotation-btn">
                            ${__('annotation_post')}
                        </button>
                    </div>
                </section>
                <section class="${annotations.length ? '' : CLASS_HIDDEN}" data-section="show">
                    <div class="annotation-comments"></div>
                    <div class="reply-container">
                        <textarea class="box-preview-textarea reply-textarea"
                            placeholder="${__('annotation_reply_placeholder')}" data-type="reply-textarea"></textarea>
                        <div class="button-container ${CLASS_HIDDEN}">
                            <button class="box-preview-btn cancel-annotation-btn" data-type="cancel-reply-btn">
                                ${__('annotation_cancel')}
                            </button>
                            <button class="box-preview-btn box-preview-btn-primary post-annotation-btn" data-type="post-reply-btn">
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
     * @returns {void}
     * @protected
     */
    bindDOMListeners() {
        this._element.addEventListener('keydown', this.keydownHandler);
        this._element.addEventListener('click', this.clickHandler);
        this._element.addEventListener('mouseup', this.mouseupHandler);
        this._element.addEventListener('mouseenter', this.mouseenterHandler);
        this._element.addEventListener('mouseleave', this.mouseleaveHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @protected
     */
    unbindDOMListeners() {
        this._element.removeEventListener('keydown', this.keydownHandler);
        this._element.removeEventListener('click', this.clickHandler);
        this._element.removeEventListener('mouseup', this.mouseupHandler);
        this._element.removeEventListener('mouseenter', this.mouseenterHandler);
        this._element.removeEventListener('mouseleave', this.mouseleaveHandler);
    }

    /**
     * Keydown handler for dialog.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @protected
     */
    keydownHandler(event) {
        event.stopPropagation();

        const key = decodeKeydown(event);
        if (key === 'Escape') {
            this.hide(true); // hide without delay
        } else {
            const dataType = annotatorUtil.findClosestDataType(event.target);
            if (dataType === 'reply-textarea') {
                this._activateReply();
            }
        }
    }

    /**
     * Mouseup handler. Stops propagation of mouseup, which may be used by
     * other annotation classes.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @protected
     */
    mouseupHandler(event) {
        event.stopPropagation();
    }

    /**
     * Mouseenter handler. Clears hide timeout.
     *
     * @returns {void}
     * @protected
     */
    mouseenterHandler() {
        // Reset hide timeout handler
        clearTimeout(this._timeoutHandler);
        this._timeoutHandler = null;
    }

    /**
     * Mouseleave handler. Hides dialog if we aren't creating the first one.
     *
     * @returns {void}
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
     * @param {Event} event DOM event
     * @returns {void}
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
                break;

            // Clicking inside reply text area
            case 'reply-textarea':
                this._activateReply();
                break;

            // Canceling a reply
            case 'cancel-reply-btn':
                this._deactivateReply();
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
     * @param {Annotation} annotation Annotation to add
     * @returns {void}
     * @private
     */
    _addAnnotationElement(annotation) {
        // If annotation text is blank, don't add to the comments dialog
        if (!annotation.text) {
            return;
        }

        const userId = parseInt(annotatorUtil.htmlEscape(annotation.user.id || 0), 10);

        // Temporary until annotation user API is available
        let userName;
        if (userId === 0) {
            userName = __('annotation_posting_message');
        } else {
            userName = annotatorUtil.htmlEscape(annotation.user.name || '');
        }

        const avatarUrl = annotatorUtil.htmlEscape(annotation.user.avatarUrl || '');
        const avatarHtml = annotatorUtil.getAvatarHtml(avatarUrl, userId, userName);
        const created = new Date(annotation.created).toLocaleDateString(
            'en-US',
            { hour: '2-digit', minute: '2-digit' }
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
            <button class="box-preview-btn-plain delete-comment-btn ${annotation.permissions.can_delete ? '' : 'box-preview-is-hidden'}" data-type="delete-btn" title="${__('annotation_delete_comment')}">
                ${ICON_DELETE}
            </button>
            <div class="delete-confirmation ${CLASS_HIDDEN}">
                <div class="delete-confirmation-message">
                    ${__('annotation_delete_confirmation_message')}
                </div>
                <div class="button-container">
                    <button class="box-preview-btn cancel-delete-btn" data-type="cancel-delete-btn">
                        ${__('annotation_cancel')}
                    </button>
                    <button class="box-preview-btn box-preview-btn-primary confirm-delete-btn" data-type="confirm-delete-btn">
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
     * @returns {void}
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
     * @returns {void}
     * @private
     */
    _cancelAnnotation() {
        this.emit('annotationcancel');
    }

    /**
     * Activates reply textarea.
     *
     * @returns {void}
     * @private
     */
    _activateReply() {
        const replyTextEl = this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
        const replyButtonEls = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
        replyTextEl.classList.add(CLASS_ACTIVE);
        annotatorUtil.showElement(replyButtonEls);
    }

    /**
     * Deactivate reply textarea.
     *
     * @returns {void}
     * @private
     */
    _deactivateReply() {
        const replyTextEl = this._element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
        const replyButtonEls = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
        annotatorUtil.resetTextarea(replyTextEl);
        annotatorUtil.hideElement(replyButtonEls);

        if (annotatorUtil.isElementInViewport(replyTextEl)) {
            replyTextEl.focus();
        }
    }

    /**
     * Posts a reply in the dialog.
     *
     * @returns {void}
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
     * @param {String} annotationID ID of annotation to delete
     * @returns {void}
     * @private
     */
    _showDeleteConfirmation(annotationID) {
        const annotationEl = this._element.querySelector(`[data-annotation-id="${annotationID}"]`);
        const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
        const cancelDeleteButtonEl = annotationEl.querySelector('.cancel-delete-btn');
        annotatorUtil.showElement(deleteConfirmationEl);
        cancelDeleteButtonEl.focus();
    }

    /**
     * Hides delete confirmation.
     *
     * @param {String} annotationID ID of annotation to delete
     * @returns {void}
     * @private
     */
    _hideDeleteConfirmation(annotationID) {
        const annotationEl = this._element.querySelector(`[data-annotation-id="${annotationID}"]`);
        const deleteConfirmationEl = annotationEl.querySelector('.delete-confirmation');
        const deleteButtonEl = annotationEl.querySelector('.delete-comment-btn');
        annotatorUtil.hideElement(deleteConfirmationEl);
        deleteButtonEl.focus();
    }

    /**
     * Broadcasts message to delete an annotation.
     *
     * @param {String} annotationID ID of annotation to delete
     * @returns {void}
     * @private
     */
    _deleteAnnotation(annotationID) {
        this.emit('annotationdelete', { annotationID });
    }
}

export default AnnotationDialog;
