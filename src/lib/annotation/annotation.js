/**
 * @fileoverview Annotation class that represents an annotation.
 * @author tjin
 */

import autobind from 'autobind-decorator';

@autobind
class Annotation {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing an annotation.
     *
     * @typedef {Object} AnnotationData
     * @property {String} annotationID Annotation ID
     * @property {String} fileVersionID File version ID for this annotation
     * @property {String} threadID Thread ID
     * @property {String} type Annotation type, e.g. 'point' or 'highlight'
     * @property {String} text Annotation text
     * @property {Object} location Location object
     * @property {Object} user User creating/that created this annotation
     * @property {Number} created Created timestamp
     * @property {Number} modified Modified timestamp
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @constructor
     * @param {AnnotationData} data Data for constructing annotation
     */
    constructor(data) {
        this.annotationID = data.annotationID;
        this.fileVersionID = data.fileVersionID;
        this.threadID = data.threadID;
        this.type = data.type;
        this.text = data.text;
        this.location = data.location;
        this.user = data.user;
        this.created = data.created;
        this.modified = data.modified;
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
