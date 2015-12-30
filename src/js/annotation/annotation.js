'use strict';

import autobind from 'autobind-decorator';

/**
 * Annotation class representing a single annotation.
 */
@autobind
class Annotation {

    /**
     * @constructor
     * @param {Object} data Annotation data
     * @param {string} data.fileID File ID
     * @param {string} data.type Annotation type
     * @param {string} data.text Annotation text
     * @param {Object} data.location Location object
     * @param {Object} data.user User object
     * @param {string} [data.threadID] Optional thread ID
     */
    constructor(data) {
        this.annotationID = AnnotationService.generateID();
        this.threadID = data.threadID || AnnotationService.generateID();
        this.fileID = data.fileID;
        this.type = data.type;
        this.text = data.text;
        this.location = data.location;
        this.user = data.user;
        this.created = new Date();
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
