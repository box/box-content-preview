/**
 * @fileoverview Base annotation class
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationService from './annotation-service';
import EventEmitter from 'events';

/**
 * Annotation class representing a single annotation.
 */
@autobind
class Annotation extends EventEmitter {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------
    /**
     * The data object for constructing an annotation. Some optional properties
     * are sent if we are constructing an annotation object that has been
     * persisted, e.g. annotationID, created, modified.
     *
     * @typedef {Object} AnnotationData
     * @property {String} fileVersionID File version ID for this annotation
     * @property {String} type Annotation type, e.g. 'point' or 'highlight'
     * @property {String} text Annotation text
     * @property {Object} location Location object
     * @property {Object} user User creating/that created this annotation
     * @property {String} [annotationID] Annotation ID
     * @property {String} [threadID] Thread ID
     * @property {Number} [created] Created timestamp
     * @property {Number} [modified] Modified timestamp
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /**
     * @constructor
     * @param {AnnotationData} data Data for constructing annotation
     */
    constructor(data) {
        this.fileVersionID = data.fileVersionID;
        this.type = data.type;
        this.text = data.text;
        this.location = data.location;
        this.user = data.user;
        this.annotationID = data.annotationID || AnnotationService.generateID();
        this.threadID = data.threadID || AnnotationService.generateID();
        this.created = data.created || (new Date()).getTime();
        this.modified = data.modified || this.created;
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
