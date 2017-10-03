import DocAnnotator from './doc/DocAnnotator';
import ImageAnnotator from './image/ImageAnnotator';
import DrawingModeController from './drawing/DrawingModeController';
import { TYPES } from './annotationConstants';
import { canLoadAnnotations } from './annotatorUtil';

const ANNOTATORS = [
    {
        NAME: 'Document',
        CONSTRUCTOR: DocAnnotator,
        VIEWER: ['Document', 'Presentation'],
        // Temporarily include draw annotations for demo purposes
        TYPE: [TYPES.point, TYPES.highlight, TYPES.highlight_comment, TYPES.draw]
    },
    {
        NAME: 'Image',
        CONSTRUCTOR: ImageAnnotator,
        VIEWER: ['Image', 'MultiImage'],
        TYPE: [TYPES.point]
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
     * Chooses a annotator based on viewer.
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
        if (!hasAnnotationPermissions || !annotator) {
            return modifiedAnnotator;
        }

        modifiedAnnotator = Object.assign({}, annotator);

        // Filter out disabled annotation types
        if (Array.isArray(viewerConfig.disabledTypes)) {
            modifiedAnnotator.TYPE = modifiedAnnotator.TYPE.filter((type) => {
                return !viewerConfig.disabledTypes.includes(type);
            });
        }

        // Remove draw annotations if they aren't explicitly enabled.
        if (!viewerConfig.drawEnabled) {
            modifiedAnnotator.TYPE = modifiedAnnotator.TYPE.filter((type) => type !== TYPES.draw);
        }

        return modifiedAnnotator;
    }
}

global.BoxAnnotations = BoxAnnotations;
export default BoxAnnotations;
