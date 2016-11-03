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

        // Get image tag inside viewer
        const imageEl = this._annotatedElement.querySelector('img');
        if (!imageEl) {
            return;
        }

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - (dialogWidth / 2);

        // Adjusts Y position for transparent top border
        const dialogTopY = browserY - 3;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        const pageWidth = (imageEl.clientWidth > this._annotatedElement.clientWidth) ? imageEl.clientWidth : this._annotatedElement.clientWidth;
        dialogLeftX = annotatorUtil.repositionCaret(this._element, dialogLeftX, dialogWidth, browserX, pageWidth);

        // Position the dialog
        this._element.style.left = `${dialogLeftX}px`;
        this._element.style.top = `${dialogTopY + PAGE_PADDING_TOP - POINT_ANNOTATION_ICON_HEIGHT + POINT_ANNOTATION_ICON_DOT_HEIGHT}px`;
    }
}

export default ImagePointDialog;
