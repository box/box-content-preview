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
     * [constructor]
     *
     * @param {AnnotationData} data Data for constructing annotation
     * @returns {Annotation} Instance of annotation
     */
    constructor(data) {
        this._annotationID = data.annotationID;
        this._fileVersionID = data.fileVersionID;
        this._threadID = data.threadID;
        this._type = data.type;
        this._text = data.text;
        this._location = data.location;
        this._user = data.user;
        this._created = data.created;
        this._modified = data.modified;
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets annotationID.
     *
     * @returns {String} annotationID
     */
    get annotationID() {
        return this._annotationID;
    }

    /**
     * Gets fileVersionID.
     *
     * @returns {String} fileVersionID
     */
    get fileVersionID() {
        return this._fileVersionID;
    }

    /**
     * Gets threadID.
     *
     * @returns {String} threadID
     */
    get threadID() {
        return this._threadID;
    }

    /**
     * Gets type.
     *
     * @returns {String} type
     */
    get type() {
        return this._type;
    }

    /**
     * Gets text.
     *
     * @returns {String} text
     */
    get text() {
        return this._text;
    }

    /**
     * Gets location.
     *
     * @returns {Object} location
     */
    get location() {
        return this._location;
    }

    /**
     * Gets user.
     *
     * @returns {Object} user
     */
    get user() {
        return this._user;
    }

    /**
     * Gets created.
     *
     * @returns {Number} created
     */
    get created() {
        return this._created;
    }

    /**
     * Gets modified.
     *
     * @returns {Number} modified
     */
    get modified() {
        return this._modified;
    }
}

export default Annotation;
