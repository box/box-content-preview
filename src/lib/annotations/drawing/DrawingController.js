import rbush from 'rbush';
import AnnotationController from '../AnnotationController';
import * as annotatorUtil from '../annotatorUtil';
import {
    TYPES,
    SELECTOR_ANNOTATION_BUTTON_DRAW_POST,
    SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO,
    SELECTOR_ANNOTATION_BUTTON_DRAW_REDO,
    DRAW_BORDER_OFFSET
} from '../annotationConstants';

class DrawingController extends AnnotationController {
    /* eslint-disable new-cap */
    /** @property {Array} - The array of annotation threads */
    threads = new rbush();
    /* eslint-enable new-cap */

    /** @property {HTMLElement} - The button to commit the pending drawing thread */
    postButtonEl;

    /** @property {HTMLElement} - The button to undo a stroke on the pending drawing thread */
    undoButtonEl;

    /** @property {HTMLElement} - The button to redo a stroke on the pending drawing thread */
    redoButtonEl;

    registerAnnotator(annotator) {
        super.registerAnnotator(annotator);
        global.threads = this.threads;

        this.postButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_POST);
        this.undoButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO);
        this.redoButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_REDO);
    }

    registerThread(thread) {
        if (!thread || !thread.location) {
            return;
        }

        this.threads.insert(thread);
    }

    unregisterThread(thread) {
        if (!thread || !thread.location) {
            return;
        }

        this.threads.remove(thread);
    }

    bindCustomListenersOnThread(thread) {
        if (!thread) {
            return;
        }

        super.bindCustomListenersOnThread(thread);

        // On save, add the thread to the Rbush, on delete, remove it from the Rbush
        thread.addListener('annotationsaved', () => this.registerThread(thread));
        thread.addListener('threaddeleted', () => this.unregisterThread(thread));
    }

    setupAndGetHandlers() {
        const handlers = [];
        /* eslint-disable require-jsdoc */
        const locationFunction = (event) => this.annotator.getLocationFromEvent(event, TYPES.point);
        /* eslint-enable require-jsdoc */

        // Setup
        // Possibly move thread creation to a thread factory
        this.currentThread = this.annotator.createAnnotationThread([], {}, TYPES.draw);
        this.bindCustomListenersOnThread(this.currentThread);

        // Get handlers
        handlers.push(
            {
                type: 'mousemove touchmove',
                func: annotatorUtil.eventToLocationHandler(locationFunction, this.currentThread.handleMove),
                eventObj: this.annotator.annotatedElement
            },
            {
                type: 'mousedown touchstart',
                func: annotatorUtil.eventToLocationHandler(locationFunction, this.currentThread.handleStart),
                eventObj: this.annotator.annotatedElement
            },
            {
                type: 'mouseup touchcancel touchend',
                func: annotatorUtil.eventToLocationHandler(locationFunction, this.currentThread.handleStop),
                eventObj: this.annotator.annotatedElement
            }
        );

        if (this.postButtonEl) {
            handlers.push({
                type: 'click',
                func: () => {
                    this.currentThread.saveAnnotation(TYPES.draw);
                    this.annotator.toggleAnnotationHandler(TYPES.draw);
                },
                eventObj: this.postButtonEl
            });
        }

        if (this.undoButtonEl) {
            handlers.push({
                type: 'click',
                func: () => {
                    this.currentThread.undo();
                },
                eventObj: this.undoButtonEl
            });
        }

        if (this.redoButtonEl) {
            handlers.push({
                type: 'click',
                func: () => {
                    this.currentThread.redo();
                },
                eventObj: this.redoButtonEl
            });
        }

        return handlers;
    }

    handleAnnotationEvent(thread, data = {}) {
        switch (data.type) {
            case 'locationassigned':
                // Register the thread to the threadmap when a starting location is assigned. Should only occur once.
                this.annotator.addThreadToMap(thread);
                break;
            case 'drawcommit':
                // Upon a commit, remove the listeners on the thread.
                // Adding the thread to the Rbush only happens upon a successful save
                thread.removeAllListeners('annotationevent');
                break;
            case 'pagechanged':
                // On page change, save the original thread, create a new thread and
                // start drawing at the location indicating the page change
                thread.saveAnnotation(TYPES.draw);
                this.currentThread = undefined;

                // NOTE(@minhnguyen): Currently we save the thread and create a new thread
                // using annotator.bindModeListeners(TYPES.draw). Ideally, the controller shouldn't have to depend on
                // bindModeListeners since the controller should only need to worry about its own logic.
                this.annotator.unbindModeListeners();
                this.annotator.bindModeListeners(TYPES.draw);
                this.currentThread.handleStart(data.location);
                break;
            case 'availableactions':
                this.updateUndoRedoButtonEls(data.undo, data.redo);
                break;
            default:
        }
    }

    getSelection(event) {
        if (!event) {
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
        const intersectingThreads = this.threads
            .search(eventBoundary)
            .filter((drawingThread) => drawingThread.location.page === location.page);

        // Clear boundary on previously selected thread
        if (this.selected) {
            const canvas = this.selected.drawingContext.canvas;
            this.selected.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Selected a region with no drawing threads, remove the reference to the previously selected thread
        if (intersectingThreads.length === 0) {
            this.selected = undefined;
            return;
        }

        // Randomly select a thread in case there are multiple
        const index = Math.floor(Math.random() * intersectingThreads.length);
        const selected = intersectingThreads[index];
        this.select(selected);
    }

    select(selectedDrawingThread) {
        if (this.selected && this.selected === selectedDrawingThread) {
            // Selected the same thread twice, delete the thread
            const toDelete = this.selected;

            toDelete.deleteThread();

            // Redraw any threads that the deleted thread could have been covering
            const toRedraw = this.threads.search(toDelete);
            toRedraw.forEach((drawingThread) => drawingThread.show());
            this.selected = undefined;
        } else {
            // Selected the thread for the first time, select the thread (TODO @minhnguyen: show UI on select)
            selectedDrawingThread.drawBoundary();
            this.selected = selectedDrawingThread;
        }
    }

    updateUndoRedoButtonEls(undoCount, redoCount) {
        if (undoCount === 1) {
            annotatorUtil.enableElement(this.undoButtonEl);
        } else if (undoCount === 0) {
            annotatorUtil.disableElement(this.undoButtonEl);
        }

        if (redoCount === 1) {
            annotatorUtil.enableElement(this.redoButtonEl);
        } else if (redoCount === 0) {
            annotatorUtil.disableElement(this.redoButtonEl);
        }
    }
}

export default DrawingController;
