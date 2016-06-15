/**
 * @fileoverview The image point dialog class manages a image annotation
 * dialog's HTML, event handlers, and events.
 * @author spramod
 */

import AnnotationDialog from '../annotation/annotation-dialog';
import autobind from 'autobind-decorator';
import * as annotatorUtil from '../annotation/annotator-util';

const PAGE_PADDING_TOP = 15;

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
        const imageEl = this._annotatedElement;
        const browserX = this._location.x;
        const browserY = this._location.y;

        // Show dialog so we can get width
        imageEl.appendChild(this._element);
        annotatorUtil.showElement(this._element);
        const dialogDimensions = this._element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;
        const imageDimensions = imageEl.getBoundingClientRect();
        const imageWidth = imageDimensions.width;

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - dialogWidth / 2;

        // Position 7px below location and transparent border pushes it down
        // further - this coordinate is with respect to the page
        const dialogTopY = browserY + 7;

        // Reposition to avoid sides - left side of page is 0px, right side is ${imageWidth}px
        const dialogPastLeft = dialogLeftX < 0;
        const dialogPastRight = dialogLeftX + dialogWidth > imageWidth;

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
            const caretRightX = Math.max(10, imageWidth - browserX);

            // We set the 'left' property even when we have caretRightX for IE10/11
            annotationCaretEl.style.left = `${dialogWidth - caretRightX}px`;

            dialogLeftX = imageWidth - dialogWidth;

        // Reset caret to center
        } else {
            annotationCaretEl.style.left = '50%';
        }

        // Position the dialog
        this._element.style.left = `${dialogLeftX}px`;
        this._element.style.top = `${dialogTopY + PAGE_PADDING_TOP}px`;
    }
}

export default ImagePointDialog;
