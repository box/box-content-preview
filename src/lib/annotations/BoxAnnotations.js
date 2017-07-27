import DocAnnotator from './doc/DocAnnotator';
import ImageAnnotator from './image/ImageAnnotator';
import { TYPES } from './annotationConstants';

const ANNOTATORS = [
    {
        NAME: 'Document',
        CONSTRUCTOR: DocAnnotator,
        VIEWER: ['Document', 'Presentation'],
        TYPE: [TYPES.point, TYPES.highlight, TYPES.draw]
    },
    {
        NAME: 'Image',
        CONSTRUCTOR: ImageAnnotator,
        VIEWER: ['Image', 'MultiImage'],
        TYPE: [TYPES.point]
    }
];

class BoxAnnotations {
    /**
     * [constructor]
     *
     * @return {BoxAnnotations} BoxAnnotations instance
     */
    constructor() {
        this.annotators = ANNOTATORS;
    }

    /**
     * Returns the available annotators
     *
     * @return {Array} List of supported annotators
     */
    getAnnotators() {
        return Array.isArray(this.annotators) ? this.annotators : [];
    }

    /**
     * Chooses a annotator based on viewer.
     *
     * @param {Object} viewer - Current preview viewer
     * @param {Array} [disabledAnnotators] - List of disabled annotators
     * @return {Object} The annotator to use
     */
    determineAnnotator(viewer, disabledAnnotators = []) {
        return this.annotators.find(
            (annotator) => !disabledAnnotators.includes(annotator.NAME) && annotator.VIEWER.includes(viewer)
        );
    }
}

global.BoxAnnotations = BoxAnnotations;
export default BoxAnnotations;
