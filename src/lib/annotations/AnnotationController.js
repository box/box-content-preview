class AnnotationController {
    /** @property {Array} - The array of annotation threads */
    threads = [];

    /** @property {Array} - The array of annotation handlers */
    handlers = [];

    constructor() {
        this.handleAnnotationEvent = this.handleAnnotationEvent.bind(this);
    }

    registerAnnotator(annotator) {
        this.annotator = annotator;
    }

    bindModeListeners() {
        const handlers = this.setupAndGetHandlers();
        handlers.forEach((handler) => {
            const eventNames = handler.type.split(' ');
            eventNames.forEach((eventName) => handler.eventObj.addEventListener(eventName, handler.func));
            this.handlers.push(handler);
        });
    }

    unbindModeListeners() {
        while (this.handlers.length > 0) {
            const handler = this.handlers.pop();
            const eventNames = handler.type.split(' ');
            eventNames.forEach((eventName) => {
                handler.eventObj.removeEventListener(eventName, handler.func);
            });
        }
    }

    /* eslint-disable no-unused-vars */
    setupAndGetHandlers() {}

    handleAnnotationEvent(thread, data = {}) {}
    /* eslint-enable no-unused-vars */

    registerThread(thread) {
        this.threads.push(thread);
    }

    unregisterThread(thread) {
        this.threads = this.threads.filter((candidate) => candidate !== thread);
    }

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

    unbindCustomListenersOnThread(thread) {
        if (!thread) {
            return;
        }

        thread.removeAllListeners('threaddeleted');
        thread.removeAllListeners('threadcleanup');
        thread.removeAllListeners('threadsaved');
        thread.removeAllListeners('annotationevent');
    }
}

export default AnnotationController;
