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

        this.annotatedElement = data.annotatedElement;
        this.annotations = data.annotations || [];
        this.annotationService = data.annotationService;
        this.fileVersionID = data.fileVersionID;
        this.location = data.location;
        this.threadID = data.threadID || AnnotationService.generateID();
        this.user = data.user;
        this.type = data.type;

        this._setup();
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        if (this.dialog) {
            this._unbindCustomListenersOnDialog();
            this.dialog.destroy();
        }

        if (this.element) {
            this._unbindDOMListeners();

            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }

            this.element = null;
        }

        this.emit('threaddeleted');
    }

    /**
     * Shows the annotation indicator.
     *
     * @returns {void}
     */
    show() {
        const pageEl = this.annotatedElement.querySelector(`[data-page-number="${this.location.page}"]`) || this.annotatedElement;
        const [browserX, browserY] = annotatorUtil.getBrowserCoordinatesFromLocation(this.location, this.annotatedElement);

        // Position and append to page
        this.element.style.left = `${browserX - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        this.element.style.top = `${browserY - POINT_ANNOTATION_ICON_WIDTH / 2}px`;
        pageEl.appendChild(this.element);

        annotatorUtil.showElement(this.element);

        if (this.state === POINT_STATE_PENDING) {
            this._showDialog();
        }
    }

    /**
     * Hides the annotation indicator.
     *
     * @returns {void}
     */
    hide() {
        annotatorUtil.hideElement(this.element);
    }

    /**
     * Reset state to inactive.
     *
     * @returns {void}
     */
    reset() {
        this.state = POINT_STATE_INACTIVE;
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
        return this.annotationService.create(annotationData).then((savedAnnotation) => {
            this.annotations.push(savedAnnotation);

            // Add annotation element to dialog
            if (this.dialog) {
                this.dialog.addAnnotation(savedAnnotation);
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
        return this.annotationService.delete(annotationID).then(() => {
            this.annotations = this.annotations.filter((annotation) => annotation.annotationID !== annotationID);

            // If this annotation was the last one in the thread
            if (this.annotations.length === 0) {
                // Destroy
                this.destroy();

            // Otherwise, remove deleted annotation from dialog
            } else {
                if (this.dialog) {
                    this.dialog.removeAnnotation(annotationID);
                }
            }
        });
    }

    /**
     * Gets thread state.
     *
     * @returns {String} Thread state
     */
    getState() {
        return this.state;
    }

    /**
     * Gets thread type.
     *
     * @returns {String} Thread type
     */
    getType() {
        return this.type;
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
        if (this.annotations.length === 0) {
            this.state = POINT_STATE_PENDING;
        } else {
            this.state = POINT_STATE_INACTIVE;
        }

        this.dialog = new AnnotationDialog({
            annotatedElement: this.annotatedElement,
            annotations: this.annotations,
            location: this.location
        });
        this._bindCustomListenersOnDialog();

        this.element = this._createElement();
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
        this.element.addEventListener('click', this._showDialog);
        this.element.addEventListener('mouseover', this._showDialog);
        this.element.addEventListener('mouseout', this._mouseoutHandler);
    }

    /**
     * Unbinds DOM event listeners for the thread.
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {
        this.element.removeEventListener('click', this._showDialog);
        this.element.removeEventListener('mouseover', this._showDialog);
        this.element.removeEventListener('mouseout', this._mouseoutHandler);
    }

    /**
     * Mouseout handler. Hides dialog if we aren't creating the first one.
     *
     * @returns {void}
     * @private
     */
    _mouseoutHandler() {
        if (this.annotations.length !== 0) {
            this.hideDialog();
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
        this.dialog.addListener('annotationcreate', (data) => {
            this.saveAnnotation(POINT_ANNOTATION_TYPE, data.text);
        });

        // Annotation canceled
        this.dialog.addListener('annotationcancel', () => {
            this.destroy();
        });

        // Annotation deleted
        this.dialog.addListener('annotationdelete', (data) => {
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
        if (this.dialog && !annotatorUtil.isSelectionPresent()) {
            this.dialog.show();
        }
    }

    /**
     * Hides the appropriate annotation dialog for this thread.
     *
     * @returns {void}
     * @private
     */
    _hideDialog() {
        if (this.dialog) {
            this.dialog.hide();
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
            fileVersionID: this.fileVersionID,
            type,
            text,
            location: this.location,
            user: this.user,
            threadID: this.threadID
        };
    }
}

export default AnnotationThread;
