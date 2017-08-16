import DocAnnotator from './doc/DocAnnotator';
import ImageAnnotator from './image/ImageAnnotator';
import { TYPES } from './annotationConstants';

const ANNOTATORS = [
    {
        NAME: 'Document',
        CONSTRUCTOR: DocAnnotator,
        VIEWER: ['Document', 'Presentation'],
        TYPE: [TYPES.point, TYPES.highlight]
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
     * @param {Array} [disabledTypes] - List of disabled annotation types
     * @return {Object} A copy of the annotator to use
     */
    determineAnnotator(viewer, disabledAnnotators = [], annotationConfig = {}) {
        let annotator;
        const annotatorToCopy = this.annotators.find(
            (annotatorToCheck) =>
                !disabledAnnotators.includes(annotatorToCheck.NAME) && annotatorToCheck.VIEWER.includes(viewer)
        );

        // Remove annotation types that have been disabled
        if (annotatorToCopy) {
            annotator = Object.assign({}, annotatorToCopy);

            // Filter out annotation types
            if (annotationConfig.disabledTypes) {
                annotator.TYPE = annotator.TYPE.filter((type) => {
                    return !annotationConfig.disabledTypes.includes(type);
                });
            }
        }

        return annotator;
    }
}

global.BoxAnnotations = BoxAnnotations;
export default BoxAnnotations;
