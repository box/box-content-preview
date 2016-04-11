/**
 * @fileoverview Base annotation thread class. This implements a 'thread' with
 * annotations that manages an indicator element (point icon in the case of
 * point annotations) and dialogs for creating/deleting annotations.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationDialog from './annotation-dialog';
import AnnotationService from './annotation-service';
import EventEmitter from 'events';

import * as annotatorUtil from './annotator-util';

const POINT_ANNOTATION_ICON_WIDTH = 16;

@autobind
class AnnotationThread extends EventEmitter {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing a thread.
     *
     * @typedef {Object} AnnotationThreadData
     * @property {Annotation[]} [annotations] Annotations in thread - none if
     * this is a new thread
     * @property {AnnotationService} annotationService Annotations CRUD service
     * @property {String} fileVersionID File version ID
     * @property {Object} location Location object
     * @property {String} threadID Thread ID
     * @property {Object} user User creating the thread
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationThreadData} data Data for constructing thread
     * @returns {AnnotationThread} Annotation thread instance
     */
    constructor(data) {
        super();

        this.annotations = data.annotations || [];
        this.annotationService = data.annotationService;
        this.fileVersionID = data.fileVersionID;
        this.location = data.location;
        this.threadID = data.threadID || AnnotationService.generateID();
        this.user = data.user;

        this._setup();
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        this.dialog.destroy();

        this._unbindCustomListeners();
        this._unbindDOMListeners();

        this.element.parentNode.removeChild(this.element);
        this.element = null;
    }

    /**
     * Shows the annotation indicator.
     *
     * @returns {void}
     */
    show() {
        const pageEl = document.querySelector(`[data-page-number="${location.page}"]`);
        if (!pageEl) {
            return;
        }

        const pageHeight = pageEl.getBoundingClientRect().height;
        const [browserX, browserY] = annotatorUtil.convertPDFSpaceToDOMSpace([location.x, location.y], pageHeight, this.scale);

        // Position and append to page
        this.element.style.left = `${browserX - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        this.element.style.top = `${browserY - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        pageEl.appendChild(this.element);

        annotatorUtil.showElement(this.element);
    }

    /**
     * Shows the appropriate annotation dialog for this thread.
     *
     * @returns {void}
     */
    showDialog() {
        this.dialog.show();
    }

    /**
     * Hides the appropriate annotation dialog for this thread.
     *
     * @returns {void}
     */
    hideDialog() {
        this.dialog.hide();
    }

    /**
     * Saves an annotation.
     *
     * @param {String} text Text of annotation to save
     * @returns {void}
     */
    saveAnnotation(text) {
        const annotationData = this._createAnnotationData(text);
        this.annotationService.create(annotationData).then((savedAnnotation) => {
            this.annotations.push(savedAnnotation);

            // If this is the first annotation in the thread
            if (this.annotations.length === 1) {
                // Broadcast that a thread was created
                this.emit('threadcreated', this);
            }

            // Add new annotation to dialog
            this.dialog.addAnnotation(savedAnnotation);
        }).catch(() => {/* No-op */});
    }

    /**
     * Deletes an annotation.
     *
     * @param {String} annotationID ID of annotation to delete
     * @returns {void}
     */
    deleteAnnotation(annotationID) {
        this.annotationService.delete(annotationID).then(() => {
            this.annotations = this.annotations.filter((annotation) => annotation.annotationID !== annotationID);

            // If this annotation was the last one in the thread
            if (this.annotations.length === 0) {
                // Broadcast that a thread was deleted and destroy the thread
                this.emit('threaddeleted', this);
                this.destroy();

            // Otherwise, remove deleted annotation from dialog
            } else {
                this.dialog.removeAnnotation(annotationID);
            }
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Sets up the thread. Creates HTML for annotation indicator, sets
     * appropriate dialog, and binds event listeners.
     *
     * @returns {void}
     * @private
     */
    _setup() {
        const dialogData = {
            threadID: this.threadID,
            location: this.location
        };

        this.dialog = new AnnotationDialog({
            annotations: this.annotations,
            location: this.location,
            threadID: this.threadID
        })

        // If there are no annotations, use the 'create' dialog
        if (this.annotations.length === 0) {
            this.dialog = new CreateAnnotationDialog(dialogData);

        // Otherwise, use the 'show' dialog
        } else {
            dialogData.annotations = this.annotations;
            this.dialog = new ShowAnnotationDialog(dialogData);
        }

        this.element = this._createElement();
        this._bindCustomListeners();
        this._bindDOMListeners();
    }

    /**
     * Creates the HTML for the annotation indicator.
     *
     * @returns {HTMLElement} HTML element
     * @private
     */
    _createElement() {
        const indicatorEl = document.createElement('button');
        indicatorEl.classList.add('box-preview-point-annotation-btn');
        indicatorEl.setAttribute('data-type', 'point-annotation-btn');
        indicatorEl.setAttribute('data-thread-id', this.threadID);

        return indicatorEl;
    }

    /**
     * Binds custom event listeners for the annotation.
     *
     * @returns {void}
     * @private
     */
    _bindCustomListeners() {
        // Annotation created
        this.addListener('annotationcreate', (data) => {
            if (data && data.threadID === this.threadID) {
                this.saveAnnotation(data.text);
            }
        });

        // Annotation canceled
        this.addListener('annotationcancel', (data) => {
            if (data && data.threadID === this.threadID) {
                this.destroy();
            }
        });

        // Annotation deleted
        this.addListener('annotationdelete', (data) => {
            if (data && data.threadID === this.threadID) {
                this.deleteAnnotation(data.annotationID);
            }
        });
    }

    /**
     * Unbinds custom event listeners for the annotation.
     *
     * @returns {void}
     * @private
     */
    _unbindCustomListeners() {
        this.removeAllListeners(['annotationcreate']);
        this.removeAllListeners(['annotationcancel']);
        this.removeAllListeners(['annotationdelete']);
    }

    /**
     * Binds DOM event listeners for the annotation.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        this.element.addEventListener('click', this.showDialog);
        this.element.addEventListener('mouseover', this.showDialog);
        this.element.addEventListener('mouseout', this.hideDialog);
    }

    /**
     * Unbinds DOM event listeners for the annotation.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        this.element.removeEventListener('click', this.showDialog);
        this.element.removeEventListener('mouseover', this.showDialog);
        this.element.removeEventListener('mouseout', this.hideDialog);
    }

    /**
     * Create an annotation data object to pass to annotation service.
     *
     * @param {String} text Annotation text
     * @returns {Object} Annotation data
     */
    _createAnnotationData(text) {
        return {
            fileVersionID: this.fileVersionID,
            type: 'point',
            text,
            location: this.location,
            user: this.user,
            threadID: this.threadID
        };
    }
}

export default AnnotationThread;
