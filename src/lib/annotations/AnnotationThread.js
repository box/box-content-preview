import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import Annotation from './Annotation';
import AnnotationService from './AnnotationService';
import * as annotatorUtil from './annotatorUtil';
import * as constants from './annotationConstants';
import { ICON_PLACED_ANNOTATION } from '../icons/icons';

@autobind class AnnotationThread extends EventEmitter {
    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing a thread.
     * @typedef {Object} AnnotationThreadData
     * @property {HTMLElement} annotatedElement HTML element being annotated on
     * @property {Annotation[]} [annotations] Annotations in thread - none if
     * this is a new thread
     * @property {AnnotationService} annotationService Annotations CRUD service
     * @property {string} fileVersionId File version ID
     * @property {Object} location Location object
     * @property {string} threadID Thread ID
     * @property {string} thread Thread number
     * @property {string} type Type of thread
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotationThreadData} data - Data for constructing thread
     * @return {AnnotationThread} Annotation thread instance
     */
    constructor(data) {
        super();

        this.annotatedElement = data.annotatedElement;
        this.annotations = data.annotations || [];
        this.annotationService = data.annotationService;
        this.fileVersionId = data.fileVersionId;
        this.location = data.location;
        this.threadID = data.threadID || AnnotationService.generateID();
        this.thread = data.thread || '';
        this.type = data.type;
        this.locale = data.locale;
        this.isMobile = data.isMobile;

        this.setup();
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.dialog) {
            this.unbindCustomListenersOnDialog();
            this.dialog.destroy();
        }

        if (this.element) {
            this.unbindDOMListeners();

            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.element = null;
        }

        this.emit('threaddeleted');
    }

    /**
     * Hides the annotation indicator.
     *
     * @return {void}
     */
    hide() {
        annotatorUtil.hideElement(this.element);
    }

    /**
     * Reset state to inactive.
     *
     * @return {void}
     */
    reset() {
        this.state = constants.ANNOTATION_STATE_INACTIVE;
    }

    /**
     * Shows the appropriate annotation dialog for this thread.
     *
     * @return {void}
     */
    showDialog() {
        // Prevents the annotations dialog from being created each mousemove
        if (!this.dialog.element) {
            this.dialog.setup(this.annotations);
        }

        this.dialog.show();
    }

    /**
     * Hides the appropriate annotation dialog for this thread.
     *
     * @return {void}
     */
    hideDialog() {
        if (this.dialog) {
            this.dialog.hide();
        }
    }

    /**
     * Saves an annotation.
     *
     * @param {string} type - Type of annotation
     * @param {string} text - Text of annotation to save
     * @return {void}
     */
    saveAnnotation(type, text) {
        const annotationData = this.createAnnotationData(type, text);

        // Save annotation on client
        const tempAnnotationID = AnnotationService.generateID();
        const tempAnnotationData = annotationData;
        tempAnnotationData.annotationID = tempAnnotationID;
        tempAnnotationData.permissions = {
            can_edit: true,
            can_delete: true
        };
        tempAnnotationData.created = new Date().getTime();
        tempAnnotationData.modified = tempAnnotationData.created;
        const tempAnnotation = new Annotation(tempAnnotationData);
        this.saveAnnotationToThread(tempAnnotation);

        // Changing state from pending
        this.state = constants.ANNOTATION_STATE_HOVER;

        // Save annotation on server
        this.annotationService
            .create(annotationData)
            .then((savedAnnotation) => {
                // If no temporary annotation is found, save to thread normally
                const tempIdx = this.annotations.indexOf(tempAnnotation);
                if (tempIdx === -1) {
                    this.saveAnnotationToThread(savedAnnotation);
                }

                // Add thread number to associated dialog and thread
                this.thread = this.thread || savedAnnotation.thread;
                this.dialog.element.dataset.threadNumber = this.thread;

                // Otherwise, replace temporary annotation with annotation saved to server
                this.annotations[tempIdx] = savedAnnotation;

                if (this.dialog) {
                    this.dialog.addAnnotation(savedAnnotation);
                    this.dialog.removeAnnotation(tempAnnotationID);
                }
            })
            .catch(() => {
                // Remove temporary annotation
                this.deleteAnnotation(tempAnnotationID, /* useServer */ false);

                // Broadcast error
                this.emit('annotationcreateerror');
            });
    }

    /**
     * Deletes an annotation.
     *
     * @param {string} annotationID - ID of annotation to delete
     * @param {boolean} [useServer] - Whether or not to delete on server, default true
     * @return {void}
     */
    deleteAnnotation(annotationID, useServer = true) {
        // Ignore if no corresponding annotation exists in thread or user doesn't have permissions
        const annotation = this.annotations.find((annot) => annot.annotationID === annotationID);
        if (!annotation || (annotation.permissions && !annotation.permissions.can_delete)) {
            return;
        }

        // Delete annotation on client
        this.annotations = this.annotations.filter((annot) => annot.annotationID !== annotationID);

        // If the user doesn't have permission to delete the entire highlight
        // annotation, display the annotation as a plain highlight
        let canDeleteAnnotation =
            this.annotations.length > 0 &&
            this.annotations[0].permissions &&
            this.annotations[0].permissions.can_delete;
        if (annotatorUtil.isPlainHighlight(this.annotations) && !canDeleteAnnotation) {
            this.cancelFirstComment();

            // If this annotation was the last one in the thread, destroy the thread
        } else if (this.annotations.length === 0 || annotatorUtil.isPlainHighlight(this.annotations)) {
            this.destroy();

            // Otherwise, remove deleted annotation from dialog
        } else if (this.dialog) {
            this.dialog.removeAnnotation(annotationID);
        }

        // Delete annotation on server
        if (useServer) {
            this.annotationService
                .delete(annotationID)
                .then(() => {
                    // Ensures that blank highlight comment is also deleted when removing
                    // the last comment on a highlight
                    canDeleteAnnotation =
                        this.annotations.length > 0 &&
                        this.annotations[0].permissions &&
                        this.annotations[0].permissions.can_delete;
                    if (annotatorUtil.isPlainHighlight(this.annotations) && canDeleteAnnotation) {
                        this.annotationService.delete(this.annotations[0].annotationID);
                    }

                    // Broadcast thread cleanup if needed
                    if (this.annotations.length === 0) {
                        this.emit('threadcleanup');
                    }
                })
                .catch(() => {
                    // Broadcast error
                    this.emit('annotationdeleteerror');
                });
        }
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Cancels the first comment on the thread
     *
     * @return {void}
     */
    cancelFirstComment() {}

    /**
     * Must be implemented to show the annotation indicator.
     *
     * @return {void}
     */
    show() {}

    /**
     * Must be implemented to create the appropriate annotation dialog and save
     * as a property on the thread.
     *
     * @return {void}
     */
    createDialog() {}

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Sets up the thread. Creates HTML for annotation indicator, sets
     * appropriate dialog, and binds event listeners.
     *
     * @protected
     * @return {void}
     */
    setup() {
        if (this.annotations.length === 0) {
            this.state = constants.ANNOTATION_STATE_PENDING;
        } else {
            this.state = constants.ANNOTATION_STATE_INACTIVE;
        }

        this.createDialog();
        this.bindCustomListenersOnDialog();

        if (this.dialog) {
            this.dialog.isMobile = this.isMobile;
        }

        this.setupElement();
    }

    /**
     * Sets up indicator element.
     *
     * @protected
     * @return {void}
     */
    setupElement() {
        this.element = this.createElement();
        this.bindDOMListeners();
    }

    /**
     * Binds DOM event listeners for the thread.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        if (!this.element) {
            return;
        }

        this.element.addEventListener('click', this.showDialog);
        this.element.addEventListener('mouseenter', this.showDialog);

        if (!this.isMobile) {
            this.element.addEventListener('mouseleave', this.mouseoutHandler);
        }
    }

    /**
     * Unbinds DOM event listeners for the thread.
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        if (!this.element) {
            return;
        }

        this.element.removeEventListener('click', this.showDialog);
        this.element.removeEventListener('mouseenter', this.showDialog);

        if (!this.isMobile) {
            this.element.removeEventListener('mouseleave', this.mouseoutHandler);
        }
    }

    /**
     * Binds custom event listeners for the dialog.
     *
     * @protected
     * @return {void}
     */
    bindCustomListenersOnDialog() {
        if (!this.dialog) {
            return;
        }

        this.dialog.addListener('annotationcreate', this.createAnnotation);
        this.dialog.addListener('annotationcancel', this.destroy);
        this.dialog.addListener('annotationdelete', this.deleteAnnotationWithID);
    }

    /**
     * Unbinds custom event listeners for the dialog.
     *
     * @protected
     * @return {void}
     */
    unbindCustomListenersOnDialog() {
        if (!this.dialog) {
            return;
        }

        this.dialog.removeAllListeners('annotationcreate');
        this.dialog.removeAllListeners('annotationcancel');
        this.dialog.removeAllListeners('annotationdelete');
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Creates the HTML for the annotation indicator.
     *
     * @private
     * @return {HTMLElement} HTML element
     */
    createElement() {
        const indicatorEl = document.createElement('button');
        indicatorEl.classList.add('bp-point-annotation-btn');
        indicatorEl.setAttribute('data-type', 'annotation-indicator');
        indicatorEl.innerHTML = ICON_PLACED_ANNOTATION;
        return indicatorEl;
    }

    /**
     * Mouseout handler. Hides dialog if we aren't creating the first one.
     *
     * @private
     * @return {void}
     */
    mouseoutHandler() {
        if (this.annotations.length !== 0) {
            this.hideDialog();
        }
    }

    /**
     * Saves the provided annotation to the thread and dialog if appropriate
     * and resets state to inactive.
     *
     * @private
     * @param {Annotation} annotation - Annotation to save
     * @return {void}
     */
    saveAnnotationToThread(annotation) {
        this.annotations.push(annotation);

        if (this.dialog) {
            this.dialog.addAnnotation(annotation);
        }
    }

    /**
     * Create an annotation data object to pass to annotation service.
     *
     * @private
     * @param {string} type - Type of annotation
     * @param {string} text - Annotation text
     * @return {Object} Annotation data
     */
    createAnnotationData(type, text) {
        return {
            fileVersionId: this.fileVersionId,
            type,
            text,
            location: this.location,
            user: this.annotationService.user,
            threadID: this.threadID,
            thread: this.thread
        };
    }

    /**
     * Creates a new point annotation
     *
     * @private
     * @param data - Annotation data
     * @return {void}
     */
    createAnnotation(data) {
        this.saveAnnotation(constants.ANNOTATION_TYPE_POINT, data.text);
    }

    /**
     * Deletes annotation with annotationID from thread
     *
     * @private
     * @param data - Annotation data
     * @return {void}
     */
    deleteAnnotationWithID(data) {
        this.deleteAnnotation(data.annotationID);
    }
}

export default AnnotationThread;
