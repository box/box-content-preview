class AnnotationController {
    /** @property {Array} - The array of annotation threads */
    threads = [];

    constructor() {
        this.handleAnnotationEvent = this.handleAnnotationEvent.bind(this);
    }

    registerAnnotator(annotator) {
        this.annotator = annotator;
    }

    /* eslint-disable no-unused-vars */
    setupAndGetHandlers() {}

    handleAnnotationEvent(data = {}) {}
    /* eslint-enable no-unused-vars */

    registerThread(thread) {
        this.threads.push(thread);
    }

    bindCustomListenersOnThread(thread) {
        if (!thread) {
            return;
        }

        thread.addListener('annotationevent', this.handleAnnotationEvent);
    }
}

export default AnnotationController;
