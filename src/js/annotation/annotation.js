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
        this.fileID = data.fileID;
        this.type = data.type;
        this.text = data.text;
        this.location = data.location;
        this.user = data.user;
        // Default to random GUID
        this.threadID = data.threadID || AnnotationService.generateID();
        this.created = new Date();
        this.updated = this.created;
    }
}

export default Annotation;
