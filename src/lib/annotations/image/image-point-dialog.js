/**
 * @fileoverview The image point dialog class manages a image annotation
 * dialog's HTML, event handlers, and events.
 * @author spramod
 */

import AnnotationDialog from '../annotation-dialog';
import autobind from 'autobind-decorator';
import * as annotatorUtil from '../annotator-util';
import * as imageAnnotatorUtil from './image-annotator-util';

const PAGE_PADDING_TOP = 15;
const POINT_ANNOTATION_ICON_HEIGHT = 31;
const POINT_ANNOTATION_ICON_DOT_HEIGHT = 8;

@autobind
class ImagePointDialog extends AnnotationDialog {

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
        const [browserX, browserY] = imageAnnotatorUtil.getBrowserCoordinatesFromLocation(this._location, this._annotatedElement);

        // Show dialog so we can get width
        this._annotatedElement.appendChild(this._element);
        annotatorUtil.showElement(this._element);
        const dialogDimensions = this._element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - (dialogWidth / 2);

        // Position 7px below location and transparent border pushes it down
        // further - this coordinate is with respect to the page
        const dialogTopY = browserY + 7;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        dialogLeftX = this._repositionCaret(dialogLeftX, dialogWidth, browserX);

        // Position the dialog
        this._element.style.left = `${dialogLeftX}px`;
        this._element.style.top = `${dialogTopY + PAGE_PADDING_TOP - POINT_ANNOTATION_ICON_HEIGHT + POINT_ANNOTATION_ICON_DOT_HEIGHT}px`;
    }

    /**
     * Repositions caret if annotations dialog will run off the right or left
     * side of the page. Otherwise positions caret at the center of the
     * annotations dialog and the updated left corner x coordinate.
     * @param  {number} dialogX Left corner x coordinate of the annotations dialog
     * @param  {number} dialogWidth Width of the annotations dialog
     * @param  {number} browserX X coordinate of the mouse position
     * @return {number} Adjusted left corner x coordinate of the annotations dialog
     */
    _repositionCaret(dialogX, dialogWidth, browserX) {
        const annotationCaretEl = this._element.querySelector('.box-preview-annotation-caret');

        // Get image tag inside viewer
        const imageEl = this._annotatedElement.querySelector('img');
        if (!imageEl) {
            return dialogX;
        }

        const largerWidth = (imageEl.clientWidth > this._annotatedElement.clientWidth) ? imageEl.clientWidth : this._annotatedElement.clientWidth;

        // Reposition to avoid sides - left side of page is 0px, right side is
        // ${wrapperWidth}px
        const dialogPastLeft = dialogX < 0;
        const dialogPastRight = dialogX + dialogWidth > largerWidth;

        if (dialogPastLeft && !dialogPastRight) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretLeftX = Math.max(10, browserX);
            annotationCaretEl.style.left = `${caretLeftX}px`;

            return 0;

        // Fix the dialog and move caret appropriately
        } else if (dialogPastRight && !dialogPastLeft) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretRightX = Math.max(10, largerWidth - browserX);

            // We set the 'left' property even when we have caretRightX for IE10/11
            annotationCaretEl.style.left = `${dialogWidth - caretRightX}px`;

            return largerWidth - dialogWidth;
        }

        // Reset caret to center
        annotationCaretEl.style.left = '50%';
        return dialogX;
    }
}

export default ImagePointDialog;
