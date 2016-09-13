/**
 * @fileoverview Base annotator class that implements point annotations.
 * Viewer-specific annotations should extend this for other annotation types
 * or to modify point annotation behavior.
 *
 * The following abstract methods must be implemented by a child class:
 * getLocationFromEvent() - get annotation location from DOM event
 * createAnnotationThread() - create and cache appropriate annotation thread
 * @author tjin
 */

import autobind from 'autobind-decorator';
import Browser from '../browser';
import EventEmitter from 'events';
import LocalStorageAnnotationService from './localstorage-annotation-service';
import Notification from '../notification';
import * as constants from './annotation-constants';
import { CLASS_ACTIVE } from '../constants';

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
     * @property {string} fileVersionID File version ID
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

        this.notification = new Notification(this._annotatedElement);
    }

    /**
     * [destructor]
     *
     * @returns {void}
     */
    destroy() {
        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                this.unbindCustomListenersOnThread(thread);
            });
        });
        this.unbindDOMListeners();
    }

    /**
     * Initializes annotator.
     *
     * @returns {void}
     */
    init() {
        this.setScale(1);
        this.setupAnnotations();

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
        this.fetchAnnotations().then(this.renderAnnotations);
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
     * Hides annotations on a specified page.
     *
     * @returns {void}
     */
    hideAnnotationsOnPage(pageNum) {
        if (this._threads[pageNum]) {
            this._threads[pageNum].forEach((thread) => {
                thread.hide();
            });
        }
    }

    /**
     * Renders annotations from memory.
     *
     * @returns {void}
     * @private
     */
    renderAnnotations() {
        this.hideAnnotations();

        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                thread.show();
            });
        });
    }

    /**
     * Renders annotations from memory for a specified page.
     *
     * @returns {void}
     * @private
     */
    renderAnnotationsOnPage(pageNum) {
        if (this._threads[pageNum]) {
            this.hideAnnotationsOnPage(pageNum);
            this._threads[pageNum].forEach((thread) => {
                thread.show();
            });
        }
    }

    /**
     * Sets the zoom scale.
     *
     * @param {number} scale
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
        if (this.isInPointMode()) {
            this.notification.hide();

            this.emit('pointmodeexit');
            this._annotatedElement.classList.remove(constants.CLASS_ANNOTATION_POINT_MODE);
            if (buttonEl) {
                buttonEl.classList.remove(CLASS_ACTIVE);
            }

            this.unbindPointModeListeners(); // Disable point mode
            this.bindDOMListeners(); // Re-enable other annotations

        // Otherwise, enable annotation mode
        } else {
            this.notification.show(__('notification_annotation_mode'));

            this.emit('pointmodeenter');
            this._annotatedElement.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
            if (buttonEl) {
                buttonEl.classList.add(CLASS_ACTIVE);
            }

            this.unbindDOMListeners(); // Disable other annotations
            this.bindPointModeListeners();  // Enable point mode
        }
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Must be implemented to return an annotation location object from the DOM
     * event.
     *
     * @param {Event} event DOM event
     * @param {string} annotationType Type of annotation
     * @returns {Object} Location object
     */
    /* eslint-disable no-unused-vars */
    getLocationFromEvent(event, annotationType) {}
    /* eslint-enable no-unused-vars */

    /**
     * Must be implemented to create the appropriate new thread, add it to the
     * in-memory map, and return the thread.
     *
     * @param {Annotation[]} annotations Annotations in thread
     * @param {Object} location Location object
     * @param {string} type Annotation type
     * @returns {AnnotationThread} Created annotation thread
     */
    /* eslint-disable no-unused-vars */
    createAnnotationThread(annotations, location, type) {}
    /* eslint-enable no-unused-vars */

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Annotations setup.
     *
     * @returns {void}
     * @protected
     */
    setupAnnotations() {
        // Map of page => [threads on page]
        this._threads = {};
        this.bindDOMListeners();
    }

    /**
     * Fetches persisted annotations, creates threads as needed, and generates
     * an in-memory map of page to threads.
     *
     * @returns {Promise} Promise for fetching saved annotations
     * @protected
     */
    fetchAnnotations() {
        this._threads = {};

        return this._annotationService.getThreadMap(this._fileVersionID)
            .then((threadMap) => {
                // Generate map of page to threads
                Object.keys(threadMap).forEach((threadID) => {
                    const annotations = threadMap[threadID];
                    const firstAnnotation = annotations[0];
                    const thread = this.createAnnotationThread(annotations, firstAnnotation.location, firstAnnotation.type);

                    // Bind events on thread
                    this.bindCustomListenersOnThread(thread);
                });
            });
    }

    /**
     * Binds DOM event listeners. No-op here, but can be overridden by any
     * annotator that needs to bind event listeners to the DOM in the normal
     * state (ie not in any annotation mode).
     *
     * @returns {void}
     * @protected
     */
    bindDOMListeners() {}

    /**
     * Unbinds DOM event listeners. No-op here, but can be overridden by any
     * annotator that needs to bind event listeners to the DOM in the normal
     * state (ie not in any annotation mode).
     *
     * @returns {void}
     * @protected
     */
    unbindDOMListeners() {}

    /**
     * Binds custom event listeners for a thread.
     *
     * @param {AnnotationThread} thread Thread to bind events to
     * @returns {void}
     * @protected
     */
    bindCustomListenersOnThread(thread) {
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
            this.unbindCustomListenersOnThread(thread);
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
     * @protected
     */
    unbindCustomListenersOnThread(thread) {
        thread.removeAllListeners('threaddeleted');
        thread.removeAllListeners('threadcleanup');
        thread.removeAllListeners('annotationcreateerror');
        thread.removeAllListeners('annotationdeleteerror');
    }

    /**
     * Binds event listeners for point annotation mode.
     *
     * @returns {void}
     * @protected
     */
    bindPointModeListeners() {
        this._annotatedElement.addEventListener('click', this.pointClickHandler);
    }

    /**
     * Unbinds event listeners for point annotation mode.
     *
     * @returns {void}
     * @protected
     */
    unbindPointModeListeners() {
        this._annotatedElement.removeEventListener('click', this.pointClickHandler);
    }

    /**
     * Event handler for adding a point annotation. Creates a point annotation
     * thread at the clicked location.
     *
     * @param {Event} event DOM event
     * @returns {void}
     * @protected
     */
    pointClickHandler(event) {
        event.stopPropagation();

        // Exits point annotation mode on first click
        this.togglePointModeHandler();

        // Determine if a point annotation dialog is already open and close the
        // current open dialog
        const hasPendingThreads = this._destroyPendingThreads();
        if (hasPendingThreads) {
            return;
        }

        // Get annotation location from click event, ignore click if location is invalid
        const location = this.getLocationFromEvent(event, constants.ANNOTATION_TYPE_POINT);
        if (!location) {
            return;
        }

        // Create new thread with no annotations, show indicator, and show dialog
        const thread = this.createAnnotationThread([], location, constants.ANNOTATION_TYPE_POINT);
        thread.show();

        // Bind events on thread
        this.bindCustomListenersOnThread(thread);
    }

    /**
     * Adds thread to in-memory map.
     *
     * @param {AnnotationThread} thread Thread to add
     * @returns {void}
     * @protected
     */
    addThreadToMap(thread) {
        // Add thread to in-memory map
        const page = thread.location.page || 1; // Defaults to page 1 if thread has no page
        this._threads[page] = this._threads[page] || [];
        this._threads[page].push(thread);
    }

    /**
     * Returns whether or not annotator is in point mode.
     *
     * @returns {boolean} Whether or not in point mode
     * @protected
     */
    isInPointMode() {
        return this._annotatedElement.classList.contains(constants.CLASS_ANNOTATION_POINT_MODE);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Destroys pending threads.
     *
     * @returns {boolean} Whether or not any pending threads existed on the
     * current file
     * @private
     */
    _destroyPendingThreads() {
        let hasPendingThreads = false;
        Object.keys(this._threads).forEach((page) => {
            this._threads[page]
                .forEach((pendingThread) => {
                    if (pendingThread.state === constants.ANNOTATION_STATE_PENDING) {
                        hasPendingThreads = true;
                        pendingThread.destroy();
                    }
                });
        });
        return hasPendingThreads;
    }
}

export default Annotator;
