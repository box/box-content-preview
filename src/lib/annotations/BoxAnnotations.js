import DocAnnotator from './doc/DocAnnotator';
import ImageAnnotator from './image/ImageAnnotator';

const ANNOTATORS = [
    {
        NAME: 'Document',
        CONSTRUCTOR: DocAnnotator,
        VIEWER: ['Document', 'Presentation'],
        TYPE: ['point', 'highlight']
    },
    {
        NAME: 'Image',
        CONSTRUCTOR: ImageAnnotator,
        VIEWER: ['Image', 'MultiImage'],
        TYPE: ['point']
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
     * Chooses a annotator based on file extension.
     *
     * @param {Object} file - Box file
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
