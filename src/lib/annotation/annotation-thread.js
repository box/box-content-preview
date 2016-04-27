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
     *
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
        this._element.style.top = `${browserY - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
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
     * @returns {Promise} Promise
     */
    saveAnnotation(type, text) {
        const annotationData = this._createAnnotationData(type, text);
        return this._annotationService.create(annotationData).then((savedAnnotation) => {
            this._annotations.push(savedAnnotation);

            // Add annotation element to dialog
            if (this._dialog) {
                this._dialog.addAnnotation(savedAnnotation);
            }

            this.reset();
        }).catch(() => {/* No-op */});
    }

    /**
     * Deletes an annotation.
     *
     * @param {String} annotationID ID of annotation to delete
     * @returns {Promise} Promise
     */
    deleteAnnotation(annotationID) {
        return this._annotationService.delete(annotationID).then(() => {
            this._annotations = this._annotations.filter((annotation) => annotation.annotationID !== annotationID);

            // If this annotation was the last one in the thread
            if (this._annotations.length === 0) {
                // Destroy
                this.destroy();

            // Otherwise, remove deleted annotation from dialog
            } else {
                if (this._dialog) {
                    this._dialog.removeAnnotation(annotationID);
                }
            }
        });
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
     * Creates the HTML for the annotation indicator.
     *
     * @returns {HTMLElement} HTML element
     * @private
     */
    _createElement() {
        const indicatorEl = document.createElement('button');
        indicatorEl.classList.add('box-preview-point-annotation-btn');
        indicatorEl.setAttribute('data-type', 'annotation-thread');
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
     * Create an annotation data object to pass to annotation service.
     *
     * @param {String} type Type of annotation
     * @param {String} text Annotation text
     * @returns {Object} Annotation data
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
