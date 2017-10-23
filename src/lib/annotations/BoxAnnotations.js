import DocAnnotator from './doc/DocAnnotator';
import ImageAnnotator from './image/ImageAnnotator';
import DrawingModeController from './drawing/DrawingModeController';
import { TYPES } from './annotationConstants';
import { canLoadAnnotations } from './annotatorUtil';

/**
 * NAME: The name of the annotator.
 * CONSTRUCTOR: Constructor for the annotator.
 * VIEWER: The kinds of viewers that can be annotated by this.
 * TYPE: The types of annotations that can be used by this annotator.
 * DEFAULT_TYPES: The default annotation types enabled if none provided.
 */
const ANNOTATORS = [
    {
        NAME: 'Document',
        CONSTRUCTOR: DocAnnotator,
        VIEWER: ['Document', 'Presentation'],
        TYPE: [TYPES.point, TYPES.highlight, TYPES.highlight_comment, TYPES.draw],
        DEFAULT_TYPES: [TYPES.point, TYPES.highlight, TYPES.highlight_comment]
    },
    {
        NAME: 'Image',
        CONSTRUCTOR: ImageAnnotator,
        VIEWER: ['Image', 'MultiImage'],
        TYPE: [TYPES.point],
        DEFAULT_TYPES: [TYPES.point]
    }
];

const ANNOTATOR_TYPE_CONTROLLERS = {
    [TYPES.draw]: {
        CONSTRUCTOR: DrawingModeController
    }
};

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
        const annotatorConfig = annotators.find(
            (annotator) => !disabledAnnotators.includes(annotator.NAME) && annotator.VIEWER.includes(viewerName)
        );
        this.instantiateControllers(annotatorConfig);

        return annotatorConfig;
    }

    /**
     * Instantiates and attaches controller instances to an annotator configuration. Does nothing if controller
     * has already been instantiated or the config is invalid.
     *
     * @private
     * @param {Object} annotatorConfig - The config where annotation type controller instances should be attached
     * @return {void}
     */
    instantiateControllers(annotatorConfig) {
        if (!annotatorConfig || !annotatorConfig.TYPE || annotatorConfig.CONTROLLERS) {
            return;
        }

        /* eslint-disable no-param-reassign */
        annotatorConfig.CONTROLLERS = {};
        annotatorConfig.TYPE.forEach((type) => {
            if (type in ANNOTATOR_TYPE_CONTROLLERS) {
                annotatorConfig.CONTROLLERS[type] = new ANNOTATOR_TYPE_CONTROLLERS[type].CONSTRUCTOR();
            }
        });
        /* eslint-enable no-param-reassign */
    }

    /**
     * Chooses an annotator based on viewer.
     *
     * @param {Object} options - Viewer options
     * @param {Object} [viewerConfig] - Viewer-specific annotations configs
     * @param {Array} [disabledAnnotators] - List of disabled annotators
     * @return {Object|null} A copy of the annotator to use, if available
     */
    determineAnnotator(options, viewerConfig = {}, disabledAnnotators = []) {
        let modifiedAnnotator = null;

        const hasAnnotationPermissions = canLoadAnnotations(options.file.permissions);
        const annotator = this.getAnnotatorsForViewer(options.viewer.NAME, disabledAnnotators);
        if (!hasAnnotationPermissions || !annotator || viewerConfig.enabled === false) {
            return modifiedAnnotator;
        }

        modifiedAnnotator = Object.assign({}, annotator);

        const enabledTypes = viewerConfig.enabledTypes || [...modifiedAnnotator.DEFAULT_TYPES];

        // Keeping disabledTypes for backwards compatibility
        const disabledTypes = viewerConfig.disabledTypes || [];

        const annotatorTypes = enabledTypes.filter((type) => {
            return (
                !disabledTypes.some((disabled) => disabled === type) &&
                modifiedAnnotator.TYPE.some((allowed) => allowed === type)
            );
        });

        modifiedAnnotator.TYPE = annotatorTypes;

        return modifiedAnnotator;
    }
}

global.BoxAnnotations = BoxAnnotations;
export default BoxAnnotations;
