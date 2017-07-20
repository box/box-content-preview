import {
    STATES_DRAW,
    PAGE_PADDING_TOP,
    PAGE_PADDING_BOTTOM,
    CLASS_ANNOTATION_LAYER_DRAW
} from '../annotationConstants';
import { getScale } from '../annotatorUtil';
import DrawingPath from '../drawing/DrawingPath';
import DrawingThread from '../drawing/DrawingThread';
import * as DocAnnotatorUtil from './docAnnotatorUtil';

class DocDrawingThread extends DrawingThread {
    /** @property {number} - Drawing state */
    lastPage;

    /** @property {HTMLElement} - Page element being observed */
    pageEl;

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /**
     * Handle a pointer movement
     *
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleMove(location) {
        const pageChanged = this.lastPage && this.lastPage !== location.page;

        this.lastPage = location.page;
        if (!this.pageEl || pageChanged) {
            this.pageEl = DocAnnotatorUtil.getPageEl(this.annotatedElement, location.page);
            if (pageChanged) {
                this.handleStop(location);
            }
            return;
        }

        const [x, y] = DocAnnotatorUtil.getBrowserCoordinatesFromLocation(location, this.pageEl);
        if (this.drawingFlag === STATES_DRAW.draw) {
            this.pendingPath.addCoordinate(x, y);

            // Cancel any pending animation to a new request.
            if (this.lastAnimRequestId) {
                window.cancelAnimationFrame(this.lastAnimRequestId);
            }
            // Keep animating while the drawing flag is down
            this.lastAnimRequestId = window.requestAnimationFrame(this.render);
        }
    }

    /**
     * Start a drawing stroke
     *
     * @return {void}
     */
    handleStart() {
        this.drawingFlag = STATES_DRAW.draw;
        const scale = getScale(this.annotatedElement);
        const context = DocAnnotatorUtil.getContext(
            this.pageEl,
            CLASS_ANNOTATION_LAYER_DRAW,
            PAGE_PADDING_TOP,
            PAGE_PADDING_BOTTOM
        );

        if (!this.pendingPath) {
            this.pendingPath = new DrawingPath();
        }

        if (!this.context || context !== this.context) {
            this.context = context;
            this.setContextStyles(scale);
        }
    }

    /**
     * End a drawing stroke
     *
     * @return {void}
     */
    handleStop() {
        this.drawingFlag = STATES_DRAW.idle;
        if (this.pendingPath && !this.pendingPath.isEmpty()) {
            this.pathContainer.insert(this.pendingPath);
            this.pendingPath = null;
        }
    }
}

export default DocDrawingThread;
