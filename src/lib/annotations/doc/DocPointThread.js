import autobind from 'autobind-decorator';
import AnnotationThread from '../AnnotationThread';
import DocPointDialog from './DocPointDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as docAnnotatorUtil from './docAnnotatorUtil';
import { STATES, POINT_ANNOTATION_ICON_HEIGHT, PAGE_PADDING_TOP } from '../annotationConstants';

@autobind
class DocPointThread extends AnnotationThread {
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Shows the appropriate annotation dialog for this thread.
     *
     * @override
     * @return {void}
     */
    showDialog() {
        // Don't show dialog if user can annotate and there is a current selection
        if (this.permissions.canAnnotate && docAnnotatorUtil.isSelectionPresent()) {
            return;
        }

        super.showDialog();
    }

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Shows the annotation indicator.
     *
     * @override
     * @return {void}
     */
    show() {
        const pageEl =
            this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`) || this.annotatedElement;
        const [browserX, browserY] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(
            this.location,
            this.annotatedElement
        );

        // Position and append to page
        this.element.style.left = `${browserX - POINT_ANNOTATION_ICON_HEIGHT / 3}px`;
        // Add 15px for vertical padding on page
        this.element.style.top = `${browserY - POINT_ANNOTATION_ICON_HEIGHT * 2 / 3 + PAGE_PADDING_TOP}px`;
        pageEl.appendChild(this.element);

        annotatorUtil.showElement(this.element);

        if (this.state === STATES.pending) {
            this.showDialog();
        }
    }

    /**
     * Creates the document point annotation dialog for the thread.
     *
     * @override
     * @return {void}
     */
    createDialog() {
        this.dialog = new DocPointDialog({
            annotatedElement: this.annotatedElement,
            container: this.container,
            annotations: this.annotations,
            locale: this.locale,
            location: this.location,
            canAnnotate: this.permissions.canAnnotate
        });
    }
}

export default DocPointThread;
