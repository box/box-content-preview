import autobind from 'autobind-decorator';
import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';

const POINT_ANNOTATION_ICON_HEIGHT = 31;
const POINT_ANNOTATION_ICON_WIDTH = 24;

@autobind
class ImagePointDialog extends AnnotationDialog {
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
        // Show dialog so we can get width
        this.annotatedElement.appendChild(this.element);
        annotatorUtil.showElement(this.element);
        const dialogDimensions = this.element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;

        // Get image tag inside viewer, based on page number. All images are page 1 by default.
        const imageEl = this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`);

        // Center middle of dialog with point - this coordinate is with respect to the page
        const threadIconLeftX = this.threadEl.offsetLeft + POINT_ANNOTATION_ICON_WIDTH / 2;
        let dialogLeftX = threadIconLeftX - dialogWidth / 2;

        // Adjusts Y position for transparent top border
        const dialogTopY = this.threadEl.offsetTop + POINT_ANNOTATION_ICON_HEIGHT;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        const pageWidth =
            imageEl.clientWidth > this.annotatedElement.clientWidth
                ? imageEl.clientWidth
                : this.annotatedElement.clientWidth;
        dialogLeftX = annotatorUtil.repositionCaret(this.element, dialogLeftX, dialogWidth, threadIconLeftX, pageWidth);

        // Position the dialog
        this.element.style.left = `${dialogLeftX}px`;

        const dialogPos = this.flipDialog(dialogTopY, this.container.clientHeight);
        this.element.style.top = dialogPos.top;
        this.element.style.bottom = dialogPos.bottom;
    }
}

export default ImagePointDialog;
