/**
 * @fileoverview The annotation dialog class manages a dialog's HTML, event
 * handlers, and broadcasting annotations CRUD events.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import EventEmitter from 'events';

import * as annotatorUtil from './annotator-util';
import * as constants from './annotation-constants';
import { decodeKeydown } from '../util.js';

import { CLASS_ACTIVE, CLASS_HIDDEN } from '../constants';
import { ICON_DELETE_SMALL } from '../icons/icons';

const DIALOG_HIDE_TIMEOUT = 500;

@autobind
class AnnotationDialog extends EventEmitter {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing a dialog.
     *
     * @typedef {Object} AnnotationDialogData
     * @property {HTMLElement} annotatedElement HTML element being annotated on
     * @property {Annotation[]} annotations Annotations in dialog, can be an
     * empty array for a new thread
     * @property {Object} location Location object
     * @property {String} threadID Thread ID
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

        this.annotatedElement = data.annotatedElement;
        this.location = data.location;
        this.threadID = data.threadID;

        this._setup(data.annotations);
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        if (this.element) {
            this._unbindDOMListeners();

            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.element = null;
        }
    }

    /**
     * Positions and shows the dialog.
     *
     * @returns {void}
     */
    show() {
        // Reset hide timeout handler
        clearTimeout(this.timeoutHandler);
        this.timeoutHandler = null;

        // Position and show - we need to reposition every time since the DOM
        // could have changed from zooming
        this._position();

        // Focus textarea if visible
        const textAreaEl = this._inCreateMode() ?
            this.element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA) :
            this.element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
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
            annotatorUtil.hideElement(this.element);
            clearTimeout(this.timeoutHandler);
            this.timeoutHandler = null;
        } else if (!this.timeoutHandler) {
            this.timeoutHandler = setTimeout(() => {
                annotatorUtil.hideElement(this.element);
                this.timeoutHandler = null;
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
        // If in create mode, switch to show mode
        if (this._inCreateMode()) {
            const createSectionEl = this.element.querySelector('[data-section="create"]');
            const showSectionEl = this.element.querySelector('[data-section="show"]');
            annotatorUtil.hideElement(createSectionEl);
            annotatorUtil.showElement(showSectionEl);
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
        const annotationEl = this.element.querySelector(`[data-annotation-id="${annotationID}"]`);
        if (annotationEl) {
            annotationEl.parentNode.removeChild(annotationEl);
        }
        this._deactivateReply(); // Deactivate reply area and focus
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets up the dialog element.
     *
     * @param {Annotation[]} Annotations to show in the dialog
     * @returns {void}
     * @private
     */
    _setup(annotations) {
        // Generate HTML of dialog
        this.element = document.createElement('div');
        this.element.setAttribute('data-type', 'annotation-dialog');
        this.element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
        this.element.innerHTML = `
            <div class="annotation-container-caret"></div>
            <div class="annotation-container">
                <section class="${annotations.length ? CLASS_HIDDEN : ''}" data-section="create">
                    <textarea class="annotation-textarea ${CLASS_ACTIVE}" placeholder="Add a comment here..."></textarea>
                    <div class="button-container">
                        <button class="btn cancel-annotation-btn" data-type="cancel-annotation-btn">CANCEL</button>
                        <button class="btn btn-primary post-annotation-btn" data-type="post-annotation-btn">POST</button>
                    </div>
                </section>
                <section class="${annotations.length ? '' : CLASS_HIDDEN}" data-section="show">
                    <div class="annotation-comments"></div>
                    <div class="reply-container">
                        <textarea class="reply-textarea" placeholder="Post a reply..." data-type="reply-textarea"></textarea>
                        <div class="button-container ${CLASS_HIDDEN}">
                            <button class="btn cancel-annotation-btn" data-type="cancel-reply-btn">CANCEL</button>
                            <button class="btn btn-primary post-annotation-btn" data-type="post-reply-btn">POST</button>
                        </div>
                    </div>
                </section>
            </section>
            `.trim();

        // Add annotation elements
        annotations.forEach((annotation) => {
            this._addAnnotationElement(annotation);
        });

        this._bindDOMListeners();
    }

    /**
     * Adds an annotation to the dialog.
     *
     * @param {Annotation} annotation Annotation to add
     * @returns {void}
     * @private
     */
    _addAnnotationElement(annotation) {
        const avatarUrl = annotatorUtil.htmlEscape(annotation.user.avatarUrl);
        const userName = annotatorUtil.htmlEscape(annotation.user.name);
        const created = new Date(annotation.created).toLocaleDateString(
            'en-US',
            { hour: '2-digit', minute: '2-digit' }
        );
        const text = annotatorUtil.htmlEscape(annotation.text);

        const annotationEl = document.createElement('div');
        annotationEl.classList.add('annotation-comment');
        annotationEl.setAttribute('data-annotation-id', annotation.annotationID);
        annotationEl.innerHTML = `
            <div class="profile-image-container"><img src=${avatarUrl} alt="Profile"></div>
            <div class="profile-container">
                <div class="user-name">${userName}</div>
                <div class="comment-date">${created}</div>
            </div>
            <div class="comment-text">${text}</div>
            <button class="btn-plain delete-comment-btn" data-type="delete-btn">${ICON_DELETE_SMALL}</button>
            <div class="delete-confirmation ${CLASS_HIDDEN}">
                <div class="delete-confirmation-message">Delete this annotation?</div>
                <div class="button-container">
                    <button class="btn cancel-delete-btn" data-type="cancel-delete-btn">CANCEL</button>
                    <button class="btn btn-primary confirm-delete-btn" data-type="confirm-delete-btn">DELETE</button>
                </div>
            </div>`.trim();

        const annotationContainerEl = this.element.querySelector(constants.SELECTOR_COMMENTS_CONTAINER);
        annotationContainerEl.appendChild(annotationEl);
    }

    /**
     * Positions the dialog.
     *
     * @returns {void}
     * @private
     */
    _position() {
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`) || this.annotatedElement;
        const [browserX, browserY] = annotatorUtil.getBrowserCoordinatesFromLocation(this.location, this.annotatedElement);

        // Show dialog so we can get width
        pageEl.appendChild(this.element);
        annotatorUtil.showElement(this.element);
        const dialogDimensions = this.element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - dialogWidth / 2;

        // Position 7px below location and transparent border pushes it down
        // further - this coordinate is with respect to the page
        const dialogTopY = browserY + 7;

        // Reposition to avoid sides - left side of page is 0px, right side is ${pageWidth}px
        const dialogPastLeft = dialogLeftX < 0;
        const dialogPastRight = dialogLeftX + dialogWidth > pageWidth;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        const annotationCaretEl = this.element.querySelector('.annotation-container-caret');
        if (dialogPastLeft && !dialogPastRight) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretLeftX = Math.max(10, browserX);
            annotationCaretEl.style.right = 'initial';
            annotationCaretEl.style.left = `${caretLeftX}px`;

            dialogLeftX = 0;

        // Fix the dialog and move caret appropriately
        } else if (dialogPastRight && !dialogPastLeft) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretRightX = Math.max(10, pageWidth - browserX);
            annotationCaretEl.style.right = `${caretRightX}px`;
            annotationCaretEl.style.left = 'initial';

            dialogLeftX = pageWidth - dialogWidth;

        // Reset caret to center
        } else {
            annotationCaretEl.style.right = 'initial';
            annotationCaretEl.style.left = '50%';
        }

        // Position the dialog
        this.element.style.left = `${dialogLeftX}px`;
        this.element.style.top = `${dialogTopY}px`;
    }

    /**
     * Binds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        this.element.addEventListener('keydown', this._keydownHandler);
        this.element.addEventListener('click', this._clickHandler);
        this.element.addEventListener('mouseenter', this._mouseenterHandler);
        this.element.addEventListener('mouseleave', this._mouseleaveHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        this.element.removeEventListener('keydown', this._keydownHandler);
        this.element.removeEventListener('click', this._clickHandler);
        this.element.removeEventListener('mouseenter', this._mouseenterHandler);
        this.element.removeEventListener('mouseleave', this._mouseleaveHandler);
    }

    /**
     * Mouseenter handler. Clears hide timeout.
     *
     * @returns {void}
     * @private
     */
    _mouseenterHandler() {
        // Reset hide timeout handler
        clearTimeout(this.timeoutHandler);
        this.timeoutHandler = null;
    }

    /**
     * Mouseleave handler. Hides dialog if we aren't creating the first one.
     *
     * @returns {void}
     * @private
     */
    _mouseleaveHandler() {
        if (!this._inCreateMode()) {
            this.hide();
        }
    }

    /**
     * Keydown handler for dialog.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _keydownHandler(event) {
        event.stopPropagation();

        const key = decodeKeydown(event);
        if (key === 'Escape') {
            this.hide(true); // hide without delay
            return;
        }

        const dataType = annotatorUtil.findClosestDataType(event.target);
        if (dataType === 'reply-textarea') {
            this._activateReply();
        }
    }

    /**
     * Click handler on dialog.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _clickHandler(event) {
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

    /**
     * Posts an annotation in the dialog.
     *
     * @returns {void}
     * @private
     */
    _postAnnotation() {
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
        const replyTextEl = this.element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
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
        const replyTextEl = this.element.querySelector(constants.SELECTOR_REPLY_TEXTAREA);
        const replyButtonEls = replyTextEl.parentNode.querySelector(constants.SELECTOR_BUTTON_CONTAINER);
        annotatorUtil.resetTextarea(replyTextEl);
        annotatorUtil.hideElement(replyButtonEls);
        replyTextEl.focus();
    }

    /**
     * Posts a reply in the dialog.
     *
     * @returns {void}
     * @private
     */
    _postReply() {
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
     * @param {String} annotationID ID of annotation to delete
     * @returns {void}
     * @private
     */
    _showDeleteConfirmation(annotationID) {
        const annotationEl = this.element.querySelector(`[data-annotation-id="${annotationID}"]`);
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
        const annotationEl = this.element.querySelector(`[data-annotation-id="${annotationID}"]`);
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

    /**
     * Returns whether the dialog is in create mode.
     *
     * @returns {Boolean} Whether dialog is in 'create' mode or not
     * @private
     */
    _inCreateMode() {
        const createSectionEl = this.element.querySelector('[data-section="create"]');
        return !createSectionEl.classList.contains(CLASS_HIDDEN);
    }
}

export default AnnotationDialog;
