/**
 * @fileoverview The doc point thread class manages a document's point
 * annotation indicator element and dialogs for creating/deleting annotations.
 * @author tjin
 */

import autobind from 'autobind-decorator';
import AnnotationThread from '../annotation-thread';
import DocPointDialog from './doc-point-dialog';
import * as annotatorUtil from '../annotator-util';
import * as constants from '../annotation-constants';
import * as docAnnotatorUtil from './doc-annotator-util';

const PAGE_PADDING_TOP = 15;
const POINT_ANNOTATION_ICON_HEIGHT = 31;
const POINT_ANNOTATION_ICON_DOT_HEIGHT = 8;
const POINT_ANNOTATION_ICON_WIDTH = 24;

@autobind
class DocPointThread extends AnnotationThread {

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Shows the appropriate annotation dialog for this thread.
     *
     * @override
     * @returns {void}
     */
    showDialog() {
        // Don't show dialog if user can annotate and there is a current selection
        if (this._annotationService.canAnnotate && docAnnotatorUtil.isSelectionPresent()) {
            return;
        }

        super.showDialog();
    }

    //--------------------------------------------------------------------------
    // Abstract Implementations
    //--------------------------------------------------------------------------

    /**
     * Shows the annotation indicator.
     *
     * @override
     * @returns {void}
     */
    show() {
        const pageEl = this._annotatedElement.querySelector(`[data-page-number="${this._location.page}"]`) || this._annotatedElement;
        const [browserX, browserY] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(this._location, this._annotatedElement);

        // Position and append to page
        this._element.style.left = `${browserX - (POINT_ANNOTATION_ICON_WIDTH / 2)}px`;
        // Add 15px for vertical padding on page
        this._element.style.top = `${browserY - POINT_ANNOTATION_ICON_HEIGHT + (POINT_ANNOTATION_ICON_DOT_HEIGHT / 2) + PAGE_PADDING_TOP}px`;
        pageEl.appendChild(this._element);

        annotatorUtil.showElement(this._element);

        if (this._state === constants.ANNOTATION_STATE_PENDING) {
            this.showDialog();
        }
    }

    /**
     * Creates the document point annotation dialog for the thread.
     *
     * @override
     * @returns {void}
     */
    createDialog() {
        this._dialog = new DocPointDialog({
            annotatedElement: this._annotatedElement,
            annotations: this._annotations,
            locale: this._locale,
            location: this._location,
            canAnnotate: this._annotationService.canAnnotate
        });
    }
}

export default DocPointThread;
