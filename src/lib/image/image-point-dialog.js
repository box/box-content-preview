/**
 * @fileoverview The image point dialog class manages a image annotation
 * dialog's HTML, event handlers, and events.
 * @author spramod
 */

import AnnotationDialog from '../annotation/annotation-dialog';
import autobind from 'autobind-decorator';
import * as annotatorUtil from '../annotation/annotator-util';
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
        const wrapperDimensions = this._annotatedElement.getBoundingClientRect();
        const wrapperWidth = wrapperDimensions.width;

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - dialogWidth / 2;

        // Position 7px below location and transparent border pushes it down
        // further - this coordinate is with respect to the page
        const dialogTopY = browserY + 7;

        // Reposition to avoid sides - left side of page is 0px, right side is ${wrapperWidth}px
        const dialogPastLeft = dialogLeftX < 0;
        const dialogPastRight = dialogLeftX + dialogWidth > wrapperWidth;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        const annotationCaretEl = this._element.querySelector('.box-preview-annotation-caret');
        if (dialogPastLeft && !dialogPastRight) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretLeftX = Math.max(10, browserX);
            annotationCaretEl.style.left = `${caretLeftX}px`;

            dialogLeftX = 0;

        // Fix the dialog and move caret appropriately
        } else if (dialogPastRight && !dialogPastLeft) {
            // Leave a minimum of 10 pixels so caret doesn't go off edge
            const caretRightX = Math.max(10, wrapperWidth - browserX);

            // We set the 'left' property even when we have caretRightX for IE10/11
            annotationCaretEl.style.left = `${dialogWidth - caretRightX}px`;

            dialogLeftX = wrapperWidth - dialogWidth;

        // Reset caret to center
        } else {
            annotationCaretEl.style.left = '50%';
        }

        // Position the dialog
        this._element.style.left = `${dialogLeftX}px`;
        this._element.style.top = `${dialogTopY + PAGE_PADDING_TOP - POINT_ANNOTATION_ICON_HEIGHT + POINT_ANNOTATION_ICON_DOT_HEIGHT}px`;
    }
}

export default ImagePointDialog;
