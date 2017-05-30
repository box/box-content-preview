import autobind from 'autobind-decorator';
import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as imageAnnotatorUtil from './imageAnnotatorUtil';

const PAGE_PADDING_TOP = 15;
const POINT_ANNOTATION_ICON_HEIGHT = 31;
const POINT_ANNOTATION_ICON_DOT_HEIGHT = 8;

@autobind class ImagePointDialog extends AnnotationDialog {
    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Positions the dialog.
     *
     * @override
     * @return {void}
     */
    position() {
        const [browserX, browserY] = imageAnnotatorUtil.getBrowserCoordinatesFromLocation(
            this.location,
            this.annotatedElement
        );

        // Show dialog so we can get width
        this.annotatedElement.appendChild(this.element);
        annotatorUtil.showElement(this.element);
        const dialogDimensions = this.element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;

        // Get image tag inside viewer, based on page number. All images are page 1 by default.
        const imageEl =
            this.annotatedElement.querySelector(`[data-page-number="${this.location.page || 1}"]`) ||
            this.annotatedElement.querySelector('img');

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - dialogWidth / 2;

        // Adjusts Y position for transparent top border
        const dialogTopY = browserY + 7;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        const pageWidth = imageEl.clientWidth > this.annotatedElement.clientWidth
            ? imageEl.clientWidth
            : this.annotatedElement.clientWidth;
        dialogLeftX = annotatorUtil.repositionCaret(this.element, dialogLeftX, dialogWidth, browserX, pageWidth);

        // Position the dialog
        this.element.style.left = `${dialogLeftX}px`;
        this.element.style.top = `${dialogTopY + PAGE_PADDING_TOP - POINT_ANNOTATION_ICON_HEIGHT + POINT_ANNOTATION_ICON_DOT_HEIGHT}px`;
    }
}

export default ImagePointDialog;
