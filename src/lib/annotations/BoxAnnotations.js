import DocAnnotator from './doc/DocAnnotator';
import ImageAnnotator from './image/ImageAnnotator';
import DrawingModeController from './drawing/DrawingModeController';
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

const ANNOTATOR_TYPE_CONTROLLERS = {
    [TYPES.draw]: DrawingModeController
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
     * Chooses a annotator based on viewer.
     *
     * @param {Object} viewer - Current preview viewer
     * @param {Array} [disabledAnnotators] - List of disabled annotators
     * @return {Object} The annotator configuration to use
     */
    determineAnnotator(viewer, disabledAnnotators = []) {
        const annotatorConfig = this.annotators.find(
            (annotator) => !disabledAnnotators.includes(annotator.NAME) && annotator.VIEWER.includes(viewer)
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
                annotatorConfig.CONTROLLERS[type] = new ANNOTATOR_TYPE_CONTROLLERS[type]();
            }
        });
        /* eslint-enable no-param-reassign */
    }
}

global.BoxAnnotations = BoxAnnotations;
export default BoxAnnotations;
