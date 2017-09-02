import AnnotationDialog from '../AnnotationDialog';

class DocDrawingDialog extends AnnotationDialog {
    /**
     * Empty stub to avoid unexpected behavior.
     *
     * @override
     * @protected
     */
    addAnnotation() {}

    /**
     * Empty stub to avoid unexpected behavior.
     *
     * @override
     * @protected
     */
    removeAnnotation() {}

    /**
     * Sets up the drawing dialog element.
     *
     * @param {Annotation[]} annotations - Annotations to show in the dialog
     * @param {HTMLElement} threadEl - Annotation icon element
     * @return {void}
     * @protected
     */
    /* eslint-disable no-unused-vars */
    setup(annotations, threadEl) {}
    /* eslint-enable no-unused-vars */

    /**
     * Display the dialog in the browser
     *
         * @protected
     * @return {void}
     */
    show() {}
}

export default DocDrawingDialog;
