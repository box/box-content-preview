import autobind from 'autobind-decorator';
import Annotator from '../Annotator';
import ImagePointThread from './ImagePointThread';
import * as annotatorUtil from '../annotatorUtil';
import * as imageAnnotatorUtil from './imageAnnotatorUtil';
import { SELECTOR_BOX_PREVIEW_BTN_ANNOTATE } from '../../constants';

@autobind
class ImageAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Returns an annotation location on an image from the DOM event or null
     * if no correct annotation location can be inferred from the event. For
     * point annotations, we return the (x, y) coordinates for the point
     * with the top left corner of the image as the origin.
     *
     * @override
     * @param {Event} event - DOM event
     * @return {Object|null} Location object
     */
    getLocationFromEvent(event) {
        let location = null;

        // Get image tag inside viewer
        const imageEl = this.annotatedElement.querySelector('img');
        if (!imageEl) {
            return location;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(this.annotatedElement);
        if (dataType === 'annotation-dialog' || dataType === 'annotation-indicator') {
            return location;
        }

        // Location based only on image position
        const imageDimensions = imageEl.getBoundingClientRect();
        let [x, y] = [(event.clientX - imageDimensions.left), (event.clientY - imageDimensions.top)];

        // If click isn't in image area, ignore
        if (event.clientX > imageDimensions.right || event.clientX < imageDimensions.left ||
            event.clientY > imageDimensions.bottom || event.clientY < imageDimensions.top) {
            return location;
        }

        // Scale location coordinates according to natural image size
        const scale = annotatorUtil.getScale(this.annotatedElement);
        const rotation = Number(imageEl.getAttribute('data-rotation-angle'));
        [x, y] = imageAnnotatorUtil.getLocationWithoutRotation(x / scale, y / scale, rotation, imageDimensions, scale);

        // We save the dimensions of the annotated element so we can
        // compare to the element being rendered on and scale as appropriate
        const dimensions = {
            x: imageDimensions.width / scale,
            y: imageDimensions.height / scale
        };

        location = { x, y, imageEl, dimensions };

        return location;
    }

    /**
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
     *
     * @override
     * @param {Annotation[]} annotations - Annotations in thread
     * @param {Object} location - Location object
     * @param {string} [type] - Optional annotation type
     * @return {AnnotationThread} Created annotation thread
     */
    createAnnotationThread(annotations, location, type) {
        let thread;
        const threadParams = {
            annotatedElement: this.annotatedElement,
            annotations,
            annotationService: this.annotationService,
            fileVersionID: this.fileVersionID,
            locale: this.locale,
            location,
            type
        };

        if (!annotatorUtil.validateThreadParams(threadParams)) {
            this.handleValidationError();
            return thread;
        }

        // Set existing thread ID if created with annotations
        if (annotations.length > 0) {
            threadParams.threadID = annotations[0].threadID;
        }

        thread = new ImagePointThread(threadParams);
        this.addThreadToMap(thread);
        return thread;
    }

    /**
     * Hides all annotations on the image. Also hides button in header that
     * enables point annotation mode
     *
     * @return {void}
     */
    hideAllAnnotations() {
        const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
        const annotations = this.annotatedElement.getElementsByClassName('bp-point-annotation-btn');
        for (let i = 0; i < annotations.length; i++) {
            annotatorUtil.hideElement(annotations[i]);
        }
        annotatorUtil.hideElement(annotateButton);
    }

    /**
     * Shows all annotations on the image. Shows button in header that
     * enables point annotation mode
     *
     * @return {void}
     */
    showAllAnnotations() {
        const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
        const annotations = this.annotatedElement.getElementsByClassName('bp-point-annotation-btn');
        for (let i = 0; i < annotations.length; i++) {
            annotatorUtil.showElement(annotations[i]);
        }
        annotatorUtil.showElement(annotateButton);
    }

    /**
     * Renders annotations from memory. Hides annotations if image is rotated
     *
     * @override
     * @param {number} [rotationAngle] - current angle image is rotated
     * @return {void}
     * @private
     */
    renderAnnotations(rotationAngle = 0) {
        super.renderAnnotations();

        // Only show/hide point annotation button if user has the appropriate
        // permissions
        if (this.annotationService.canAnnotate) {
            // Hide create annotations button if image is rotated
            // TODO(@spramod) actually adjust getLocationFromEvent method in
            // annotator to get correct location rather than disabling the creation
            // of annotations on rotated images
            const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);

            if (rotationAngle !== 0) {
                annotatorUtil.hideElement(annotateButton);
            } else {
                annotatorUtil.showElement(annotateButton);
            }
        }
    }
}

export default ImageAnnotator;
