/**
 * @fileoverview Base annotator class that implements point annotations.
 * Viewer-specific annotations should extend this for other annotation types
 * or to modify point annotation behavior.
 *
 * The following methods should be overridden by a child class:
 * _bindDOMListeners() - bind DOM listeners to the annotated element
 * _unbindDOMListeners() - unbind DOM listeners to the annotated element
 * _getLocationFromEvent() - get annotation location from DOM event
 * _createAnnotationThread() - create and cache appropriate annotation thread
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Browser from '../browser';
import EventEmitter from 'events';
import LocalStorageAnnotationService from './localstorage-annotation-service';
import * as constants from './annotation-constants';
import { CLASS_ACTIVE } from '../constants';

const POINT_ANNOTATION_TYPE = 'point';
const POINT_STATE_PENDING = 'pending';

@autobind
class Annotator extends EventEmitter {

    //--------------------------------------------------------------------------
    // Typedef
    //--------------------------------------------------------------------------

    /**
     * The data object for constructing an Annotator.
     * @typedef {Object} AnnotatorData
     * @property {HTMLElement} annotatedElement HTML element to annotate on
     * @property {AnnotationService|LocalStorageAnnotationService} [annotationService] Annotations CRUD service
     * @property {String} fileVersionID File version ID
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotatorData} data Data for constructing an Annotator
     * @returns {Annotator} Annotator instance
     */
    constructor(data) {
        super();

        this._annotatedElement = data.annotatedElement;
        this._annotationService = data.annotationService || new LocalStorageAnnotationService();
        this._fileVersionID = data.fileVersionID;
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                this._unbindCustomListenersOnThread(thread);
            });
        });
        this._unbindDOMListeners();
    }

    /**
     * Initializes annotator.
     *
     * @returns {void}
     */
    init() {
        this.setScale(1);
        this._setupAnnotations();

        // Add IE-specific class for custom cursors
        if (Browser.getName() === 'Explorer') {
            this._annotatedElement.classList.add('ie');
        }
    }

    /**
     * Fetches and shows saved annotations.
     *
     * @returns {void}
     */
    showAnnotations() {
        // Show annotations after we've generated an in-memory map
        this._fetchAnnotations().then(this.renderAnnotations);
    }

    /**
     * Hides annotations.
     *
     * @returns {void}
     */
    hideAnnotations() {
        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                thread.hide();
            });
        });
    }

    /**
     * Renders annotations from memory.
     *
     * @returns {void}
     * @private
     */
    renderAnnotations() {
        this.hideAnnotations();
        this._showAnnotations();
    }

    /**
     * Sets the zoom scale.
     *
     * @param {Number} scale
     * @returns {void}
     */
    setScale(scale) {
        this._annotatedElement.setAttribute('data-scale', scale);
    }

    /**
     * Toggles point annotation mode on and off. When point annotation mode is
     * on, clicking an area will create a point annotation at that location.
     *
     * @param {HTMLEvent} event DOM event
     * @returns {void}
     */
    togglePointModeHandler(event = {}) {
        // This unfortunately breaks encapsulation, but the header currently
        // doesn't manage its own functionality
        let buttonEl = event.target;
        if (!buttonEl) {
            const containerEl = document.querySelector('.box-preview-header');
            buttonEl = containerEl ? containerEl.querySelector('.box-preview-btn-annotate') : null;
        }

        this._destroyPendingThreads();

        // If in annotation mode, turn it off
        if (this._isInPointMode()) {
            this.emit('pointmodeexit');
            this._annotatedElement.classList.remove(constants.CLASS_ANNOTATION_POINT_MODE);
            if (buttonEl) {
                buttonEl.classList.remove(CLASS_ACTIVE);
            }

            this._unbindPointModeListeners(); // Disable point mode
            this._bindDOMListeners(); // Re-enable other annotations

        // Otherwise, enable annotation mode
        } else {
            this.emit('pointmodeenter');
            this._annotatedElement.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
            if (buttonEl) {
                buttonEl.classList.add(CLASS_ACTIVE);
            }

            this._unbindDOMListeners(); // Disable other annotations
            this._bindPointModeListeners();  // Enable point mode
        }
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @returns {void}
     * @private
     */
    _setupAnnotations() {
        // Map of page => [threads on page]
        this._threads = {};
        this._bindDOMListeners();
    }

    /**
     * Fetches persisted annotations, creates threads as needed, and generates
     * an in-memory map of page to threads.
     *
     * @returns {Promise} Promise for fetching saved annotations
     * @private
     */
    _fetchAnnotations() {
        this._threads = {};

        // @TODO(tjin): Load/unload annotations by page based on pages loaded from document viewer
        return this._annotationService.getThreadMap(this._fileVersionID)
            .then((threadMap) => {
                // Generate map of page to threads
                Object.keys(threadMap).forEach((threadID) => {
                    const annotations = threadMap[threadID];
                    const firstAnnotation = annotations[0];
                    const thread = this._createAnnotationThread(annotations, firstAnnotation.location, firstAnnotation.type);

                    // Bind events on thread
                    this._bindCustomListenersOnThread(thread);
                });
            });
    }

    /**
     * Shows annotations.
     *
     * @returns {void}
     * @private
     */
    _showAnnotations() {
        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                thread.show();
            });
        });
    }

    /**
     * Binds DOM event listeners. No-op here, but should be overridden by any
     * annotator that needs to bind event listeners to the DOM in the normal
     * state (ie not in any annotation mode).
     *
     * @returns {void}
     * @private
     */
    _bindDOMListeners() {}

    /**
     * Unbinds DOM event listeners. No-op here, but should be overridden by any
     * annotator that needs to bind event listeners to the DOM in the normal
     * state (ie not in any annotation mode).
     *
     * @returns {void}
     * @private
     */
    _unbindDOMListeners() {}

    /**
     * Binds custom event listeners for a thread.
     *
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @private
     */
    _bindCustomListenersOnThread(thread) {
        // Thread was deleted, remove from thread map
        thread.addListener('threaddeleted', () => {
            const page = thread.location.page || 1;

            // Remove from map
            if (this._threads[page] instanceof Array) {
                this._threads[page] = this._threads[page].filter((searchThread) => searchThread.threadID !== thread.threadID);
            }
        });

        // Thread should be cleaned up, unbind listeners - we don't do this
        // in threaddeleted listener since thread may still need to respond
        // to error messages
        thread.addListener('threadcleanup', () => {
            this._unbindCustomListenersOnThread(thread);
        });

        thread.addListener('annotationcreateerror', () => {
            // @TODO(tjin): Show annotation creation error
        });

        thread.addListener('annotationdeleteerror', () => {
            // Need to re-fetch and re-render annotations since we can't easily
            // recover an annotation removed from the client-side map
            this.showAnnotations();

            // @TODO(tjin): Show annotation deletion error
        });
    }

    /**
     * Unbinds custom event listeners for the thread.
     *
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @private
     */
    _unbindCustomListenersOnThread(thread) {
        thread.removeAllListeners(['threaddeleted']);
        thread.removeAllListeners(['annotationcreateerror']);
        thread.removeAllListeners(['annotationdeleteerror']);
    }

    /**
     * Binds event listeners for point annotation mode.
     *
     * @returns {void}
     * @private
     */
    _bindPointModeListeners() {
        this._annotatedElement.addEventListener('click', this._pointClickHandler);
    }

    /**
     * Unbinds event listeners for point annotation mode.
     *
     * @returns {void}
     * @private
     */
    _unbindPointModeListeners() {
        this._annotatedElement.removeEventListener('click', this._pointClickHandler);
    }

    /**
     * Event handler for adding a point annotation. Creates a point annotation
     * thread at the clicked location.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @private
     */
    _pointClickHandler(event) {
        event.stopPropagation();

        // Destroy any pending threads
        this._destroyPendingThreads();

        // Get annotation location from click event, ignore click if location is invalid
        const location = this._getLocationFromEvent(event, POINT_ANNOTATION_TYPE);
        if (!location) {
            return;
        }

        // Create new thread with no annotations, show indicator, and show dialog
        const thread = this._createAnnotationThread([], location, POINT_ANNOTATION_TYPE);
        thread.show();

        // Bind events on thread
        this._bindCustomListenersOnThread(thread);
    }

    /**
     * This should be overridden to return an annotation location object from
     * the DOM event.
     *
     * @param {Event} event DOM event
     * @param {string} annotationType Type of annotation
     * @returns {Object} Location object
     */
    /* eslint-disable no-unused-vars */
    _getLocationFromEvent(event, annotationType) {}
    /* eslint-enable no-unused-vars */

    /**
     * This should be overridden to create a new annotation thread as
     * appropriate, add it to the in-memory map, and return the thread.
     *
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {String} type Annotation type
     * @returns {AnnotationThread} Created annotation thread
     * @private
     */
    /* eslint-disable no-unused-vars */
    _createAnnotationThread(annotations, location, type) {}
    /* eslint-enable no-unused-vars */

    /**
     * Adds thread to in-memory map.
     *
     * @param {AnnotationThread} thread Thread to add
     * @returns {void}
     * @private
     */
    _addThreadToMap(thread) {
        // Add thread to in-memory map
        const page = thread.location.page || 1; // Defaults to page 1 if thread has no page
        this._threads[page] = this._threads[page] || [];
        this._threads[page].push(thread);
    }

    /**
     * Returns whether or not annotator is in point mode.
     *
     * @returns {Boolean} Whether or not in point mode
     * @private
     */
    _isInPointMode() {
        return this._annotatedElement.classList.contains(constants.CLASS_ANNOTATION_POINT_MODE);
    }

    /**
     * Destroys pending threads.
     *
     * @returns {void}
     * @private
     */
    _destroyPendingThreads() {
        Object.keys(this._threads).forEach((page) => {
            this._threads[page]
                .filter((thread) => thread.state === POINT_STATE_PENDING)
                .forEach((pendingThread) => {
                    pendingThread.destroy();
                });
        });
    }
}

export default Annotator;
