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
     * @property {string} annotationID Annotation ID
     * @property {string} fileVersionID File version ID for this annotation
     * @property {string} threadID Thread ID
     * @property {string} thread Thread number
     * @property {string} type Annotation type, e.g. 'point' or 'highlight'
     * @property {string} text Annotation text
     * @property {Object} location Location object
     * @property {Object} user User creating/that created this annotation
     * @property {Object} permissions Permissions user has
     * @property {number} created Created timestamp
     * @property {number} modified Modified timestamp
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
        this._thread = data.thread;
        this._type = data.type;
        this._text = data.text;
        this._location = data.location;
        this._user = data.user;
        this._permissions = data.permissions;
        this._created = data.created;
        this._modified = data.modified;
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets annotationID.
     *
     * @returns {string} annotationID
     */
    get annotationID() {
        return this._annotationID;
    }

    /**
     * Gets fileVersionID.
     *
     * @returns {string} fileVersionID
     */
    get fileVersionID() {
        return this._fileVersionID;
    }

    /**
     * Gets threadID.
     *
     * @returns {string} threadID
     */
    get threadID() {
        return this._threadID;
    }

    /**
     * Gets thread.
     *
     * @returns {string} thread
     */
    get thread() {
        return this._thread;
    }

    /**
     * Gets type.
     *
     * @returns {string} type
     */
    get type() {
        return this._type;
    }

    /**
     * Gets text.
     *
     * @returns {string} text
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
     * Gets permissions.
     *
     * @returns {Object} permissions
     */
    get permissions() {
        return this._permissions;
    }

    /**
     * Gets created.
     *
     * @returns {number} created
     */
    get created() {
        return this._created;
    }

    /**
     * Gets modified.
     *
     * @returns {number} modified
     */
    get modified() {
        return this._modified;
    }
}

export default Annotation;
