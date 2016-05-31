/**
 * @fileoverview Base annotation thread class. This implements a 'thread' with
 * annotations that manages an indicator element (point icon in the case of
 * point annotations) and dialogs for creating/deleting annotations.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Annotation from './annotation';
import AnnotationDialog from './annotation-dialog';
import AnnotationService from './annotation-service';
import EventEmitter from 'events';

import * as annotatorUtil from './annotator-util';

const PAGE_PADDING_TOP = 15;
const POINT_ANNOTATION_ICON_WIDTH = 18;
const POINT_ANNOTATION_TYPE = 'point';
const POINT_STATE_INACTIVE = 'inactive';
const POINT_STATE_PENDING = 'pending';

@autobind
class AnnotationThread extends EventEmitter {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing a thread.
     * @typedef {Object} AnnotationThreadData
     * @property {HTMLElement} annotatedElement HTML element being annotated on
     * @property {Annotation[]} [annotations] Annotations in thread - none if
     * this is a new thread
     * @property {LocalStorageAnnotationService} annotationService Annotations CRUD service
     * @property {String} fileVersionID File version ID
     * @property {Object} location Location object
     * @property {String} threadID Thread ID
     * @property {Object} user User creating the thread
     * @property {String} type Type of thread
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

        this._annotatedElement = data.annotatedElement;
        this._annotations = data.annotations || [];
        this._annotationService = data.annotationService;
        this._fileVersionID = data.fileVersionID;
        this._location = data.location;
        this._threadID = data.threadID || AnnotationService.generateID();
        this._user = data.user;
        this._type = data.type;

        this._setup();
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        if (this._dialog) {
            this._unbindCustomListenersOnDialog();
            this._dialog.destroy();
        }

        if (this._element) {
            this._unbindDOMListeners();

            if (this._element.parentNode) {
                this._element.parentNode.removeChild(this._element);
            }

            this._element = null;
        }

        this.emit('threaddeleted');
    }

    /**
     * Shows the annotation indicator.
     *
     * @returns {void}
     */
    show() {
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`) || this._annotatedElement;
        const [browserX, browserY] = annotatorUtil.getBrowserCoordinatesFromLocation(this._location, this._annotatedElement);

        // Position and append to page
        this._element.style.left = `${browserX - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        // Add 15px for vertical padding on page
        this._element.style.top = `${browserY - POINT_ANNOTATION_ICON_WIDTH / 2 + PAGE_PADDING_TOP}px`;
        pageEl.appendChild(this._element);

        annotatorUtil.showElement(this._element);

        if (this._state === POINT_STATE_PENDING) {
            this._showDialog();
        }
    }

    /**
     * Hides the annotation indicator.
     *
     * @returns {void}
     */
    hide() {
        annotatorUtil.hideElement(this._element);
    }

    /**
     * Reset state to inactive.
     *
     * @returns {void}
     */
    reset() {
        this._state = POINT_STATE_INACTIVE;
    }

    /**
     * Saves an annotation.
     *
     * @param {String} type Type of annotation
     * @param {String} text Text of annotation to save
     * @returns {void}
     */
    saveAnnotation(type, text) {
        const annotationData = this._createAnnotationData(type, text);

        // Save annotation on client
        const tempAnnotationID = AnnotationService.generateID();
        const tempAnnotationData = annotationData;
        tempAnnotationData.annotationID = tempAnnotationID;
        tempAnnotationData.created = (new Date()).getTime();
        tempAnnotationData.modified = tempAnnotationData.created;
        const tempAnnotation = new Annotation(tempAnnotationData);
        this._saveAnnotationToThread(tempAnnotation);

        // Save annotation on server
        this._annotationService.create(annotationData).then((savedAnnotation) => {
            // If no temporary annotation is found, save to thread normally
            const tempIdx = this._annotations.indexOf(tempAnnotation);
            if (tempIdx === -1) {
                this._saveAnnotationToThread(savedAnnotation);
            }

            // Otherwise, replace temporary annotation with annotation saved to server
            this._annotations[tempIdx] = savedAnnotation;

            if (this._dialog) {
                this._dialog.removeAnnotation(tempAnnotationID);
                this._dialog.addAnnotation(savedAnnotation);
            }
        }).catch(() => {
            // Remove temporary annotation
            this.deleteAnnotation(tempAnnotationID, /* useServer */ false);

            // Broadcast error
            this.emit('annotationcreateerror');
        });
    }

    /**
     * Deletes an annotation.
     *
     * @param {String} annotationID ID of annotation to delete
     * @param {Boolean} [useServer] Whether or not to delete on server, default true
     * @returns {void}
     */
    deleteAnnotation(annotationID, useServer = true) {
        // Delete annotation on client
        this._annotations = this._annotations.filter((annotation) => annotation.annotationID !== annotationID);

        // If this annotation was the last one in the thread, destroy the thread
        if (this._annotations.length === 0) {
            this.destroy();

        // Otherwise, remove deleted annotation from dialog
        } else if (this._dialog) {
            this._dialog.removeAnnotation(annotationID);
        }

        // Delete annotation on server
        if (useServer) {
            this._annotationService.delete(annotationID)
            .then(() => {
                // Broadcast thread cleanup if needed
                if (this._annotations.length === 0) {
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
    // Getters
    //--------------------------------------------------------------------------

    /**
     * Gets location.
     *
     * @returns {Object} Location
     */
    get location() {
        return this._location;
    }

    /**
     * Gets threadID.
     *
     * @returns {String} threadID
     */
    get threadID() {
        return this._threadID;
    }

    /**
     * Gets type.
     *
     * @returns {String} type
     */
    get type() {
        return this._type;
    }

    /**
     * Gets state.
     *
     * @returns {String} state
     */
    get state() {
        return this._state;
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
        if (this._annotations.length === 0) {
            this._state = POINT_STATE_PENDING;
        } else {
            this._state = POINT_STATE_INACTIVE;
        }

        this._dialog = new AnnotationDialog({
            annotatedElement: this._annotatedElement,
            annotations: this._annotations,
            location: this._location
        });
        this._bindCustomListenersOnDialog();

        this._element = this._createElement();
        this._bindDOMListeners();
    }

    /**
     * Saves the provided annotation to the thread and dialog if appropriate
     * and resets state to inactive.
     *
     * @param {Annotation} annotation Annotation to save
     * @returns {void}
     * @private
     */
    _saveAnnotationToThread(annotation) {
        this._annotations.push(annotation);

        if (this._dialog) {
            this._dialog.addAnnotation(annotation);
        }

        this.reset();
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
        indicatorEl.setAttribute('data-type', 'annotation-indicator');
        return indicatorEl;
    }

    /**
     * Binds DOM event listeners for the thread.
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {
        this._element.addEventListener('click', this._showDialog);
        this._element.addEventListener('mouseover', this._showDialog);
        this._element.addEventListener('mouseout', this._mouseoutHandler);
    }

    /**
     * Unbinds DOM event listeners for the thread.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        this._element.removeEventListener('click', this._showDialog);
        this._element.removeEventListener('mouseover', this._showDialog);
        this._element.removeEventListener('mouseout', this._mouseoutHandler);
    }

    /**
     * Binds custom event listeners for the dialog.
     *
     * @returns {void}
     * @private
     */
    _bindCustomListenersOnDialog() {
        // Annotation created
        this._dialog.addListener('annotationcreate', (data) => {
            this.saveAnnotation(POINT_ANNOTATION_TYPE, data.text);
        });

        // Annotation canceled
        this._dialog.addListener('annotationcancel', () => {
            this.destroy();
        });

        // Annotation deleted
        this._dialog.addListener('annotationdelete', (data) => {
            this.deleteAnnotation(data.annotationID);
        });
    }

    /**
     * Unbinds custom event listeners for the dialog.
     *
     * @returns {void}
     * @private
     */
    _unbindCustomListenersOnDialog() {
        this.removeAllListeners(['annotationcreate']);
        this.removeAllListeners(['annotationcancel']);
        this.removeAllListeners(['annotationdelete']);
    }

    /**
     * Shows the appropriate annotation dialog for this thread.
     *
     * @returns {void}
     * @private
     */
    _showDialog() {
        // Don't show dialog if there is a current selection
        if (this._dialog && !annotatorUtil.isSelectionPresent()) {
            this._dialog.show();
        }
    }

    /**
     * Hides the appropriate annotation dialog for this thread.
     *
     * @returns {void}
     * @private
     */
    _hideDialog() {
        if (this._dialog) {
            this._dialog.hide();
        }
    }

    /**
     * Mouseout handler. Hides dialog if we aren't creating the first one.
     *
     * @returns {void}
     * @private
     */
    _mouseoutHandler() {
        if (this._annotations.length !== 0) {
            this._hideDialog();
        }
    }

    /**
     * Create an annotation data object to pass to annotation service.
     *
     * @param {String} type Type of annotation
     * @param {String} text Annotation text
     * @returns {Object} Annotation data
     * @private
     */
    _createAnnotationData(type, text) {
        return {
            fileVersionID: this._fileVersionID,
            type,
            text,
            location: this._location,
            user: this._user,
            threadID: this._threadID
        };
    }
}

export default AnnotationThread;
