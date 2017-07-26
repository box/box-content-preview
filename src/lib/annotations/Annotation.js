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
     * @property {string} fileVersionId File version ID for this annotation
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
        this.fileVersionId = data.fileVersionId;
        this.threadID = data.threadID;
        this.threadNumber = data.threadNumber;
        this.type = data.type;
        this.text = data.text;
        this.location = data.location;
        this.user = data.user;
        this.permissions = data.permissions;
        this.created = data.created;
        this.modified = data.modified;
    }
}

export default Annotation;
