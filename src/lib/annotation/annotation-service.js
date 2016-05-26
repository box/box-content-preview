/**
 * @fileoverview Annotations service that performs annotations CRUD using the
 * Box content API.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotation from './annotation';

@autobind
class AnnotationService {

    //--------------------------------------------------------------------------
    // Static
    //--------------------------------------------------------------------------

    /**
     * Generates a rfc4122v4-compliant GUID, from
     * http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript.
     *
     * @returns {string} UUID for annotation
     */
    static generateID() {
        /* eslint-disable */
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
        /* eslint-enable */
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {String} api API endpoint
     * @param {String} token API token
     * @returns {AnnotationService} AnnotationService instance
     */
    constructor(api, token) {
        this._api = api;
        this._token = token;
    }

    /**
     * Create an annotation.
     *
     * @param {Annotation} annotation Annotation to save
     * @returns {Promise} Promise that resolves with created annotation
     */
    create(annotation) {
        return new Promise((resolve, reject) => {
            const annotationData = annotation;
            annotationData.annotationID = AnnotationService.generateID();
            annotationData.created = (new Date()).getTime();
            annotationData.modified = annotationData.created;

            // @TODO(tjin): Call to annotations create API with annotationData

            const createdAnnotation = new Annotation(annotationData);
            if (createdAnnotation) {
                resolve(createdAnnotation);
            } else {
                reject('Could not create annotation');
            }
        });
    }

    /**
     * Reads annotations from file version ID.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with fetched annotations
     */
    read(fileVersionID) {
        return new Promise((resolve, reject) => {
            // @TODO(tjin): Call to annotations read API with fileVersionID

            const annotations = [];
            if (annotations) {
                resolve(annotations);
            } else {
                reject(`Could not read annotations from file version with ID ${fileVersionID}`);
            }
        });
    }

    /**
     * Update an annotation.
     *
     * @param {Annotation} annotation Annotation to update
     * @returns {Promise} Promise that resolves with updated annotation
     */
    update(annotation) {
        const annotationData = annotation;
        const annotationID = annotationData.annotationID;

        return new Promise((resolve, reject) => {
            // @TODO(tjin): Call to annotations update API with annotationData

            reject(`Could not update annotation with ID ${annotationID}`);
        });
    }

    /**
     * Delete an annotation.
     *
     * @param {string} annotationID Id of annotation to delete
     * @returns {Promise} Promise to delete annotation
     */
    delete(annotationID) {
        return new Promise((resolve, reject) => {
            // @TODO(tjin): Call to annotations delete API with annotationID

            reject(`Could not delete annotation with ID ${annotationID}`);
        });
    }

    /**
     * Gets a map of thread ID to annotations in that thread.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with thread map
     */
    getThreadMap(fileVersionID) {
        return this.read(fileVersionID).then(this._createThreadMap);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Generates a map of thread ID to annotations in thread.
     *
     * @param {Annotation[]} annotations Annotations to generate map from
     * @returns {Object} Map of thread ID to annotations in that thread
     * @private
     */
    _createThreadMap(annotations) {
        const threadMap = {};

        // Construct map of thread ID to annotations
        annotations.forEach((annotation) => {
            const threadID = annotation.threadID;
            threadMap[threadID] = threadMap[threadID] || [];
            threadMap[threadID].push(annotation);
        });

        // Sort annotations by date created
        Object.keys(threadMap).forEach((threadID) => {
            threadMap[threadID].sort((a, b) => {
                return a.created - b.created;
            });
        });

        return threadMap;
    }
}

export default AnnotationService;
