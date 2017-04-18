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
        this.annotationID = data.annotationID;
        this.fileVersionID = data.fileVersionID;
        this.threadID = data.threadID;
        this.thread = data.thread;
        this.type = data.type;
        this.text = data.text;
        this.location = data.location;
        this.user = data.user;
        this.permissions = data.permissions;
        this.created = data.created;
        this.modified = data.modified;
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
        return this.annotationID;
    }

    /**
     * Gets fileVersionID.
     *
     * @return {string} fileVersionID
     */
    get fileVersionID() {
        return this.fileVersionID;
    }

    /**
     * Gets threadID.
     *
     * @return {string} threadID
     */
    get threadID() {
        return this.threadID;
    }

    /**
     * Gets thread.
     *
     * @return {string} thread
     */
    get thread() {
        return this.thread;
    }

    /**
     * Gets type.
     *
     * @return {string} type
     */
    get type() {
        return this.type;
    }

    /**
     * Gets text.
     *
     * @return {string} text
     */
    get text() {
        return this.text;
    }

    /**
     * Gets location.
     *
     * @return {Object} location
     */
    get location() {
        return this.location;
    }

    /**
     * Gets user.
     *
     * @return {Object} user
     */
    get user() {
        return this.user;
    }

    /**
     * Gets permissions.
     *
     * @return {Object} permissions
     */
    get permissions() {
        return this.permissions;
    }

    /**
     * Gets created.
     *
     * @return {number} created
     */
    get created() {
        return this.created;
    }

    /**
     * Gets modified.
     *
     * @return {number} modified
     */
    get modified() {
        return this.modified;
    }
}

export default Annotation;
