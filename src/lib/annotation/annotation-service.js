/**
 * @fileoverview Box annotations service that fetches, persists, and updates
 * annotations. Annotations will be saved to local storage for now. Applications
 * that want to self-host annotations should implement their own versions of
 * this service.
 * @author tjin
 */

import autobind from 'autobind-decorator';

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
     * Gets a map of thread ID to annotations in that thread.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with thread map
     */
    getThreadMapForFileVersionID(fileVersionID) {
        return this.getAnnotationsForFileVersionID(fileVersionID).then(this._createThreadMapFromAnnotations);
    }

    /**
     * Gets annotations on the specified file.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with fetched annotations
     */
    getAnnotationsForFileVersionID(fileVersionID) {
        return new Promise((resolve) => {
            const annotations = this.localAnnotations;
            resolve(annotations.filter((annotation) => annotation.fileVersionID === fileVersionID));
        });
    }

    /**
     * Create an annotation.
     *
     * @param {Annotation} annotation Annotation to save
     * @returns {Promise} Promise to create annotation
     */
    create(annotation) {
        return new Promise((resolve) => {
            const createdAnnotation = annotation;
            createdAnnotation.annotationID = AnnotationService.generateID();
            createdAnnotation.created = (new Date()).getTime();
            createdAnnotation.modified = createdAnnotation.created;

            const annotations = this.localAnnotations;
            annotations.push(createdAnnotation);
            this.localAnnotations = annotations;

            resolve(createdAnnotation);
        });
    }

    /**
     * Update an annotation.
     *
     * @param {Annotation} annotation Annotation to update
     * @returns {Promise} Promise to update annotation
     */
    update(annotation) {
        const annot = annotation;

        return new Promise((resolve, reject) => {
            const annotationID = annot.annotationID;
            const annotations = this.localAnnotations;
            const index = annotations.findIndex((storedAnnotation) => storedAnnotation.annotationID === annotationID);

            if (index !== -1) {
                annot.updated = new Date(); // @TODO(tjin): not sure if updated belongs here or higher up
                annotations[index] = annot;
                this.localAnnotations = annotations;
                resolve(annot);
            } else {
                reject(`Could not update annotation with ID ${annotationID}`);
            }
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
            const annotations = this.localAnnotations;
            const result = annotations.filter((annotation) => annotation.annotationID !== annotationID);

            if (result.length !== annotations.length) {
                this.localAnnotations = result;
                resolve();
            } else {
                reject(`Could not delete annotation with ID ${annotationID}`);
            }
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Generates a map of thread ID to annotations in thread.
     *
     * @param {Annotation[]} annotations Annotations to generate map from
     * @returns {Promise} Promise that resolves with thread map
     * @private
     */
    _createThreadMapFromAnnotations(annotations) {
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

    //--------------------------------------------------------------------------
    // Getters and setters
    //--------------------------------------------------------------------------

    /**
     * Gets annotations saved in local storage
     *
     * @returns {Annotations[]} Annotations stored in local storage
     */
    get localAnnotations() {
        const annotationsString = localStorage.getItem('annotationsLocalStorage');
        return (annotationsString === null) ? [] : JSON.parse(annotationsString);
    }

    /**
     * Saves annotations in local storage
     *
     * @param {Annotation[]} annotations Annotations to save
     * @returns {void}
     */
    set localAnnotations(annotations) {
        localStorage.setItem('annotationsLocalStorage', JSON.stringify(annotations));
    }
}

export default AnnotationService;
