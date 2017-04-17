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
        VIEWER: ['Image'],
        TYPE: ['point']
    }
];

class AnnotatorLoader {

    /**
     * [constructor]
     *
     * @return {AnnotatorLoader} AnnotatorLoader instance
     */
    constructor() {
        this.annotators = ANNOTATORS;
    }

    /**
     * Determines if this loader can be used
     *
     * @param {Object} viewer - Viewer
     * @param {Array} [disabledAnnotators] - List of disabled annotators
     * @return {boolean} Is file supported
     */
    canLoad(viewer, disabledAnnotators = []) {
        return !!this.determineAnnotator(viewer, disabledAnnotators);
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
        return this.annotators.find((annotator) => {
            if (disabledAnnotators.indexOf(annotator.NAME) > -1) {
                return false;
            }
            return annotator.VIEWER.indexOf(viewer) > -1;
        });
    }
}

global.AnnotatorLoader = AnnotatorLoader;
export default AnnotatorLoader;
