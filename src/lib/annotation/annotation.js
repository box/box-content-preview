import autobind from 'autobind-decorator';
import AnnotationService from './annotation-service';

/**
 * Annotation class representing a single annotation.
 */
@autobind
class Annotation {

    /**
     * @constructor
     * @param {Object} data Annotation data
     * @param {String} [data.threadID] Optional thread ID
     * @param {String} data.fileID File ID
     * @param {String} data.type Annotation type
     * @param {String} data.text Annotation text
     * @param {Object} data.location Location object
     * @param {Object} data.user User object
     */
    constructor(data) {
        this.annotationID = AnnotationService.generateID();
        this.threadID = data.threadID || AnnotationService.generateID();
        this.fileID = data.fileID;
        this.type = data.type;
        this.text = data.text;
        this.location = data.location;
        this.user = data.user;
        this.created = (new Date()).getTime();
        this.updated = this.created;
    }

    /**
     * Copies annotation
     *
     * @param {Annotation} annotation Annotation to copy
     * @param {Object} [data] Optional data object with properties to override
     * @returns {Annotation} Copied annotation with unique ID
     */
    static copy(annotation, data) {
        return new Annotation({
            threadID: data.threadID || annotation.threadID,
            fileID: data.fileID || annotation.fileID,
            type: data.type || annotation.type,
            text: data.text || annotation.text,
            location: data.location || annotation.location,
            user: data.user || annotation.user
        });
    }
}

export default Annotation;
