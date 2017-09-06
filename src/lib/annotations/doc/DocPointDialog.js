import autobind from 'autobind-decorator';
import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';
import { POINT_ANNOTATION_ICON_HEIGHT, POINT_ANNOTATION_ICON_WIDTH, PAGE_PADDING_TOP } from '../annotationConstants';

@autobind
class DocPointDialog extends AnnotationDialog {
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
        const pageEl =
            this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`) || this.annotatedElement;

        // Show dialog so we can get width
        pageEl.appendChild(this.element);
        annotatorUtil.showElement(this.element);
        const dialogDimensions = this.element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;
        const pageDimensions = pageEl.getBoundingClientRect();

        // Center middle of dialog with point - this coordinate is with respect to the page
        const threadIconLeftX = this.threadEl.offsetLeft + POINT_ANNOTATION_ICON_WIDTH / 2;
        let dialogLeftX = threadIconLeftX - dialogWidth / 2;

        // Adjusts Y position for transparent top border
        const dialogTopY = this.threadEl.offsetTop + POINT_ANNOTATION_ICON_HEIGHT / 2;

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        dialogLeftX = annotatorUtil.repositionCaret(
            this.element,
            dialogLeftX,
            dialogWidth,
            threadIconLeftX,
            pageDimensions.width
        );

        // Position the dialog
        this.element.style.left = `${dialogLeftX - 1}px`;

        const pageHeight = pageDimensions.height + PAGE_PADDING_TOP + POINT_ANNOTATION_ICON_HEIGHT;
        const dialogPos = this.flipDialog(dialogTopY, pageHeight);
        this.element.style.top = dialogPos.top;
        this.element.style.bottom = dialogPos.bottom;
    }
}

export default DocPointDialog;
