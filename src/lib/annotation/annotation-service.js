import autobind from 'autobind-decorator';

/**
 * Box annotations service that fetches, persists, and updates annotations.
 * Annotations will be saved to local storage for now. Applications that want
 * to self-host annotations should implement their own versions of this service.
 *
 * @TODO(tjin): Separate this into Base + LocalStorage extension later
 */
 @autobind
class AnnotationService {

    /**
     * Gets annotations on the specified file.
     *
     * @param {string} fileID ID of file to fetch annotations for
     * @returns {Map} Map of thread ID to annotations
     */
    getAnnotationsForFile(fileID) {
        return new Promise((resolve) => {
            const result = new Map();
            const annotations = this.localAnnotations;
            const matchingAnnotations = annotations.filter((annotation) => annotation.fileID === fileID);

            // Construct map of thread ID to annotations
            matchingAnnotations.forEach((annotation) => {
                const threadID = annotation.threadID;
                const annotationsInThread = result.get(threadID) || [];
                annotationsInThread.push(annotation);
                result.set(threadID, annotationsInThread);
            });

            // Sort annotations by date created
            for (const threadedAnnotations of result.values()) {
                threadedAnnotations.sort((a, b) => {
                    return a.created - b.created;
                });
            }

            resolve(result);
        });
    }

    /**
     * Gets annotations in the specified thread.
     *
     * @param {string} threadID ID of thread to fetch annotations for
     * @returns {Annotation[]} Array of annotations in this thread
     */
    getAnnotationsForThread(threadID) {
        return new Promise((resolve) => {
            const annotations = this.localAnnotations;
            const matchingAnnotations = annotations.filter((annotation) => annotation.threadID === threadID);

            // Sort annotations by date created
            matchingAnnotations.sort((a, b) => {
                return a.created - b.created;
            });

            resolve(matchingAnnotations);
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
            const annotations = this.localAnnotations;
            annotations.push(annotation);
            this.localAnnotations = annotations;
            resolve(annotation);
        });
    }

    /**
     * Update an annotation.
     *
     * @param {Annotation} annotation Annotation to update
     * @returns {Promise} Promise to update annotation
     */
    update(annotation) {
        return new Promise((resolve, reject) => {
            const annotationID = annotation.annotationID;
            const annotations = this.localAnnotations;
            const index = annotations.findIndex((storedAnnotation) => storedAnnotation.annotationID === annotationID);

            if (index !== -1) {
                /*eslint-disable*/
                annotation.updated = new Date(); // @TODO(tjin): not sure if updated belongs here or higher up
                /*eslint-enable*/
                annotations[index] = annotation;
                this.localAnnotations = annotations;
                resolve(annotation);
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

    /* ---------- Static ---------- */

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

    /* ---------- Getters & Setters ---------- */
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
