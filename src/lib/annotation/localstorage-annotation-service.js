/**
 * @fileoverview LocalStorage-backed Annotations service that performs
 * annotations CRUD using HTML5 localStorage.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotation from './annotation';
import AnnotationService from './annotation-service';
import cache from '../cache';

@autobind
class LocalStorageAnnotationService extends AnnotationService {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Create an annotation.
     *
     * @param {Annotation} annotation Annotation to save
     * @returns {Promise} Promise to create annotation
     */
    create(annotation) {
        return new Promise((resolve) => {
            const annotationData = annotation;
            annotationData.annotationID = AnnotationService.generateID();
            annotationData.created = (new Date()).getTime();
            annotationData.modified = annotationData.created;
            const createdAnnotation = new Annotation(annotationData);

            const annotations = this.localAnnotations;
            annotations.push(createdAnnotation);
            this.localAnnotations = annotations;

            resolve(createdAnnotation);
        });
    }

    /**
     * Reads annotations from file version ID.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with fetched annotations
     */
    read(fileVersionID) {
        return new Promise((resolve) => {
            const annotations = this.localAnnotations;
            resolve(annotations.filter((annotation) => annotation.fileVersionID === fileVersionID));
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
     * Gets annotations on the specified file version.
     *
     * @param {string} fileVersionID File version ID to fetch annotations for
     * @returns {Promise} Promise that resolves with fetched annotations
     */
    _getAnnotationsForFileVersionID(fileVersionID) {
        return new Promise((resolve) => {
            const annotations = this.localAnnotations;
            resolve(annotations.filter((annotation) => annotation.fileVersionID === fileVersionID));
        });
    }

    //--------------------------------------------------------------------------
    // Getters and Setters
    //--------------------------------------------------------------------------

    /**
     * Gets annotations saved in local storage
     *
     * @returns {Annotations[]} Annotations stored in local storage
     */
    get localAnnotations() {
        const annotations = cache.get('box-preview-annotations') || [];

        // @NOTE(tjin): Temporary hack to generate Annotation value objects from
        // deserialized annotations objects
        annotations.forEach((annotation, index) => {
            annotations[index] = new Annotation({
                annotationID: annotation._annotationID,
                fileVersionID: annotation._fileVersionID,
                threadID: annotation._threadID,
                type: annotation._type,
                text: annotation._text,
                location: annotation._location,
                user: annotation._user,
                created: annotation._created,
                modified: annotation._modified
            });
        });

        return annotations;
    }

    /**
     * Saves annotations in local storage
     *
     * @param {Annotation[]} annotations Annotations to save
     * @returns {void}
     */
    set localAnnotations(annotations) {
        cache.set('box-preview-annotations', annotations, true /* useLocalStorage */);
    }
}

export default LocalStorageAnnotationService;
