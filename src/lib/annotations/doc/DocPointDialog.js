import autobind from 'autobind-decorator';
import AnnotationDialog from '../AnnotationDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as docAnnotatorUtil from './docAnnotatorUtil';

const PAGE_PADDING_TOP = 15;
const POINT_ANNOTATION_ICON_DOT_HEIGHT = 8;

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
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`) || this.annotatedElement;
        const [browserX, browserY] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(this.location, this.annotatedElement);

        // Show dialog so we can get width
        pageEl.appendChild(this.element);
        annotatorUtil.showElement(this.element);
        const dialogDimensions = this.element.getBoundingClientRect();
        const dialogWidth = dialogDimensions.width;
        const pageDimensions = pageEl.getBoundingClientRect();

        // Center middle of dialog with point - this coordinate is with respect to the page
        let dialogLeftX = browserX - (dialogWidth / 2);
        const dialogTopY = browserY - (POINT_ANNOTATION_ICON_DOT_HEIGHT / 2);

        // Only reposition if one side is past page boundary - if both are,
        // just center the dialog and cause scrolling since there is nothing
        // else we can do
        dialogLeftX = annotatorUtil.repositionCaret(this.element, dialogLeftX, dialogWidth, browserX, pageDimensions.width);

        // Position the dialog
        this.element.style.left = `${dialogLeftX}px`;
        this.element.style.top = `${dialogTopY + PAGE_PADDING_TOP}px`;
        docAnnotatorUtil.fitDialogHeightInPage(this.annotatedElement, this.element, pageDimensions.height, dialogTopY);
    }
}

export default DocPointDialog;
