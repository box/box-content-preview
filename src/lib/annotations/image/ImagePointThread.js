import autobind from 'autobind-decorator';
import AnnotationThread from '../AnnotationThread';
import ImagePointDialog from './ImagePointDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as imageAnnotatorUtil from './imageAnnotatorUtil';
import { STATES } from '../annotationConstants';

const POINT_ANNOTATION_ICON_HEIGHT = 31;
const POINT_ANNOTATION_ICON_DOT_HEIGHT = 8;
const POINT_ANNOTATION_ICON_WIDTH = 24;

@autobind
class ImagePointThread extends AnnotationThread {
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
        const [browserX, browserY] = imageAnnotatorUtil.getBrowserCoordinatesFromLocation(
            this.location,
            this.annotatedElement
        );

        // Position and append to image
        this.element.style.left = `${browserX - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        this.element.style.top = `${browserY - POINT_ANNOTATION_ICON_HEIGHT + POINT_ANNOTATION_ICON_DOT_HEIGHT}px`;
        this.annotatedElement.appendChild(this.element);

        annotatorUtil.showElement(this.element);

        if (this.state === STATES.pending) {
            this.showDialog();

            // Force dialogs to reposition on re-render
            if (!this.isMobile) {
                this.dialog.position();
            }
        }
    }

    /**
     * Creates the image point annotation dialog for the thread.
     *
     * @override
     * @return {void}
     */
    createDialog() {
        this.dialog = new ImagePointDialog({
            annotatedElement: this.annotatedElement,
            container: this.container,
            annotations: this.annotations,
            location: this.location,
            locale: this.locale,
            canAnnotate: this.permissions.canAnnotate
        });
    }
}

export default ImagePointThread;
