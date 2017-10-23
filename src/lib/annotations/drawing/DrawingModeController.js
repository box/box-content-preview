import rbush from 'rbush';
import AnnotationModeController from '../AnnotationModeController';
import annotationsShell from './../annotationsShell.html';
import * as annotatorUtil from '../annotatorUtil';
import {
    CLASS_ANNOTATION_DRAW,
    TYPES,
    STATES,
    SELECTOR_ANNOTATION_BUTTON_DRAW_CANCEL,
    SELECTOR_ANNOTATION_BUTTON_DRAW_POST,
    SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO,
    SELECTOR_ANNOTATION_BUTTON_DRAW_REDO,
    DRAW_BORDER_OFFSET
} from '../annotationConstants';

class DrawingModeController extends AnnotationModeController {
    /** @property {DrawingThread} - The currently selected DrawingThread */
    selectedThread;

    /** @property {HTMLElement} - The button to cancel the pending drawing thread */
    cancelButtonEl;

    /** @property {HTMLElement} - The button to commit the pending drawing thread */
    postButtonEl;

    /** @property {HTMLElement} - The button to undo a stroke on the pending drawing thread */
    undoButtonEl;

    /** @property {HTMLElement} - The button to redo a stroke on the pending drawing thread */
    redoButtonEl;

    /**
     * Register the annotator and any information associated with the annotator
     *
     * @inheritdoc
     * @public
     * @param {Annotator} annotator - The annotator to be associated with the controller
     * @return {void}
     */
    registerAnnotator(annotator) {
        super.registerAnnotator(annotator);

        if (annotator.options.header !== 'none') {
            // We need to create our own header UI
            this.setupHeader(annotator.container, annotationsShell);
        }

        this.cancelButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_CANCEL);
        this.postButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_POST);
        this.undoButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO);
        this.redoButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_REDO);

        this.annotator.annotatedElement.classList.add(CLASS_ANNOTATION_DRAW);
    }

    /**
     * Register a thread that has been assigned a location with the controller
     *
     * @inheritdoc
     * @public
     * @param {AnnotationThread} thread - The thread to register with the controller
     * @return {void}
     */
    registerThread(thread) {
        if (!thread || !thread.location) {
            return;
        }

        const page = thread.location.page || 1; // Defaults to page 1 if thread has no page'
        if (!(page in this.threads)) {
            /* eslint-disable new-cap */
            this.threads[page] = new rbush();
            /* eslint-enable new-cap */
        }
        this.threads[page].insert(thread);
    }

    /**
     * Unregister a previously registered thread that has been assigned a location
     *
     * @inheritdoc
     * @public
     * @param {AnnotationThread} thread - The thread to unregister with the controller
     * @return {void}
     */
    unregisterThread(thread) {
        if (!thread || !thread.location) {
            return;
        }

        const page = thread.location.page || 1;
        this.threads[page].remove(thread);
    }

    /**
     * Binds custom event listeners for a thread.
     *
     * @inheritdoc
     * @protected
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
     */
    bindCustomListenersOnThread(thread) {
        if (!thread) {
            return;
        }

        super.bindCustomListenersOnThread(thread);

        // On save, add the thread to the Rbush, on delete, remove it from the Rbush
        thread.addListener('annotationsaved', () => this.registerThread(thread));
        thread.addListener('annotationdelete', () => this.unregisterThread(thread));
    }

    /**
     * Unbind drawing mode listeners. Resets the undo and redo buttons to be disabled if they exist
     *
     * @inheritdoc
     * @protected
     * @return {void}
     */
    unbindModeListeners() {
        super.unbindModeListeners();

        annotatorUtil.disableElement(this.undoButtonEl);
        annotatorUtil.disableElement(this.redoButtonEl);
    }

    /**
     * Deselect a saved and selected thread
     *
     * @return {void}
     */
    removeSelection() {
        if (!this.selectedThread) {
            return;
        }

        this.selectedThread.clearBoundary();
        this.selectedThread = undefined;
    }

    /**
     * Set up and return the necessary handlers for the annotation mode
     *
     * @inheritdoc
     * @protected
     * @return {Array} An array where each element is an object containing
     * the object that will emit the event, the type of events to listen
     * for, and the callback
     */
    setupHandlers() {
        /* eslint-disable require-jsdoc */
        const locationFunction = (event) => this.annotator.getLocationFromEvent(event, TYPES.point);
        /* eslint-enable require-jsdoc */

        // Setup
        this.currentThread = this.annotator.createAnnotationThread([], {}, TYPES.draw);
        this.bindCustomListenersOnThread(this.currentThread);

        // Get handlers
        this.pushElementHandler(
            this.annotator.annotatedElement,
            ['mousemove', 'touchmove'],
            annotatorUtil.eventToLocationHandler(locationFunction, this.currentThread.handleMove)
        );

        this.pushElementHandler(
            this.annotator.annotatedElement,
            ['mousedown', 'touchstart'],
            annotatorUtil.eventToLocationHandler(locationFunction, this.currentThread.handleStart)
        );

        this.pushElementHandler(
            this.annotator.annotatedElement,
            ['mouseup', 'touchcancel', 'touchend'],
            annotatorUtil.eventToLocationHandler(locationFunction, this.currentThread.handleStop)
        );

        this.pushElementHandler(this.cancelButtonEl, 'click', () => {
            this.currentThread.cancelUnsavedAnnotation();
            this.annotator.toggleAnnotationHandler(TYPES.draw);
        });

        this.pushElementHandler(this.postButtonEl, 'click', () => {
            this.currentThread.saveAnnotation(TYPES.draw);
            this.annotator.toggleAnnotationHandler(TYPES.draw);
        });

        this.pushElementHandler(this.undoButtonEl, 'click', this.currentThread.undo);
        this.pushElementHandler(this.redoButtonEl, 'click', this.currentThread.redo);
    }

    /**
     * Handle an annotation event.
     *
     * @inheritdoc
     * @protected
     * @param {AnnotationThread} thread - The thread that emitted the event
     * @param {Object} data - Extra data related to the annotation event
     * @return {void}
     */
    handleAnnotationEvent(thread, data = {}) {
        const { eventData } = data;
        switch (data.event) {
            case 'locationassigned':
                // Register the thread to the threadmap when a starting location is assigned. Should only occur once.
                this.annotator.addThreadToMap(thread);
                break;
            case 'softcommit':
                // Save the original thread, create a new thread and
                // start drawing at the location indicating the page change
                this.currentThread = undefined;
                thread.saveAnnotation(TYPES.draw);
                this.unbindModeListeners();
                this.bindModeListeners();

                // Given a location (page change) start drawing at the provided location
                if (eventData && eventData.location) {
                    this.currentThread.handleStart(eventData.location);
                }

                break;
            case 'dialogdelete':
                if (thread.state === STATES.pending) {
                    // Soft delete, in-progress thread doesn't require a redraw or a delete on the server
                    // Clear in-progress thread and restart drawing
                    thread.destroy();
                    this.unbindModeListeners();
                    this.bindModeListeners();
                } else {
                    thread.deleteThread();
                    this.unregisterThread(thread);

                    // Redraw any threads that the deleted thread could have been overlapping
                    const page = thread.location.page;
                    this.threads[page].all().forEach((drawingThread) => drawingThread.show());
                }

                break;
            case 'availableactions':
                this.updateUndoRedoButtonEls(eventData.undo, eventData.redo);
                break;
            default:
        }
    }

    /**
     * Find the selected drawing threads given a pointer event. Randomly picks one if multiple drawings overlap
     *
     * @protected
     * @param {Event} event - The event object containing the pointer information
     * @return {void}
     */
    handleSelection(event) {
        // NOTE: @jpress This is a workaround when buttons are not given precedence in the event chain
        if (!event || (event.target && event.target.nodeName === 'BUTTON')) {
            return;
        }

        const location = this.annotator.getLocationFromEvent(event, TYPES.point);
        if (!location) {
            return;
        }

        const eventBoundary = {
            minX: +location.x - DRAW_BORDER_OFFSET,
            minY: +location.y - DRAW_BORDER_OFFSET,
            maxX: +location.x + DRAW_BORDER_OFFSET,
            maxY: +location.y + DRAW_BORDER_OFFSET
        };

        // Get the threads that correspond to the point that was clicked on
        const intersectingThreads = this.threads[location.page].search(eventBoundary);

        // Clear boundary on previously selected thread
        this.removeSelection();

        // Selected a region with no drawing threads, remove the reference to the previously selected thread
        if (intersectingThreads.length === 0) {
            this.selectedThread = undefined;
            return;
        }

        // Randomly select a thread in case there are multiple overlapping threads (use canvas hitmap to avoid this)
        const index = Math.floor(Math.random() * intersectingThreads.length);
        const selected = intersectingThreads[index];
        this.select(selected);
    }

    /**
     * Select the indicated drawing thread. Deletes a drawing thread upon the second consecutive selection
     *
     * @private
     * @param {DrawingThread} selectedDrawingThread - The drawing thread to select
     * @return {void}
     */
    select(selectedDrawingThread) {
        selectedDrawingThread.drawBoundary();
        this.selectedThread = selectedDrawingThread;
    }

    /**
     * Toggle the undo and redo buttons based on the number of actions available
     *
     * @private
     * @param {number} undoCount - The number of objects that can be undone
     * @param {number} redoCount - The number of objects that can be redone
     * @return {void}
     */
    updateUndoRedoButtonEls(undoCount, redoCount) {
        if (this.undoButtonEl) {
            if (undoCount === 1) {
                annotatorUtil.enableElement(this.undoButtonEl);
            } else if (undoCount === 0) {
                annotatorUtil.disableElement(this.undoButtonEl);
            }
        }

        if (this.redoButtonEl) {
            if (redoCount === 1) {
                annotatorUtil.enableElement(this.redoButtonEl);
            } else if (redoCount === 0) {
                annotatorUtil.disableElement(this.redoButtonEl);
            }
        }
    }
}

export default DrawingModeController;
