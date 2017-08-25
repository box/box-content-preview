import EventEmitter from 'events';

class AnnotationController extends EventEmitter {
    /** @property {Array} - The array of annotation threads */
    threads = [];

    /** @property {Array} - The array of annotation handlers */
    handlers = [];

    /**
     * [constructor]
     *
     * @return {AnnotationController} Annotation controller instance
     */
    constructor() {
        super();

        this.handleAnnotationEvent = this.handleAnnotationEvent.bind(this);
    }

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
        const handlers = this.setupAndGetHandlers();
        handlers.forEach((handler) => {
            const eventNames = handler.type.split(' ');
            eventNames.forEach((eventName) => handler.eventObj.addEventListener(eventName, handler.func));
            this.handlers.push(handler);
        });
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
            const eventNames = handler.type.split(' ');
            eventNames.forEach((eventName) => {
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

        // TODO (@minhnguyen): Move annotator.bindCustomListenersOnThread logic to AnnotationController
        this.annotator.bindCustomListenersOnThread(thread);
        thread.addListener('annotationevent', (data) => {
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

        thread.removeAllListeners('threaddeleted');
        thread.removeAllListeners('threadcleanup');
        thread.removeAllListeners('annotationsaved');
        thread.removeAllListeners('annotationevent');
    }

    /**
     * Set up and return the necessary handlers for the annotation mode
     *
     * @protected
     * @return {Array} An array where each element is an object containing the object that will emit the event,
     *                 the type of events to listen for, and the callback
     */
    setupAndGetHandlers() {}

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
}

export default AnnotationController;
