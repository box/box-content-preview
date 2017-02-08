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
     * @param {AnnotationData} data - Data for constructing annotation
     * @return {Annotation} Instance of annotation
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
     * @return {string} annotationID
     */
    get annotationID() {
        return this._annotationID;
    }

    /**
     * Gets fileVersionID.
     *
     * @return {string} fileVersionID
     */
    get fileVersionID() {
        return this._fileVersionID;
    }

    /**
     * Gets threadID.
     *
     * @return {string} threadID
     */
    get threadID() {
        return this._threadID;
    }

    /**
     * Gets thread.
     *
     * @return {string} thread
     */
    get thread() {
        return this._thread;
    }

    /**
     * Gets type.
     *
     * @return {string} type
     */
    get type() {
        return this._type;
    }

    /**
     * Gets text.
     *
     * @return {string} text
     */
    get text() {
        return this._text;
    }

    /**
     * Gets location.
     *
     * @return {Object} location
     */
    get location() {
        return this._location;
    }

    /**
     * Gets user.
     *
     * @return {Object} user
     */
    get user() {
        return this._user;
    }

    /**
     * Gets permissions.
     *
     * @return {Object} permissions
     */
    get permissions() {
        return this._permissions;
    }

    /**
     * Gets created.
     *
     * @return {number} created
     */
    get created() {
        return this._created;
    }

    /**
     * Gets modified.
     *
     * @return {number} modified
     */
    get modified() {
        return this._modified;
    }
}

export default Annotation;
