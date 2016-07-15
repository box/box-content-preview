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
import { ICON_DELETE, ICON_HIGHLIGHT, ICON_ANNOTATION } from '../icons/icons';

const HIGHLIGHT_DIALOG_DIMENSIONS = 38;
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
     * @returns {void}
     */
    show() {
        // If user cannot annotate, don't show dialog
        if (!this._canAnnotate) {
            return;
        }

        // Position and show - we need to reposition every time since the DOM
        // could have changed from zooming
        this.position();
        annotatorUtil.showElement(this._element);
    }

    /**
     * Hides the dialog.
     *
     * @override
     * @returns {void}
     */
    hide() {
        annotatorUtil.hideElement(this._element);
    }

    /**
     * Hides the dialog after the highlight is saved.
     *
     * @override
     * @returns {void}
     */
    addAnnotation(annotation) {
        if (annotation) {
            super.addAnnotation(annotation);
        } else {
            // Switch add button to delete button
            const addButtonEl = this._element.querySelector('.box-preview-add-highlight-btn');
            const deleteButtonEl = this._element.querySelector('.box-preview-delete-highlight-btn');
            annotatorUtil.hideElement(addButtonEl);
            annotatorUtil.showElement(deleteButtonEl);
        }
    }

    /**
     * No-op when removing an annotation since highlights only have one
     * annotation.
     *
     * @override
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
        // Position it below lower right corner of the highlight - we need
        // to reposition every time since the DOM could have changed from
        // zooming
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`);
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;
        const pageHeight = pageDimensions.height - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM;
        const zoomScale = annotatorUtil.getScale(this._annotatedElement);
        let [x, y] = docAnnotatorUtil.getLowerRightCornerOfLastQuadPoint(this._location.quadPoints);

        // If needed, scale coords comparing current dimensions with saved dimensions
        const dimensionScale = docAnnotatorUtil.getDimensionScale(this._location.dimensions, pageDimensions, zoomScale);
        if (dimensionScale) {
            x *= dimensionScale.x;
            y *= dimensionScale.y;
        }

        const [browserX, browserY] = docAnnotatorUtil.convertPDFSpaceToDOMSpace([x, y], pageHeight, zoomScale);

        // Make sure button dialog doesn't go off the page
        let dialogX = browserX - 19; // Center 38px button
        let dialogY = browserY + 10; // Caret + some padding
        if (dialogX < 0) {
            dialogX = 0;
        } else if (dialogX + HIGHLIGHT_DIALOG_DIMENSIONS > pageWidth) {
            dialogX = pageWidth - HIGHLIGHT_DIALOG_DIMENSIONS;
        }

        if (dialogY < 0) {
            dialogY = 0;
        } else if (dialogY + HIGHLIGHT_DIALOG_DIMENSIONS > pageHeight) {
            dialogY = pageHeight - HIGHLIGHT_DIALOG_DIMENSIONS;
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
        this._element.classList.add('box-preview-highlight-dialog');
        this._element.innerHTML = `
            <div class="box-preview-annotation-caret"></div>
            <div class="box-preview-annotation-highlight-dialog">
                <button class="box-preview-btn-plain box-preview-add-highlight-btn ${annotations.length ? CLASS_HIDDEN : ''}"
                    data-type="add-highlight-btn">
                    ${ICON_HIGHLIGHT}
                </button>
                <button class="box-preview-btn-plain box-preview-add-highlight-btn"
                    data-type="add-highlight-comment-btn">
                    ${ICON_ANNOTATION}
                </button>
                <button class="box-preview-btn-plain box-preview-delete-highlight-btn ${annotations.length ? '' : CLASS_HIDDEN}"
                    data-type="delete-highlight-btn">
                    ${ICON_DELETE}
                </button>
            </div>
            <div class="annotation-container ${CLASS_HIDDEN}">
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

    toggleHighlightDialogs() {
        const buttonsDialog = this._element.querySelector('.box-preview-annotation-highlight-dialog');
        const commentsDialog = this._element.querySelector('.annotation-container');

        // Displays comments dialog and hides highlight annotations button
        if (commentsDialog.classList.contains(CLASS_HIDDEN)) {
            // moves up the position of the comments dialog to be in place of the buttons dialog

            this._element.classList.remove('box-preview-highlight-dialog');
            buttonsDialog.classList.add(CLASS_HIDDEN);

            this._element.classList.add(constants.CLASS_ANNOTATION_DIALOG);
            commentsDialog.classList.remove(CLASS_HIDDEN);
        } else { // Displays annotations delete button and hides comment dialog
            this._element.classList.remove(constants.CLASS_ANNOTATION_DIALOG);
            commentsDialog.classList.add(CLASS_HIDDEN);

            this._element.classList.add('box-preview-highlight-dialog');
            buttonsDialog.classList.remove(CLASS_HIDDEN);

            // swap listeners
            super.unbindDOMListeners();
        }
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

        // super.bindDOMListeners();
        this._element.addEventListener('keydown', super.keydownHandler);
        this._element.addEventListener('click', this._clickHandler);
        this._element.addEventListener('mouseup', super._mouseupHandler);
        this._element.addEventListener('mouseenter', super._mouseenterHandler);
        this._element.addEventListener('mouseleave', super._mouseleaveHandler);
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

        // super.unbindDOMListeners();
        this._element.removeEventListener('keydown', this.keydownHandler);
        this._element.removeEventListener('click', this._clickHandler);
        this._element.removeEventListener('mouseup', this._mouseupHandler);
        this._element.removeEventListener('mouseenter', this._mouseenterHandler);
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
            // Clicking 'Highlight' button to create a highlight
            case 'add-highlight-btn':
                this._addHighlight();
                break;

            // Clicking 'Highlight' button to create a highlight
            case 'add-highlight-comment-btn':
                this.toggleHighlightDialogs();
                break;

            // Clicking 'Trash' button to delete the highlight
            case 'delete-highlight-btn':
                this._deleteHighlight();
                break;

            default:
                break;
        }
    }

    /**
     * Saves the highlight.
     *
     * @returns {void}
     * @private
     */
    _addHighlight() {
        this.emit('annotationcreate');
    }

    /**
     * Deletes the highlight.
     *
     * @returns {void}
     * @private
     */
    _deleteHighlight() {
        this.emit('annotationdelete');
    }

    /**
     * Broadcasts message to delete an annotation.
     *
     * @param {String} annotationID ID of annotation to delete
     * @returns {void}
     * @private
     */
    _deleteAnnotation(annotationID) {
        super._deleteAnnotation(annotationID);

        // If no other comments exist on the thread
        if (!this._hasAnnotations) {
            this.toggleHighlightDialogs();
        }
    }

    _deactivateReply() {
        super._deactivateReply();

        // If no other comments exist on the thread
        if (!this._hasAnnotations) {
            this.toggleHighlightDialogs();
        }
    }
}

export default DocHighlightDialog;
