import rbush from 'rbush';
import AnnotationController from '../AnnotationController';
import * as annotatorUtil from '../annotatorUtil';
import {
    TYPES,
    SELECTOR_ANNOTATION_BUTTON_DRAW_POST,
    SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO,
    SELECTOR_ANNOTATION_BUTTON_DRAW_REDO
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
        window.threads = this.threads;

        this.postButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_POST);
        this.undoButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_UNDO);
        this.redoButtonEl = annotator.getAnnotateButton(SELECTOR_ANNOTATION_BUTTON_DRAW_REDO);
    }

    registerThread(thread) {
        if (!thread) {
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
            case 'drawcommit':
                thread.removeAllListeners('annotationevent');
                break;
            case 'pagechanged':
                thread.saveAnnotation(TYPES.draw);
                this.currentThread = undefined;

                // NOTE(@minhnguyen): Questionable function call! Currently we save the thread and create a new thread
                // using annotator.bindModeListeners(TYPES.draw). Ideally, the controller shouldn't have to depend on
                // bindModeListeners since the controller should only need to worry about its own logic.
                this.annotator.unbindModeListeners();
                this.annotator.bindModeListeners(TYPES.draw);
                this.currentThread.start(data.location);
                break;
            case 'availableactions':
                if (data.undo === 1) {
                    annotatorUtil.enableElement(this.undoButtonEl);
                } else if (data.undo === 0) {
                    annotatorUtil.disableElement(this.undoButtonEl);
                }

                if (data.redo === 1) {
                    annotatorUtil.enableElement(this.redoButtonEl);
                } else if (data.redo === 0) {
                    annotatorUtil.disableElement(this.redoButtonEl);
                }
                break;
            default:
        }
    }

    select(event) {
        if (!event) {
            return;
        }

        const location = this.annotator.getLocationFromEvent(event, TYPES.point);
        if (!location) {
            return;
        }

        const boundary = {
            minX: location.x - 5,
            minY: location.y - 5,
            maxX: location.x + 5,
            maxY: location.y + 5
        };
        let selected = this.threads
            .search(boundary)
            .filter((drawingThread) => drawingThread.location.page === location.page);

        if (selected.length > 0) {
            const index = Math.floor(Math.random() * selected.length);
            selected = selected[index];
        }

        if (this.selected) {
            if (this.selected !== selected) {
                const canvas = this.selected.drawingContext.canvas;
                this.selected.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
                this.selected = undefined;
            } else {
                const toDelete = this.selected;
                this.selected = undefined;

                this.unregisterThread(toDelete);
                toDelete.deleteThread();

                const toRedraw = this.threads.search(toDelete);
                toRedraw.forEach((drawingThread) => drawingThread.show());

                return;
            }
        }

        if (selected && !(selected instanceof Array)) {
            selected.drawBoundary();
            this.selected = selected;
            console.log('selected');

            /*
            const svg = document.createElement('svg');
            svg.setAttribute('width', '400');
            svg.setAttribute('height', '200');
            svg.setAttribute('viewBox', '0 0 400 200');
            svg.innerHTML = '<rect class="bp-annotation-draw-boundary" stroke="#000000" stroke-miterlimit="1" width="400" height="200"/>';
            selected.pageEl.appendChild(svg);
            */
        }
    }
}

export default DrawingController;
