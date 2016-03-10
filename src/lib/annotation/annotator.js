import autobind from 'autobind-decorator';
import AnnotationService from './annotation-service';

const ANONYMOUS_USER = {
    name: 'Kylo Ren',
    avatarUrl: 'https://cloud.box.com/shared/static/x0tgsfl8vo2umx9kumd4jsq1p74ah8sn.png'
};

/**
 * Annotator base class. Viewer-specific annotators should extend this.
 */
@autobind
class Annotator {

    /**
     * @constructor
     * @param {string} fileID File ID for annotations
     * @param {Object} [options] Optional parameters
     * @param {Object} [options.user] Optional user for annotations
     * @param {AnnotationService} [options.annotationService] Optional
     * annotations service for annotations persistence
     * @returns {void}
     */
    constructor(fileID, options = {}) {
        this.fileID = fileID;
        // Default to anonymous user
        this.user = options.user || ANONYMOUS_USER;
        // @TODO(tjin): new LocalStorageAnnotationService
        // Default to local storage annotations service
        this.annotationService = options.annotationService || new AnnotationService();
    }

}

export default Annotator;
