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
     * @param {Array} [disabledAnnotators] - List of disabled annotators
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
     * @param {Array} [viewerConfig] - Annotation configuration for a specific viewer
     * @param {Array} [disabledAnnotators] - List of disabled annotators
     * @return {Object|null} A copy of the annotator to use, if available
     */
    determineAnnotator(viewerName, viewerConfig = {}, disabledAnnotators = []) {
        const annotator = this.getAnnotatorsForViewer(viewerName, disabledAnnotators);
        let modifiedAnnotator = null;

        if (!annotator) {
            return modifiedAnnotator;
        }

        modifiedAnnotator = Object.assign({}, annotator);
        // If explicitly disabled via config, do nothing
        if (viewerConfig.enabled === false) {
            return null;
        }

        // Filter out disabled annotation types
        if (Array.isArray(viewerConfig.disabledTypes)) {
            modifiedAnnotator.TYPE = modifiedAnnotator.TYPE.filter((type) => {
                return !viewerConfig.disabledTypes.includes(type);
            });
        }

        return modifiedAnnotator;
    }
}

global.BoxAnnotations = BoxAnnotations;
export default BoxAnnotations;
