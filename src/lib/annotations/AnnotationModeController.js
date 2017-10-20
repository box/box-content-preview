import EventEmitter from 'events';
import { insertTemplate } from './annotatorUtil';

class AnnotationModeController extends EventEmitter {
    /** @property {Array} - The array of annotation threads */
    threads = [];

    /** @property {Array} - The array of annotation handlers */
    handlers = [];

    /**
     * Register the annotator and any information associated with the annotator
     *
     * @public
     * @param {Annotator} annotator - The annotator to be associated with the controller
     * @return {void}
     */
    registerAnnotator(annotator) {
        // TODO (@minhnguyen): remove the need to register an annotator. Ideally, the annotator should know about the
        //                     controller and the controller does not know about the annotator.
        this.annotator = annotator;
    }

    /**
     * Bind the mode listeners and store each handler for future unbinding
     *
     * @public
     * @return {void}
     */
    bindModeListeners() {
        const currentHandlerIndex = this.handlers.length;
        this.setupHandlers();

        for (let index = currentHandlerIndex; index < this.handlers.length; index++) {
            const handler = this.handlers[index];
            const types = handler.type instanceof Array ? handler.type : [handler.type];

            types.forEach((eventName) => handler.eventObj.addEventListener(eventName, handler.func));
        }
    }

    /**
     * Unbind the previously bound mode listeners
     *
     * @public
     * @return {void}
     */
    unbindModeListeners() {
        while (this.handlers.length > 0) {
            const handler = this.handlers.pop();
            const types = handler.type instanceof Array ? handler.type : [handler.type];

            types.forEach((eventName) => {
                handler.eventObj.removeEventListener(eventName, handler.func);
            });
        }
    }

    /**
     * Register a thread with the controller so that the controller can keep track of relevant threads
     *
     * @public
     * @param {AnnotationThread} thread - The thread to register with the controller
     * @return {void}
     */
    registerThread(thread) {
        this.threads.push(thread);
    }

    /**
     * Unregister a previously registered thread
     *
     * @public
     * @param {AnnotationThread} thread - The thread to unregister with the controller
     * @return {void}
     */
    unregisterThread(thread) {
        this.threads = this.threads.filter((item) => item !== thread);
    }

    /**
     * Clean up any selected annotations
     *
     * @return {void}
     */
    removeSelection() {}

    /**
     * Binds custom event listeners for a thread.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to bind events to
     * @return {void}
     */
    bindCustomListenersOnThread(thread) {
        if (!thread) {
            return;
        }

        // TODO (@minhnguyen): Move annotator.bindCustomListenersOnThread logic to AnnotationModeController
        this.annotator.bindCustomListenersOnThread(thread);
        thread.addListener('threadevent', (data) => {
            this.handleAnnotationEvent(thread, data);
        });
    }

    /**
     * Unbinds custom event listeners for the thread.
     *
     * @protected
     * @param {AnnotationThread} thread - Thread to unbind events from
     * @return {void}
     */
    unbindCustomListenersOnThread(thread) {
        if (!thread) {
            return;
        }

        thread.removeAllListeners('threadevent');
    }

    /**
     * Set up and return the necessary handlers for the annotation mode
     *
     * @protected
     * @return {Array} An array where each element is an object containing the object that will emit the event,
     *                 the type of events to listen for, and the callback
     */
    setupHandlers() {}

    /**
     * Handle an annotation event.
     *
     * @protected
     * @param {AnnotationThread} thread - The thread that emitted the event
     * @param {Object} data - Extra data related to the annotation event
     * @return {void}
     */
    /* eslint-disable no-unused-vars */
    handleAnnotationEvent(thread, data = {}) {}
    /* eslint-enable no-unused-vars */

    /**
     * Creates a handler description object and adds its to the internal handler container.
     * Useful for setupAndGetHandlers.
     *
     * @protected
     * @param {HTMLElement} element - The element to bind the listener to
     * @param {Array|string} type - An array of event types to listen for or the event name to listen for
     * @param {Function} handlerFn - The callback to be invoked when the element emits a specified eventname
     * @return {void}
     */
    pushElementHandler(element, type, handlerFn) {
        if (!element) {
            return;
        }

        this.handlers.push({
            eventObj: element,
            func: handlerFn,
            type
        });
    }

    /**
      * Setups the header for the annotation mode
      *
      * @protected
      * @param {HTMLElement} container - Container element
      * @param {HTMLElement} header - Header to add to DOM
      * @return {void}
      */
    setupHeader(container, header) {
        const baseHeaderEl = container.firstElementChild;
        insertTemplate(container, header, baseHeaderEl);
    }
}

export default AnnotationModeController;
