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
import { ICON_HIGHLIGHT, ICON_HIGHLIGHT_COMMENT } from '../icons/icons';

const CLASS_HIGHLIGHT_DIALOG = 'box-preview-highlight-dialog';
const HIGHLIGHT_COMMENTS_DIALOG_WIDTH = 282;
const HIGHLIGHT_BUTTONS_DIALOG_WIDTH = 81;
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
            const isTextHighlighted = this._element.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            if (!isTextHighlighted) {
                this._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            }
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

        const highlightDialogWidth = this._hasComments ? HIGHLIGHT_COMMENTS_DIALOG_WIDTH : HIGHLIGHT_BUTTONS_DIALOG_WIDTH;

        // Make sure button dialog doesn't go off the page
        let dialogX = browserX - highlightDialogWidth / 2; // Center 81px button
        let dialogY = browserY + 10; // Caret + some padding
        if (dialogX < 0) {
            dialogX = 0;
        } else if (dialogX + highlightDialogWidth > pageWidth) {
            dialogX = pageWidth - highlightDialogWidth;
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
        annotatorUtil.showElement(this._element);
    }

    /**
     * Toggles between the highlight annotations buttons dialog and the
     * highlight comments dialog. Dialogs are toggled based on whether the
     * highlight annotation has text comments or not.
     *
     * @return {void}
     */
    toggleHighlightDialogs() {
        const highlightDialogEl = this._element.querySelector('.box-preview-annotation-highlight-dialog');
        const commentsDialogEl = this._element.querySelector('.annotation-container');
        const commentsDialogIsHidden = commentsDialogEl.classList.contains(CLASS_HIDDEN);

        // Displays comments dialog and hides highlight annotations button
        if (commentsDialogIsHidden) {
            this._element.classList.remove(CLASS_HIGHLIGHT_DIALOG);
            annotatorUtil.hideElement(highlightDialogEl);

            this._element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            annotatorUtil.showElement(commentsDialogEl);
            this._hasComments = true;

        // Displays the highlight and comment buttons dialog and hides the
        // comments dialog
        } else {
            this._element.classList.remove(constants.CLASS_ANNOTATION_DIALOG);
            annotatorUtil.hideElement(commentsDialogEl);

            this._element.classList.add(CLASS_HIGHLIGHT_DIALOG);
            annotatorUtil.showElement(highlightDialogEl);
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
     * @return {void}
     */
    toggleHighlightCommentsReply(hasAnnotations) {
        const commentsDialogEl = this._element.querySelector('.annotation-container');
        const replyTextEl = commentsDialogEl.querySelector("[data-section='create']");
        const commentTextEl = commentsDialogEl.querySelector("[data-section='show']");

        // Ensures that "Add a comment here" text area is shown
        if (hasAnnotations) {
            annotatorUtil.hideElement(replyTextEl);
            annotatorUtil.showElement(commentTextEl);
            this._deactivateReply();

            // Focuses text area in comments dialog
            const textAreaEl = this._element.querySelector(constants.SELECTOR_ANNOTATION_TEXTAREA);
            if (annotatorUtil.isElementInViewport(textAreaEl)) {
                textAreaEl.focus();
            }

        // Ensures that "Reply" text area is shown
        } else {
            annotatorUtil.hideElement(commentTextEl);
            annotatorUtil.showElement(replyTextEl);
            this._activateReply();
        }

        // Reposition dialog
        this.position();
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
        this._element = document.createElement('div');

        // Determine if highlight buttons or comments dialog will display
        this._hasComments = (annotations.length && annotations[0].text);
        const dialogTypeClass = this._hasComments ? constants.CLASS_ANNOTATION_DIALOG : CLASS_HIGHLIGHT_DIALOG;
        this._element.classList.add(dialogTypeClass);

        // Indicate that text is highlighted in the highlight buttons dialog
        if (annotations.length) {
            this._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
        }

        this._element.innerHTML = `
            <div class="box-preview-annotation-caret"></div>
            <div class="box-preview-annotation-highlight-dialog ${this._hasComments ? CLASS_HIDDEN : ''}">
                <button class="box-preview-btn-plain box-preview-add-highlight-btn"
                    data-type="highlight-btn"
                    title="${__('annotation_highlight_toggle')}">
                    ${ICON_HIGHLIGHT}
                </button>
                <button class="box-preview-btn-plain box-preview-highlight-comment-btn"
                    data-type="add-highlight-comment-btn"
                    title="${__('annotation_highlight_comment')}">
                    ${ICON_HIGHLIGHT_COMMENT}
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
        this._element.addEventListener('mousedown', this.mousedownHandler);
        this._element.addEventListener('mouseup', this.mouseupHandler);
        this._element.addEventListener('keydown', this.keydownHandler);
        this._element.addEventListener('mouseenter', this.mouseenterHandler);
        this._element.addEventListener('mouseleave', this.mouseleaveHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @override
     * @returns {void}
     * @protected
     */
    unbindDOMListeners() {
        this._element.removeEventListener('mousedown', this.mousedownHandler);
        this._element.removeEventListener('mouseup', this.mouseupHandler);
        this._element.removeEventListener('keydown', this.keydownHandler);
        this._element.removeEventListener('mouseenter', this.mouseenterHandler);
        this._element.removeEventListener('mouseleave', this.mouseleaveHandler);
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
            this.mousedownHandler(event);
        }
        super.keydownHandler(event);
    }

    /**
     * Mousedown handler on dialog.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @protected
     */
    mousedownHandler(event) {
        event.stopPropagation();
        const dataType = annotatorUtil.findClosestDataType(event.target);

        switch (dataType) {
            // Clicking 'Highlight' button to create or remove a highlight
            case 'highlight-btn':
                this._toggleHighlight();
                break;

            // Clicking 'Highlight' button to create a highlight
            case 'add-highlight-comment-btn':
                this.emit('annotationdraw');
                this.toggleHighlightCommentsReply(false);
                this.toggleHighlightDialogs();
                break;

            default:
                super.clickHandler(event);
                break;
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Saves or deletes the highlight annotation based on the current state of
     * the highlight
     *
     * @returns {void}
     * @private
     */
    _toggleHighlight() {
        const isTextHighlighted = this._element.classList.contains(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);

        // Creates a blank highlight annotation
        if (!isTextHighlighted) {
            this._hasComments = false;
            this._element.classList.add(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            this.emit('annotationcreate');

        // Deletes blank highlight annotation
        } else {
            this._hasComments = true;
            this._element.classList.remove(constants.CLASS_ANNOTATION_TEXT_HIGHLIGHTED);
            this.emit('annotationdelete');
        }
    }
}

export default DocHighlightDialog;
