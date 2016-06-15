/**
 * @fileoverview Image annotator class. Extends base annotator class
 * @author spramod
 */

import autobind from 'autobind-decorator';
import Annotator from '../annotation/annotator';
// import Browser from '../browser';
import ImagePointThread from './image-point-thread';
import * as annotatorUtil from '../annotation/annotator-util';
import * as constants from '../annotation/annotation-constants';

// const IS_MOBILE = Browser.isMobile();
// const MOUSEMOVE_THROTTLE_MS = 50;

@autobind
class ImageAnnotator extends Annotator {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [destructor]
     *
     * @override
     * @returns {void}
     */
    destroy() {
        super.destroy();
        this.removeAllListeners('pointmodeenter');
    }

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Returns an annotation location on a document from the DOM event or null
     * if no correct annotation location can be inferred from the event. For
     * point annotations, we return the (x, y) coordinates and page the
     * point is on in PDF units with the lower left corner of the document as
     * the origin. For highlight annotations, we return the PDF quad points
     * as defined by the PDF spec and page the highlight is on.
     *
     * @override
     * @param {Event} event DOM event
     * @returns {Object|null} Location object
     */
    getLocationFromEvent(event) {
        let location = null;
        const eventTarget = event.target;
        const imageEl = annotatorUtil.findClosestElWithClass(eventTarget, constants.CLASS_ANNOTATION_POINT_MODE);

        // If click is inside an annotation dialog, ignore
        const dataType = annotatorUtil.findClosestDataType(eventTarget);
        if (dataType === 'annotation-dialog' || dataType === 'annotation-indicator') {
            return location;
        }

        const imageDimensions = imageEl.getBoundingClientRect();
        const browserCoordinates = [event.clientX - imageDimensions.left, event.clientY - imageDimensions.top];
        const imageCoordinates = this.convertDOMSpaceToImageSpace(browserCoordinates, imageDimensions.height, 1);
        const [x, y] = imageCoordinates;

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
     * Converts coordinates in DOM space to coordinates in image space.
     * @param {Number[]} coordinates Either a [x,y] coordinate location or
     * quad points in the format of 8xn numbers in DOM space in CSS pixels
     * @param {Number} pageHeight Height of page in CSS pixels, needed to convert
     * coordinate origin from top left (DOM) to bottom left (image)
     * @returns {Number[]} Either [x,y] or 8xn coordinates in image space in image
     * units
     */
    convertDOMSpaceToImageSpace(coordinates, pageHeight) {
        let imageCoordinates = [];
        if (coordinates.length === 2) {
            const [x, y] = coordinates;
            imageCoordinates = [x, pageHeight - y];
        } else {
            const [x1, y1, x2, y2, x3, y3, x4, y4] = coordinates;
            imageCoordinates = [
                x1,
                pageHeight - y1,
                x2,
                pageHeight - y2,
                x3,
                pageHeight - y3,
                x4,
                pageHeight - y4
            ];
        }

        return imageCoordinates.map((val) => (val).toFixed(4));
    }

    /**
     * Creates the proper type of thread, adds it to in-memory map, and returns
     * it.
     *
     * @override
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {String} [type] Optional annotation type
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
}

export default ImageAnnotator;
