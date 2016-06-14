/**
 * @fileoverview The highlight dialog class manages a simple dialog for
 * highlight threads that contains either an add or delete button and
 * broadcasts events.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationDialog from '../annotation/annotation-dialog';
import * as annotatorUtil from '../annotation/annotator-util';
import { CLASS_HIDDEN } from '../constants';
import { decodeKeydown } from '../util.js';
import { ICON_DELETE, ICON_HIGHLIGHT } from '../icons/icons';

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
    addAnnotation() {
        // Switch add button to delete button
        const addButtonEl = this._element.querySelector('.box-preview-add-highlight-btn');
        const deleteButtonEl = this._element.querySelector('.box-preview-delete-highlight-btn');
        annotatorUtil.hideElement(addButtonEl);
        annotatorUtil.showElement(deleteButtonEl);
    }

    /**
     * No-op when removing an annotation since highlights only have one
     * annotation.
     *
     * @override
     * @returns {void}
     */
    removeAnnotation() {}

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
        const scale = annotatorUtil.getScale(this._annotatedElement);
        const coordinates = annotatorUtil.getLowerRightCornerOfLastQuadPoint(this._location.quadPoints);
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace(coordinates, pageHeight, scale);

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
        this._element = document.createElement('div');
        this._element.classList.add('box-preview-highlight-dialog');
        this._element.innerHTML = `
            <div class="box-preview-annotation-caret"></div>
            <button class="box-preview-btn-plain box-preview-add-highlight-btn ${annotations.length ? CLASS_HIDDEN : ''}"
                data-type="add-highlight-btn">
                ${ICON_HIGHLIGHT}
            </button>
            <button class="box-preview-btn-plain box-preview-delete-highlight-btn ${annotations.length ? '' : CLASS_HIDDEN}"
                data-type="delete-highlight-btn">
                ${ICON_DELETE}
            </button>`.trim();

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
}

export default DocHighlightDialog;
