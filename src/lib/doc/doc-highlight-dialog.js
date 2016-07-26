/**
 * @fileoverview The highlight dialog class manages a simple dialog for
 * highlight threads that contains either an add or delete button and
 * broadcasts events.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationDialog from '../annotation/annotation-dialog';
import * as annotatorUtil from '../annotation/annotator-util';
import * as docAnnotatorUtil from './doc-annotator-util';
import { CLASS_HIDDEN, CLASS_ACTIVE } from '../constants';
import * as constants from '../annotation/annotation-constants.js';
import { decodeKeydown } from '../util.js';
import { ICON_HIGHLIGHT, ICON_ANNOTATION_HIGHLIGHT_COMMENT } from '../icons/icons';

const HIGHLIGHT_DIALOG_WIDTH = 81;
const HIGHLIGHT_DIALOG_HEIGHT = 38;
const HIGHLIGHT_BORDER_TOP = 20;
const PAGE_PADDING_BOTTOM = 15;
const PAGE_PADDING_TOP = 15;

@autobind
class DocHighlightDialog extends AnnotationDialog {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Positions and shows the dialog.
     *
     * @override
     * @param {Object} [annotation] Optional annotation object
     * @returns {void}
     */
    show() {
        annotatorUtil.showElement(this._element);
        super.show();
    }

    /**
     * Saves an annotation with the associated text or blank if only
     * highlighting. Only adds an annotation to the dialog if it contains text.
     * The annotation is still added to the thread on the server side.
     *
     * @override
     * @param {string} [annotationID] Optional annotationID to remove
     * @returns {void}
     */
    addAnnotation(annotation) {
        if (annotation) {
            super.addAnnotation(annotation);
        } else {
            const addButtonEl = this._element.querySelector('.box-preview-add-highlight-btn');
            const isTextHighlighted = addButtonEl.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            if (!isTextHighlighted) {
                addButtonEl.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            }
        }
    }

    /**
     * Removes annotation indicated by annotationID if provided, else no-op since
     * plain highlights only have one annotation.
     *
     * @override
     * @param {string} [annotationID] Optional annotationID to delete
     * @returns {void}
     */
    removeAnnotation(annotationID) {
        if (annotationID) {
            super.removeAnnotation(annotationID);
        }
    }

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Positions the dialog.
     *
     * @override
     * @returns {void}
     */
    position() {
        // Position it below lower right corner or center of the highlight - we need
        // to reposition every time since the DOM could have changed from
        // zooming
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`);
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const zoomScale = annotatorUtil.getScale(this._annotatedElement);
        let [x, y] = this._hasComments ? docAnnotatorUtil.getLowerCenterPoint(this._location.quadPoints) :
            docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint(this._location.quadPoints);

        // If needed, scale coords comparing current dimensions with saved dimensions
        const dimensionScale = docAnnotatorUtil.getDimensionScale(this._location.dimensions, pageDimensions, zoomScale);
        if (dimensionScale) {
            x *= dimensionScale.x;
            y *= dimensionScale.y;
        }

        const [browserX, browserY] = docAnnotatorUtil.convertPDFSpaceToDOMSpace([x, y], pageHeight, zoomScale);

        // Make sure button dialog doesn't go off the page
        let dialogX = browserX - HIGHLIGHT_DIALOG_WIDTH / 2; // Center 81px button
        let dialogY = browserY + 10; // Caret + some padding
        if (dialogX < 0) {
            dialogX = 0;
        } else if (dialogX + HIGHLIGHT_DIALOG_WIDTH > pageWidth) {
            dialogX = pageWidth - HIGHLIGHT_DIALOG_WIDTH;
        }

        if (dialogY < 0) {
            dialogY = 0;
        } else if (dialogY + HIGHLIGHT_DIALOG_HEIGHT > pageHeight) {
            dialogY = pageHeight - HIGHLIGHT_DIALOG_HEIGHT;
        }

        // Remove extra transparent border top if showing comments dialog
        if (this._hasComments) {
            dialogY -= HIGHLIGHT_BORDER_TOP;
        }

        this._element.style.left = `${dialogX}px`;
        this._element.style.top = `${dialogY + PAGE_PADDING_TOP}px`;
        pageEl.appendChild(this._element);
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Sets up the dialog element.
     *
     * @override
     * @returns {void}
     * @protected
     */
    setup(annotations) {
        this.emit('annotationcreate');
        this._element = document.createElement('div');

        // Determine if highlight buttons or comments dialog will display
        this._hasComments = (annotations.length && annotations[0].text);
        const dialogTypeClass = this._hasComments ? constants.CLASS_ANNOTATION_DIALOG : 'box-preview-highlight-dialog';
        this._element.classList.add(dialogTypeClass);

        this._element.innerHTML = `
            <div class="box-preview-annotation-caret"></div>
            <div class="box-preview-annotation-highlight-dialog ${this._hasComments ? CLASS_HIDDEN : ''}">
                <button class="box-preview-btn-plain box-preview-add-highlight-btn ${annotations.length ? constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED : ''}"
                    data-type="highlight-btn"
                    title="${__('annotation_highlight_toggle')}">
                    ${ICON_HIGHLIGHT}
                </button>
                <button class="box-preview-btn-plain box-preview-highlight-comment-btn"
                    data-type="add-highlight-comment-btn"
                    title="${__('annotation_highlight_comment')}">
                    ${ICON_ANNOTATION_HIGHLIGHT_COMMENT}
                </button>
            </div>
            <div class="annotation-container ${this._hasComments ? '' : CLASS_HIDDEN}">
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
     * @override
     * @returns {void}
     * @protected
     */
    bindDOMListeners() {
        this._element.addEventListener('mousedown', this._mousedownHandler);
        this._element.addEventListener('mouseup', this._mouseupHandler);
        this._element.addEventListener('keydown', this._mousedownHandler);

        // Handlers for comments dialog
        this._element.addEventListener('click', this._clickHandler);
        this._element.addEventListener('mouseleave', this._mouseleaveHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @override
     * @returns {void}
     * @protected
     */
    unbindDOMListeners() {
        this._element.removeEventListener('mousedown', this._mousedownHandler);
        this._element.removeEventListener('mouseup', this._mouseupHandler);
        this._element.removeEventListener('keydown', this._mousedownHandler);

        // Handlers for comments dialog
        this._element.removeEventListener('click', this._clickHandler);
        this._element.removeEventListener('mouseleave', this._mouseleaveHandler);
    }

    /**
     * Keydown handler on dialog. Needed since we are binding to 'mousedown'
     * instead of 'click'.
     *
     * @override
     * @returns {void}
     * @protected
     */
    keydownHandler(event) {
        event.stopPropagation();
        if (decodeKeydown(event) === 'Enter') {
            this._mousedownHandler(event);
        }
        super.keydownHandler(event);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Mousedown handler on dialog.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _mousedownHandler(event) {
        event.stopPropagation();
        const dataType = annotatorUtil.findClosestDataType(event.target);

        switch (dataType) {
            // Clicking 'Highlight' button to create or remove a highlight
            case 'highlight-btn':
                this._toggleHighlight();
                break;

            // Clicking 'Highlight' button to create a highlight
            case 'add-highlight-comment-btn':
                this._toggleHighlightCommentsReply(false);
                this._toggleHighlightDialogs();
                break;

            default:
                break;
        }
    }

    /**
     * Saves or deletes the highlight annotation based on the current state of
     * the highlight
     *
     * @returns {void}
     * @private
     */
    _toggleHighlight() {
        const addButtonEl = this._element.querySelector('.box-preview-add-highlight-btn');
        const isTextHighlighted = addButtonEl.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

        if (!isTextHighlighted) {
            this._hasComments = false;
            addButtonEl.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            this.emit('annotationcreate');
        } else {
            this._hasComments = true;
            addButtonEl.classList.remove(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            this.emit('annotationdelete');
        }
    }

    /**
     * Toggles between the highlight annotations buttons dialog and the
     * highlight comments dialog. Dialogs are toggled based on whether the
     * highlight annotation has text comments or not.
     *
     * @return {void}
     * @private
     */
    _toggleHighlightDialogs() {
        const highlightDialogEl = this._element.querySelector('.box-preview-annotation-highlight-dialog');
        const commentsDialogEl = this._element.querySelector('.annotation-container');
        const commentsDialogIsHidden = commentsDialogEl.classList.contains(CLASS_HIDDEN);

        // Displays comments dialog and hides highlight annotations button
        if (commentsDialogIsHidden) {
            this._element.classList.remove('box-preview-highlight-dialog');
            highlightDialogEl.classList.add(CLASS_HIDDEN);

            this._element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            commentsDialogEl.classList.remove(CLASS_HIDDEN);
            this._hasComments = true;

        // Displays the highlight and comment buttons dialog and hides the
        // comments dialog
        } else {
            this._element.classList.remove(constants.CLASS_ANNOTATION_DIALOG);
            commentsDialogEl.classList.add(CLASS_HIDDEN);

            this._element.classList.add('box-preview-highlight-dialog');
            highlightDialogEl.classList.remove(CLASS_HIDDEN);
            this._hasComments = false;
        }

        // Reposition dialog
        this.position();
    }

    /**
     * Toggles between the "Add a comment here" and "Reply" text areas in the
     * comments dialog. This accounts for when a blank highlight is created and
     * then the user tries to add a comment after the fact.
     *
     * @TODO(spramod): Remove if decision is made on highlights without comments
     * @return {void}
     * @private
     */
    _toggleHighlightCommentsReply(hasAnnotations) {
        const commentsDialogEl = this._element.querySelector('.annotation-container');
        const replyTextEl = commentsDialogEl.querySelector("[data-section='create']");
        const commentTextEl = commentsDialogEl.querySelector("[data-section='show']");

        if (hasAnnotations) {
            replyTextEl.classList.add(CLASS_HIDDEN);
            commentTextEl.classList.remove(CLASS_HIDDEN);
        } else {
            commentTextEl.classList.add(CLASS_HIDDEN);
            replyTextEl.classList.remove(CLASS_HIDDEN);
        }

        // Reposition dialog
        this.position();
    }
}

export default DocHighlightDialog;
