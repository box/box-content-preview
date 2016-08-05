/**
 * @fileoverview The doc point dialog class manages a document annotation
 * dialog's HTML, event handlers, and events.
 * @author tjin
 */

import AnnotationDialog from '../annotation/annotation-dialog';
import autobind from 'autobind-decorator';
import * as annotatorUtil from '../annotation/annotator-util';
import * as docAnnotatorUtil from './doc-annotator-util';

const PAGE_PADDING_TOP = 15;

@autobind
class DocPointDialog extends AnnotationDialog {

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
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`) || this._annotatedElement;
        const [browserX, browserY] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(this._location, this._annotatedElement);

        // Show dialog so we can get width
        pageEl.appendChild(this._element);
        annotatorUtil.showElement(this._element);
        const dialogDimensions = this._element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;
        const pageDimensions = pageEl.getBoundingClientRect();
        const pageWidth = pageDimensions.width;

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - dialogWidth / 2;
        const dialogTopY = browserY;

        // Reposition to avoid sides - left side of page is 0px, right side is ${pageWidth}px
        const dialogPastLeft = dialogLeftX < 0;
        const dialogPastRight = dialogLeftX + dialogWidth > pageWidth;

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
            const caretRightX = Math.max(10, pageWidth - browserX);

            // We set the 'left' property even when we have caretRightX for IE10/11
            annotationCaretEl.style.left = `${dialogWidth - caretRightX}px`;

            dialogLeftX = pageWidth - dialogWidth;

        // Reset caret to center
        } else {
            annotationCaretEl.style.left = '50%';
        }

        // Position the dialog
        this._element.style.left = `${dialogLeftX}px`;
        this._element.style.top = `${dialogTopY + PAGE_PADDING_TOP}px`;
    }
}

export default DocPointDialog;
