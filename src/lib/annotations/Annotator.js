import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import Notification from '../Notification';
import AnnotationService from './AnnotationService';
import * as constants from './annotationConstants';
import * as annotatorUtil from './annotatorUtil';
import {
    CLASS_ACTIVE,
    SELECTOR_BOX_PREVIEW_BTN_ANNOTATE
} from '../constants';
import './Annotator.scss';

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
     * @property {string} fileVersionId File version ID
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

        this.canAnnotate = data.canAnnotate;
        this.container = data.container;
        this.options = data.options;
        this.fileVersionId = data.fileVersionId;
        this.locale = data.locale;
        this.validationErrorDisplayed = false;
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.threads) {
            Object.keys(this.threads).forEach((page) => {
                this.threads[page].forEach((thread) => {
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
        this.annotatedElement = this.getAnnotatedEl(this.container);
        this.notification = new Notification(this.annotatedElement);

        const { apiHost, fileId, token } = this.options;

        this.annotationService = new AnnotationService({
            apiHost,
            fileId,
            token,
            canAnnotate: this.canAnnotate
        });

        this.setScale(1);
        this.setupAnnotations();
        this.showAnnotations();
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
        Object.keys(this.threads).forEach((page) => {
            this.threads[page].forEach((thread) => {
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
        if (this.threads[pageNum]) {
            this.threads[pageNum].forEach((thread) => {
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
        Object.keys(this.threads).forEach((page) => {
            this.threads[page].forEach((thread) => {
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
        if (this.threads[pageNum]) {
            this.threads[pageNum].forEach((thread) => {
                thread.show();
            });
        }
    }

    /**
     * Rotates annotations. Hides point annotation mode button if rotated
     *
     * @override
     * @param {number} [rotationAngle] - current angle image is rotated
     * @return {void}
     * @private
     */
    rotateAnnotations(rotationAngle = 0) {
        // Only show/hide point annotation button if user has the
        // appropriate permissions
        if (this.annotationService.canAnnotate) {
            // Hide create annotations button if image is rotated
            // TODO(@spramod) actually adjust getLocationFromEvent method
            // in annotator to get correct location rather than disabling
            // the creation of annotations on rotated images
            const annotateButton = document.querySelector(SELECTOR_BOX_PREVIEW_BTN_ANNOTATE);

            if (rotationAngle !== 0) {
                annotatorUtil.hideElement(annotateButton);
            } else {
                annotatorUtil.showElement(annotateButton);
            }
        }

        this.renderAnnotations();
    }

    /**
     * Sets the zoom scale.
     *
     * @param {number} scale
     * @return {void}
     */
    setScale(scale) {
        this.annotatedElement.setAttribute('data-scale', scale);
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

            this.emit('annotationmodeexit');
            this.annotatedElement.classList.remove(constants.CLASS_ANNOTATION_POINT_MODE);
            if (buttonEl) {
                buttonEl.classList.remove(CLASS_ACTIVE);
            }

            this.unbindPointModeListeners(); // Disable point mode
            this.bindDOMListeners(); // Re-enable other annotations

        // Otherwise, enable annotation mode
        } else {
            this.notification.show(__('notification_annotation_mode'));

            this.emit('annotationmodeenter');
            this.annotatedElement.classList.add(constants.CLASS_ANNOTATION_POINT_MODE);
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

    /**
    * Must be implemented to determine the annotated element in the viewer.
    *
    * @param {HTMLElement} containerEl - Container element for the viewer
    * @return {HTMLElement} Annotated element in the viewer
    */
    /* eslint-disable no-unused-vars */
    getAnnotatedEl(containerEl) {}
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
        this.threads = {};
        this.bindDOMListeners();
        this.bindCustomListenersOnService(this.annotationService);
    }

    /**
     * Fetches persisted annotations, creates threads as needed, and generates
     * an in-memory map of page to threads.
     *
     * @protected
     * @return {Promise} Promise for fetching saved annotations
     */
    fetchAnnotations() {
        this.threads = {};

        return this.annotationService.getThreadMap(this.fileVersionId)
            .then((threadMap) => {
                // Generate map of page to threads
                Object.keys(threadMap).forEach((threadID) => {
                    const annotations = threadMap[threadID];
                    const firstAnnotation = annotations[0];

                    // Bind events on valid annotation thread
                    const thread = this.createAnnotationThread(annotations, firstAnnotation.location, firstAnnotation.type);
                    if (thread) {
                        this.bindCustomListenersOnThread(thread);
                    }
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
        const service = this.annotationService;
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

            if (errorMessage) {
                this.notification.show(errorMessage);
            }
        });
    }

    /**
     * Unbinds custom event listeners for the Annotation Service.
     *
     * @protected
     * @return {void}
     */
    unbindCustomListenersOnService() {
        const service = this.annotationService;
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
            if (this.threads[page] instanceof Array) {
                this.threads[page] = this.threads[page].filter((searchThread) => searchThread.threadID !== thread.threadID);
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
        this.annotatedElement.addEventListener('click', this.pointClickHandler);
    }

    /**
     * Unbinds event listeners for point annotation mode.
     *
     * @protected
     * @return {void}
     */
    unbindPointModeListeners() {
        this.annotatedElement.removeEventListener('click', this.pointClickHandler);
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

        if (thread) {
            thread.show();

            // Bind events on thread
            this.bindCustomListenersOnThread(thread);
        }
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
        this.threads[page] = this.threads[page] || [];
        this.threads[page].push(thread);
    }

    /**
     * Returns whether or not annotator is in point mode.
     *
     * @protected
     * @return {boolean} Whether or not in point mode
     */
    isInPointMode() {
        return this.annotatedElement.classList.contains(constants.CLASS_ANNOTATION_POINT_MODE);
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
        Object.keys(this.threads).forEach((page) => {
            this.threads[page]
                .forEach((pendingThread) => {
                    if (pendingThread.state === constants.ANNOTATION_STATE_PENDING) {
                        hasPendingThreads = true;
                        pendingThread.destroy();
                    }
                });
        });
        return hasPendingThreads;
    }

    /**
     * Displays annotation validation error notification once on load. Does
     * nothing if notification was already displayed once.
     *
     * @private
     * @return {void}
     */
    handleValidationError() {
        if (this.validationErrorDisplayed) {
            return;
        }

        this.notification.show(__('annotations_load_error'));
        this.validationErrorDisplayed = true;
    }
}

export default Annotator;
