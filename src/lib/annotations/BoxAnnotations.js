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
     * Get all annotators for a given viewer.
     *
     * @param {string} viewerName - Name of the viewer to get annotators for
     * @return {Object} Annotator for the viewer
     */
    getAnnotatorsForViewer(viewerName, disabledAnnotators = []) {
        const annotators = this.getAnnotators();

        return annotators.find(
            (annotator) => !disabledAnnotators.includes(annotator.NAME) && annotator.VIEWER.includes(viewerName)
        );
    }

    /**
     * Chooses a annotator based on viewer.
     *
     * @param {Object} viewerName - Current preview viewer name
     * @param {Array} [disabledAnnotators] - List of disabled annotators
     * @param {Array} [viewerConfig] - Annotation configuration for a specific viewer
     * @return {Object|null} A copy of the annotator to use, if available
     */
    determineAnnotator(viewerName, disabledAnnotators = [], viewerConfig = {}) {
        const originalAnnotator = this.getAnnotatorsForViewer(viewerName, disabledAnnotators);

        if (originalAnnotator) {
            const annotator = Object.assign({}, originalAnnotator);
            // If explicitly disabled via config, do nothing
            if (viewerConfig.enabled === false) {
                return null;
            }

            // Filter out disabled annotation types
            if (Array.isArray(viewerConfig.disabledTypes)) {
                annotator.TYPE = annotator.TYPE.filter((type) => {
                    return !viewerConfig.disabledTypes.includes(type);
                });
            }

            return annotator;
        }

        return null;
    }
}

global.BoxAnnotations = BoxAnnotations;
export default BoxAnnotations;
