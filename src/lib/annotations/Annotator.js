import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import AnnotationService from './AnnotationService';
import * as annotatorUtil from './annotatorUtil';
import { ICON_CLOSE } from '../icons/icons';
import './Annotator.scss';
import {
    CLASS_ACTIVE,
    CLASS_HIDDEN,
    DATA_TYPE_ANNOTATION_DIALOG,
    CLASS_MOBILE_ANNOTATION_DIALOG,
    CLASS_ANNOTATION_DIALOG,
    CLASS_ANNOTATION_MODE,
    CLASS_MOBILE_DIALOG_HEADER,
    CLASS_DIALOG_CLOSE,
    SELECTOR_ANNOTATION_BUTTON_DRAW_CANCEL,
    SELECTOR_ANNOTATION_BUTTON_DRAW_ENTER,
    SELECTOR_ANNOTATION_BUTTON_DRAW_POST,
    SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO,
    SELECTOR_ANNOTATION_BUTTON_DRAW_REDO,
    TYPES
} from './annotationConstants';

const MODE_ENTER = 'annotationmodeenter';
const MODE_EXIT = 'annotationmodeexit';

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
        this.validationErrorEmitted = false;
        this.isMobile = data.isMobile;
        this.previewUI = data.previewUI;
        this.modeButtons = data.modeButtons;
        this.annotationModeHandlers = [];
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.unbindModeListeners();

        if (this.threads) {
            Object.keys(this.threads).forEach((page) => {
                this.threads[page].forEach((thread) => {
                    this.unbindCustomListenersOnThread(thread);
                });
            });
        }

        // Destroy all annotate buttons
        Object.keys(this.modeButtons).forEach((type) => {
            const handler = this.getAnnotationModeClickHandler(type);
            const buttonEl = this.container.querySelector(this.modeButtons[type].selector);
            buttonEl.removeEventListener('click', handler);
        });

        this.unbindDOMListeners();
        this.unbindCustomListenersOnService();
        this.removeListener('scaleAnnotations', this.scaleAnnotations);
    }

    /**
     * Initializes annotator.
     *
     * @param {number} [initialScale] - The initial scale factor to render the annotations
     * @return {void}
     */
    init(initialScale = 1) {
        this.annotatedElement = this.getAnnotatedEl(this.container);

        const { apiHost, fileId, token } = this.options;
        this.annotationService = new AnnotationService({
            apiHost,
            fileId,
            token,
            canAnnotate: this.canAnnotate
        });

        // Set up mobile annotations dialog
        if (this.isMobile) {
            this.setupMobileDialog();
        }

        // Show the annotate button for all enabled types for the
        // current viewer
        Object.keys(this.modeButtons).forEach((type) => {
            this.showModeAnnotateButton(type);
        });

        this.setScale(initialScale);
        this.setupAnnotations();
        this.showAnnotations();
    }

    /**
     * Returns whether or not the current annotation mode is enabled for
     * the current viewer/anntotor.
     *
     * @param {string} type - Type of annotation
     * @return {boolean} Whether or not the annotation mode is enabled
     */
    isModeAnnotatable(type) {
        if (!this.options.annotator) {
            return false;
        }

        const { TYPE: annotationTypes } = this.options.annotator;
        if (type && annotationTypes) {
            if (!annotationTypes.some((annotationType) => type === annotationType)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Shows the annotate button for the specified mode
     *
     * @param {string} currentMode - Annotation mode
     * @return {void}
     */
    showModeAnnotateButton(currentMode) {
        const mode = this.modeButtons[currentMode];
        if (!mode || !this.isModeAnnotatable(currentMode)) {
            return;
        }

        const annotateButtonEl = this.container.querySelector(mode.selector);
        if (annotateButtonEl) {
            annotateButtonEl.title = mode.title;
            annotateButtonEl.classList.remove(CLASS_HIDDEN);

            const handler = this.getAnnotationModeClickHandler(currentMode);
            annotateButtonEl.addEventListener('click', handler);
        }
    }

    /**
     * Returns click handler for toggling annotation mode.
     *
     * @param {string} mode - Target annotation mode
     * @return {Function|null} Click handler
     */
    getAnnotationModeClickHandler(mode) {
        if (!mode || !this.isModeAnnotatable(mode)) {
            return null;
        }

        return () => {
            this.toggleAnnotationHandler(mode);
        };
    }

    /**
     * Sets up the shared mobile dialog element.
     *
     * @return {void}
     */
    setupMobileDialog() {
        // Generate HTML of dialog
        const mobileDialogEl = document.createElement('div');
        mobileDialogEl.setAttribute('data-type', DATA_TYPE_ANNOTATION_DIALOG);
        mobileDialogEl.classList.add(CLASS_MOBILE_ANNOTATION_DIALOG);
        mobileDialogEl.classList.add(CLASS_ANNOTATION_DIALOG);
        mobileDialogEl.classList.add(CLASS_HIDDEN);

        mobileDialogEl.innerHTML = `
            <div class="${CLASS_MOBILE_DIALOG_HEADER}">
                <button class="${CLASS_DIALOG_CLOSE}">${ICON_CLOSE}</button>
            </div>`.trim();

        this.container.appendChild(mobileDialogEl);
    }

    /**
     * Returns true if the annotator has an annotation type enabled
     *
     * @param {string} type - Annotation type to check
     * @return {boolean} Whether or not the annotation type is enabled
     */
    isTypeEnabled(type) {
        const { annotator } = this.options || {};
        return annotator.TYPE && annotator.TYPE.includes(type);
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
     * @param {number} pageNum - Page number
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
        if (this.threads && this.threads[pageNum]) {
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
     * @param {number} [pageNum] - Page number
     * @return {void}
     * @private
     */
    rotateAnnotations(rotationAngle = 0, pageNum = 0) {
        // Only render a specific page's annotations unless no page number
        // is specified
        if (pageNum) {
            this.renderAnnotationsOnPage(pageNum);
        } else {
            this.renderAnnotations();
        }

        // Only show/hide point annotation button if user has the
        // appropriate permissions
        if (!this.canAnnotate) {
            return;
        }

        // Hide create annotations button if image is rotated
        const pointButtonSelector = this.modeButtons[TYPES.point].selector;
        const pointAnnotateButton = this.previewUI.getAnnotateButton(pointButtonSelector);

        if (rotationAngle !== 0) {
            annotatorUtil.hideElement(pointAnnotateButton);
        } else {
            annotatorUtil.showElement(pointAnnotateButton);
        }
    }

    /**
     * Sets the zoom scale.
     *
     * @param {number} scale - current zoom scale
     * @return {void}
     */
    setScale(scale) {
        this.annotatedElement.setAttribute('data-scale', scale);
    }

    /**
     * Toggles annotation modes on and off. When an annotation mode is
     * on, annotation threads will be created at that location.
     *
     * @param {string} mode - Current annotation mode
     * @param {HTMLEvent} event - DOM event
     * @return {void}
     */
    toggleAnnotationHandler(mode, event = {}) {
        this.destroyPendingThreads();

        // No specific mode available for annotation type
        if (!(mode in this.modeButtons)) {
            return;
        }

        const buttonSelector = this.modeButtons[mode].selector;
        const buttonEl = event.target || this.previewUI.getAnnotateButton(buttonSelector);

        // Exit any other annotation mode
        this.exitAnnotationModes(mode, buttonEl);

        // If in annotation mode, turn it off
        if (this.isInAnnotationMode(mode)) {
            this.disableAnnotationMode(mode, buttonEl);

            // Remove annotation mode
            this.currentAnnotationMode = null;
        } else {
            this.enableAnnotationMode(mode, buttonEl);

            // Update annotation mode
            this.currentAnnotationMode = mode;
        }
    }

    /**
     * Disables the specified annotation mode
     *
     * @param {string} mode - Current annotation mode
     * @param {HTMLElement} buttonEl - Annotation button element
     * @return {void}
     */
    disableAnnotationMode(mode, buttonEl) {
        this.emit(MODE_EXIT);
        this.annotatedElement.classList.remove(CLASS_ANNOTATION_MODE);
        if (buttonEl) {
            buttonEl.classList.remove(CLASS_ACTIVE);

            if (mode === TYPES.draw) {
                const drawEnterEl = buttonEl.querySelector(SELECTOR_ANNOTATION_BUTTON_DRAW_ENTER);
                const drawCancelEl = buttonEl.querySelector(SELECTOR_ANNOTATION_BUTTON_DRAW_CANCEL);
                const postButtonEl = this.previewUI.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_POST);
                const undoButtonEl = this.previewUI.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO);
                const redoButtonEl = this.previewUI.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_REDO);

                annotatorUtil.showElement(drawEnterEl);
                annotatorUtil.hideElement(drawCancelEl);
                annotatorUtil.hideElement(postButtonEl);
                annotatorUtil.hideElement(undoButtonEl);
                annotatorUtil.hideElement(redoButtonEl);
                annotatorUtil.disableElement(undoButtonEl);
                annotatorUtil.disableElement(redoButtonEl);
            }
        }

        this.unbindModeListeners(mode); // Disable mode
        this.bindDOMListeners(); // Re-enable other annotations
    }

    /**
     * Enables the specified annotation mode
     *
     * @param {string} mode - Current annotation mode
     * @param {HTMLElement} buttonEl - Annotation button element
     * @return {void}
     */
    enableAnnotationMode(mode, buttonEl) {
        this.emit(MODE_ENTER, mode);
        this.annotatedElement.classList.add(CLASS_ANNOTATION_MODE);
        if (buttonEl) {
            buttonEl.classList.add(CLASS_ACTIVE);

            if (mode === TYPES.draw) {
                const drawEnterEl = buttonEl.querySelector(SELECTOR_ANNOTATION_BUTTON_DRAW_ENTER);
                const drawCancelEl = buttonEl.querySelector(SELECTOR_ANNOTATION_BUTTON_DRAW_CANCEL);
                const postButtonEl = this.previewUI.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_POST);
                const undoButtonEl = this.previewUI.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO);
                const redoButtonEl = this.previewUI.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_REDO);

                annotatorUtil.hideElement(drawEnterEl);
                annotatorUtil.showElement(drawCancelEl);
                annotatorUtil.showElement(postButtonEl);
                annotatorUtil.showElement(undoButtonEl);
                annotatorUtil.showElement(redoButtonEl);
            }
        }

        this.unbindDOMListeners(); // Disable other annotations
        this.bindModeListeners(mode); // Enable mode
    }

    /**
     * Exits all annotation modes except the specified mode
     *
     * @param {string} mode - Current annotation mode
     * @param {HTMLElement} buttonEl - Annotation mode button DOM element
     * @return {void}
     */
    exitAnnotationModes(mode, buttonEl) {
        Object.keys(this.modeButtons).forEach((type) => {
            if (mode === type) {
                return;
            }

            const buttonSelector = this.modeButtons[type].selector;
            const modeButtonEl = buttonEl || this.previewUI.getAnnotateButton(buttonSelector);
            this.disableAnnotationMode(type, modeButtonEl);
        });
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
        this.addListener('scaleAnnotations', this.scaleAnnotations);
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

        return this.annotationService.getThreadMap(this.fileVersionId).then((threadMap) => {
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

            this.emit('annotationsfetched');
        });
    }

    /**
     * Binds DOM event listeners. Can be overridden by any annotator that
     * needs to bind event listeners to the DOM in the normal state (ie not
     * in any annotation mode).
     *
     * @return {void}
     */
    bindDOMListeners() {}

    /**
     * Unbinds DOM event listeners. Can be overridden by any annotator that
     * needs to bind event listeners to the DOM in the normal state (ie not
     * in any annotation mode).
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
        service.addListener('annotatorerror', this.handleServiceEvents);
    }

    /**
     * Handle events emitted by the annotaiton service
     *
     * @private
     * @param {Object} [data] - Annotation service event data
     * @param {string} [data.event] - Annotation service event
     * @param {string} [data.data] -
     * @return {void}
     */
    handleServiceEvents(data) {
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
            this.emit('annotatorerror', errorMessage);
        }
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
        service.removeAllListeners('annotatorerror');
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
                this.threads[page] = this.threads[page].filter(
                    (searchThread) => searchThread.threadID !== thread.threadID
                );
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
        thread.removeAllListeners('annotationevent');
    }

    /**
     * Binds event listeners for annotation modes.
     *
     * @protected
     * @param {string} mode - Current annotation mode
     * @return {void}
     */
    bindModeListeners(mode) {
        const handlers = [];

        if (mode === TYPES.point) {
            handlers.push({
                type: 'mousedown',
                func: this.pointClickHandler,
                eventObj: this.annotatedElement
            });
            handlers.push({
                type: 'touchstart',
                func: this.pointClickHandler,
                eventObj: this.annotatedElement
            });
        } else if (mode === TYPES.draw) {
            const drawingThread = this.createAnnotationThread([], {}, TYPES.draw);

            /* eslint-disable require-jsdoc */
            const locationFunction = (event) => this.getLocationFromEvent(event, TYPES.point);
            /* eslint-enable require-jsdoc */

            const postButtonEl = this.previewUI.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_POST);

            handlers.push({
                type: 'mousemove',
                func: annotatorUtil.eventToLocationHandler(locationFunction, drawingThread.handleMove),
                eventObj: this.annotatedElement
            });
            handlers.push({
                type: 'mousedown',
                func: annotatorUtil.eventToLocationHandler(locationFunction, drawingThread.handleStart),
                eventObj: this.annotatedElement
            });
            handlers.push({
                type: 'mouseup',
                func: annotatorUtil.eventToLocationHandler(locationFunction, drawingThread.handleStop),
                eventObj: this.annotatedElement
            });

            if (postButtonEl) {
                handlers.push({
                    type: 'click',
                    func: () => {
                        drawingThread.saveAnnotation(TYPES.draw);
                        this.toggleAnnotationHandler(TYPES.draw);
                    },
                    eventObj: postButtonEl
                });
            }
        }

        handlers.forEach((handler) => {
            handler.eventObj.addEventListener(handler.type, handler.func);
            this.annotationModeHandlers.push(handler);
        });
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
        event.preventDefault();

        // Determine if a point annotation dialog is already open and close the
        // current open dialog
        const hasPendingThreads = this.destroyPendingThreads();
        if (hasPendingThreads) {
            return;
        }

        // Exits point annotation mode on first click
        const buttonSelector = this.modeButtons[TYPES.point].selector;
        const buttonEl = this.previewUI.getAnnotateButton(buttonSelector);
        this.disableAnnotationMode(TYPES.point, buttonEl);

        // Get annotation location from click event, ignore click if location is invalid
        const location = this.getLocationFromEvent(event, TYPES.point);
        if (!location) {
            return;
        }

        // Create new thread with no annotations, show indicator, and show dialog
        const thread = this.createAnnotationThread([], location, TYPES.point);

        if (thread) {
            thread.show();

            // Bind events on thread
            this.bindCustomListenersOnThread(thread);
        }
    }

    /**
     * Unbinds event listeners for annotation modes.
     *
     * @protected
     * @return {void}
     */
    unbindModeListeners() {
        while (this.annotationModeHandlers.length > 0) {
            const handler = this.annotationModeHandlers.pop();
            handler.eventObj.removeEventListener(handler.type, handler.func);
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
     * Returns whether or not annotator is in the specified annotation mode.
     *
     * @protected
     * @param {string} mode - Current annotation mode
     * @return {boolean} Whether or not in the specified annotation mode
     */
    isInAnnotationMode(mode) {
        return this.currentAnnotationMode === mode;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Orient annotations to the correct scale and orientation of the annotated document.
     *
     * @protected
     * @param {Object} data - Scale and orientation values needed to orient annotations.
     * @return {void}
     */
    scaleAnnotations(data) {
        this.setScale(data.scale);
        this.rotateAnnotations(data.rotationAngle, data.pageNum);
    }

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
            this.threads[page].forEach((pendingThread) => {
                if (annotatorUtil.isPending(pendingThread.state)) {
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
        if (this.validationErrorEmitted) {
            return;
        }

        this.emit('annotatorerror', __('annotations_load_error'));
        this.validationErrorEmitted = true;
    }

    /**
     * Emits a generic viewer event
     *
     * @private
     * @emits viewerevent
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @return {void}
     */
    emit(event, data) {
        const { annotator, fileId } = this.options;
        super.emit(event, data);
        super.emit('annotatorevent', {
            event,
            data,
            annotatorName: annotator ? annotator.NAME : '',
            fileId
        });
    }
}

export default Annotator;
