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

import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import Notification from '../notification';
import AnnotationService from './annotation-service';
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
     * @property {AnnotationService} [annotationService] Annotations CRUD service
     * @property {string} fileVersionID File version ID
     */

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * [constructor]
     *
     * @param {AnnotatorData} data - Data for constructing an Annotator
     * @return {Annotator} Annotator instance
     */
    constructor(data) {
        super();
        this._annotatedElement = data.annotatedElement;
        this._annotationService = data.annotationService;
        this._fileVersionID = data.fileVersionID;
        this._locale = data.locale;

        this.notification = new Notification(this._annotatedElement);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this._threads) {
            Object.keys(this._threads).forEach((page) => {
                this._threads[page].forEach((thread) => {
                    this.unbindCustomListenersOnThread(thread);
                });
            });
        }

        this.unbindDOMListeners();
        this.unbindCustomListenersOnService();
    }

    /**
     * Initializes annotator.
     *
     * @return {void}
     */
    init() {
        this.setScale(1);
        this.setupAnnotations();
    }

    /**
     * Fetches and shows saved annotations.
     *
     * @return {void}
     */
    showAnnotations() {
        // Show annotations after we've generated an in-memory map
        this.fetchAnnotations().then(this.renderAnnotations);
    }

    /**
     * Hides annotations.
     *
     * @return {void}
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
     * @return {void}
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
     * @private
     * @return {void}
     */
    renderAnnotations() {
        Object.keys(this._threads).forEach((page) => {
            this._threads[page].forEach((thread) => {
                thread.show();
            });
        });
    }

    /**
     * Renders annotations from memory for a specified page.
     *
     * @private
     * @param {number} pageNum - Page number
     * @return {void}
     */
    renderAnnotationsOnPage(pageNum) {
        if (this._threads[pageNum]) {
            this._threads[pageNum].forEach((thread) => {
                thread.show();
            });
        }
    }

    /**
     * Sets the zoom scale.
     *
     * @param {number} scale
     * @return {void}
     */
    setScale(scale) {
        this._annotatedElement.setAttribute('data-scale', scale);
    }

    /**
     * Toggles point annotation mode on and off. When point annotation mode is
     * on, clicking an area will create a point annotation at that location.
     *
     * @param {HTMLEvent} event - DOM event
     * @return {void}
     */
    togglePointModeHandler(event = {}) {
        // This unfortunately breaks encapsulation, but the header currently
        // doesn't manage its own functionality
        let buttonEl = event.target;
        if (!buttonEl) {
            const containerEl = document.querySelector('.bp-header');
            buttonEl = containerEl ? containerEl.querySelector('.bp-btn-annotate') : null;
        }

        this.destroyPendingThreads();

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
     * @param {Event} event - DOM event
     * @param {string} annotationType - Type of annotation
     * @return {Object} Location object
     */
    /* eslint-disable no-unused-vars */
    getLocationFromEvent(event, annotationType) {}
    /* eslint-enable no-unused-vars */

    /**
     * Must be implemented to create the appropriate new thread, add it to the
     * in-memory map, and return the thread.
     *
     * @param {Annotation[]} annotations - Annotations in thread
     * @param {Object} location - Location object
     * @param {string} type - Annotation type
     * @return {AnnotationThread} Created annotation thread
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
     * @protected
     * @return {void}
     */
    setupAnnotations() {
        // Map of page => [threads on page]
        this._threads = {};
        this.bindDOMListeners();
        this.bindCustomListenersOnService(this._annotationService);
    }

    /**
     * Fetches persisted annotations, creates threads as needed, and generates
     * an in-memory map of page to threads.
     *
     * @protected
     * @return {Promise} Promise for fetching saved annotations
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
     * @protected
     * @return {void}
     */
    bindDOMListeners() {}

    /**
     * Unbinds DOM event listeners. No-op here, but can be overridden by any
     * annotator that needs to bind event listeners to the DOM in the normal
     * state (ie not in any annotation mode).
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {}

    /**
     * Binds custom event listeners for the Annotation Service.
     *
     * @protected
     * @return {void}
     */
    bindCustomListenersOnService() {
        const service = this._annotationService;
        if (!service || !(service instanceof AnnotationService)) {
            return;
        }

        /* istanbul ignore next */
        service.addListener('annotationerror', (data) => {
            let errorMessage = '';
            switch (data.reason) {
                case 'read':
                    errorMessage = __('annotations_load_error');
                    break;
                case 'create':
                    errorMessage = __('annotations_create_error');
                    this.showAnnotations();
                    break;
                case 'delete':
                    errorMessage = __('annotations_delete_error');
                    this.showAnnotations();
                    break;
                case 'authorization':
                    errorMessage = __('annotations_authorization_error');
                    break;
                default:

            }
            this.notification.show(errorMessage);
        });
    }

    /**
     * Unbinds custom event listeners for the Annotation Service.
     *
     * @protected
     * @return {void}
     */
    unbindCustomListenersOnService() {
        const service = this._annotationService;
        if (!service || !(service instanceof AnnotationService)) {
            return;
        }
        service.removeAllListeners('annotationerror');
    }

    /**
     * Binds custom event listeners for a thread.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
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
    }

    /**
     * Unbinds custom event listeners for the thread.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
     */
    unbindCustomListenersOnThread(thread) {
        thread.removeAllListeners('threaddeleted');
        thread.removeAllListeners('threadcleanup');
    }

    /**
     * Binds event listeners for point annotation mode.
     *
     * @protected
     * @return {void}
     */
    bindPointModeListeners() {
        this._annotatedElement.addEventListener('click', this.pointClickHandler);
    }

    /**
     * Unbinds event listeners for point annotation mode.
     *
     * @protected
     * @return {void}
     */
    unbindPointModeListeners() {
        this._annotatedElement.removeEventListener('click', this.pointClickHandler);
    }

    /**
     * Event handler for adding a point annotation. Creates a point annotation
     * thread at the clicked location.
     *
     * @protected
     * @param {Event} event - DOM event
     * @return {void}
     */
    pointClickHandler(event) {
        event.stopPropagation();

        // Determine if a point annotation dialog is already open and close the
        // current open dialog
        const hasPendingThreads = this.destroyPendingThreads();
        if (hasPendingThreads) {
            return;
        }

        // Get annotation location from click event, ignore click if location is invalid
        const location = this.getLocationFromEvent(event, constants.ANNOTATION_TYPE_POINT);
        if (!location) {
            this.togglePointModeHandler();
            return;
        }

        // Exits point annotation mode on first click
        this.togglePointModeHandler();

        // Create new thread with no annotations, show indicator, and show dialog
        const thread = this.createAnnotationThread([], location, constants.ANNOTATION_TYPE_POINT);
        thread.show();

        // Bind events on thread
        this.bindCustomListenersOnThread(thread);
    }

    /**
     * Adds thread to in-memory map.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to add
     * @return {void}
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
     * @protected
     * @return {boolean} Whether or not in point mode
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
     * @private
     * @return {boolean} Whether or not any pending threads existed on the
     * current file
     */
    destroyPendingThreads() {
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
