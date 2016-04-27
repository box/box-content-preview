/**
 * @fileoverview The highlight dialog class manages a simple dialog for
 * highlight threads that contains either an add or delete button and
 * broadcasts events.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationDialog from '../annotation/annotation-dialog';
import Browser from '../browser';

import * as annotatorUtil from '../annotation/annotator-util';
import { decodeKeydown } from '../util.js';

import { CLASS_HIDDEN } from '../constants';
import { ICON_DELETE, ICON_HIGHLIGHT } from '../icons/icons';

const HIGHLIGHT_DIALOG_DIMENSIONS = 38;
const MOUSEDOWN = Browser.isMobile() ? 'touchstart' : 'mousedown';

@autobind
class HighlightDialog extends AnnotationDialog {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Positions and shows the dialog.
     *
     * @returns {void}
     */
    show() {
        // Position and show - we need to reposition every time since the DOM
        // could have changed from zooming
        this._position();
        annotatorUtil.showElement(this._element);
    }

    /**
     * Hides the dialog.
     *
     * @returns {void}
     */
    hide() {
        annotatorUtil.hideElement(this._element);
    }

    /**
     * Hides the dialog after the highlight is saved.
     *
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
     * No-op.
     *
     * @returns {void}
     */
    removeAnnotation() {}

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets up the dialog element.
     *
     * @returns {void}
     * @private
     */
    _setup(annotations) {
        this._element = document.createElement('div');
        this._element.classList.add('box-preview-highlight-dialog');
        this._element.innerHTML = `
            <div class="box-preview-annotation-caret"></div>
            <button class="box-preview-add-highlight-btn ${annotations.length ? CLASS_HIDDEN : ''}"
                data-type="add-highlight-btn">
                ${ICON_HIGHLIGHT}
            </button>
            <button class="box-preview-delete-highlight-btn ${annotations.length ? '' : CLASS_HIDDEN}"
                data-type="delete-highlight-btn">
                ${ICON_DELETE}
            </button>`.trim();

        this._bindDOMListeners();
    }

    /**
     * Positions the dialog.
     *
     * @returns {void}
     * @private
     */
    _position() {
        // Position it below lower right corner of the highlight - we need
        // to reposition every time since the DOM could have changed from
        // zooming
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`);
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;
        const pageHeight = pageDimensions.height;
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
        this._element.style.top = `${dialogY}px`;
        pageEl.appendChild(this._element);
    }

    /**
     * Binds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        this._element.addEventListener(MOUSEDOWN, this._mousedownHandler);
        this._element.addEventListener('keydown', this._mousedownHandler);
    }

    /**
     * Unbinds DOM event listeners.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        this._element.removeEventListener(MOUSEDOWN, this._mousedownHandler);
        this._element.removeEventListener('keydown', this._mousedownHandler);
    }

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
     * Keydown handler on dialog. Needed since we are binding to 'mousedown'
     * instead of 'click'.
     *
     * @returns {void}
     * @private
     */
    _keydownHandler(event) {
        event.stopPropagation();
        if (decodeKeydown(event) === 'Enter') {
            this._mousedownHandler(event);
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
     * Cancels posting an annotation.
     *
     * @returns {void}
     * @private
     */
    _deleteHighlight() {
        this.emit('annotationdelete');
    }
}

export default HighlightDialog;
