/**
 * @fileoverview Image annotator class. Extends base annotator class
 * @author spramod
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotator';
import ImagePointThread from './image-point-thread';
import * as annotatorUtil from '../annotator-util';
import * as imageAnnotatorUtil from './image-annotator-util';
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
     * @param {Event} event DOM event
     * @returns {Object|null} Location object
     */
    getLocationFromEvent(event) {
        let location = null;

        // Get image tag inside viewer
        const imageEl = this._annotatedElement.querySelector('img');
        if (!imageEl) {
            return location;
        }

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(this._annotatedElement);
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
        const scale = annotatorUtil.getScale(this._annotatedElement);
        const rotation = Number(imageEl.getAttribute('data-rotation-angle'));
        [x, y] = imageAnnotatorUtil.getLocationWithoutRotation(x / scale, y / scale, rotation, imageDimensions, scale);

        // We save the dimensions of the annotated element so we can
        // compare to the element being rendered on and scale as appropriate
        const dimensions = {
            x: imageDimensions.width,
            y: imageDimensions.height
        };

        location = { x, y, imageEl, dimensions };

        return location;
    }

    /**
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
     *
     * @override
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {string} [type] Optional annotation type
     * @returns {AnnotationThread} Created annotation thread
     */
    createAnnotationThread(annotations, location, type) {
        const threadParams = {
            annotatedElement: this._annotatedElement,
            annotations,
            annotationService: this._annotationService,
            fileVersionID: this._fileVersionID,
            location,
            type
        };

        // Set existing thread ID if created with annotations
        if (annotations.length > 0) {
            threadParams.threadID = annotations[0].threadID;
        }

        const thread = new ImagePointThread(threadParams);
        this.addThreadToMap(thread);
        return thread;
    }

    /**
     * Hides all annotations on the image. Also hides button in header that
     * enables point annotation mode
     *
     * @returns {void}
     */
    hideAllAnnotations() {
        const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
        const annotations = this._annotatedElement.getElementsByClassName('box-preview-point-annotation-btn');
        for (let i = 0; i < annotations.length; i++) {
            annotatorUtil.hideElement(annotations[i]);
        }
        annotatorUtil.hideElement(annotateButton);
    }

    /**
     * Shows all annotations on the image. Shows button in header that
     * enables point annotation mode
     *
     * @returns {void}
     */
    showAllAnnotations() {
        const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);
        const annotations = this._annotatedElement.getElementsByClassName('box-preview-point-annotation-btn');
        for (let i = 0; i < annotations.length; i++) {
            annotatorUtil.showElement(annotations[i]);
        }
        annotatorUtil.showElement(annotateButton);
    }

    /**
     * Renders annotations from memory. Hides annotations if image is rotated
     *
     * @override
     * @param {number} [rotationAngle] current angle image is rotated
     * @returns {void}
     * @private
     */
    renderAnnotations(rotationAngle = 0) {
        super.renderAnnotations();

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

export default ImageAnnotator;
