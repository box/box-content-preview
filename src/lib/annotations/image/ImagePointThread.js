import autobind from 'autobind-decorator';
import AnnotationThread from '../AnnotationThread';
import ImagePointDialog from './ImagePointDialog';
import * as annotatorUtil from '../annotatorUtil';
import * as imageAnnotatorUtil from './imageAnnotatorUtil';
import * as constants from '../annotationConstants';

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
        const [browserX, browserY] = imageAnnotatorUtil.getBrowserCoordinatesFromLocation(this._location, this._annotatedElement);

        // Position and append to image
        this._element.style.left = `${browserX - (POINT_ANNOTATION_ICON_WIDTH / 2)}px`;
        this._element.style.top = `${browserY - POINT_ANNOTATION_ICON_HEIGHT + POINT_ANNOTATION_ICON_DOT_HEIGHT}px`;
        this._annotatedElement.appendChild(this._element);

        annotatorUtil.showElement(this._element);

        if (this._state === constants.ANNOTATION_STATE_PENDING) {
            this.showDialog();
        }
    }

    /**
     * Creates the image point annotation dialog for the thread.
     *
     * @override
     * @return {void}
     */
    createDialog() {
        this._dialog = new ImagePointDialog({
            annotatedElement: this._annotatedElement,
            annotations: this._annotations,
            location: this._location,
            locale: this._locale,
            canAnnotate: this._annotationService.canAnnotate
        });
    }
}

export default ImagePointThread;
