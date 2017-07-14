/* global Rbush */
import AnnotationThread from '../AnnotationThread';
import { DRAW_POINTER_UP, DRAW_POINTER_DOWN, DRAW_RENDER_THRESHOLD } from '../annotationConstants';

const RTREE_WIDTH = 5; // Lower number - faster search, higher - faster insert
const BASE_LINE_WIDTH = 3;

class DrawingThread extends AnnotationThread {
    /** @property {number} - Drawing state */
    drawingFlag = DRAW_POINTER_UP;

    /** @property {Rbush} - Rtree path container */
    pathContainer = new Rbush(RTREE_WIDTH);

    /** @property {function} - A call to render that is bound with 'this' object */
    renderCall = this.render.bind(this);

    /** @property {CanvasContext} - A canvas for drawing new strokes */
    memoryCanvas;

    /** @property {DrawingPath} - The path being drawn but not yet finalized */
    pendingPath;

    /** @property {CanvasContext} - The context to be drawn on */
    context;

    /** @property {number} - Timestamp of the last render */
    lastRenderTimestamp;

    /** @property {number} - The the last animation frame request id */
    lastAnimRequestId;

    /**
     * Soft destructor for a drawingthread object
     *
     * [constructor]
     * @inheritdoc
     * @return {void}
     */
    destroy() {
        if (this.lastAnimRequestId) {
            window.cancelAnimationFrame(this.lastAnimRequestId);
        }
        this.removeAllListeners();
        this.reset();
        super.destroy();
    }

    /**
     * Get all of the DrawingPaths in the current thread.
     *
     * @return {void}
     */
    getDrawings() {
        return this.pathContainer.data.children;
    }

    /* eslint-disable no-unused-vars */
    /**
     * Handle a pointer movement
     *
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleMove(location) {}

    /**
     * Start a drawing stroke
     *
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleStart(location) {}

    /**
     * End a drawing stroke
     *
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleStop(location) {}
    /* eslint-disable no-unused-vars */

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Set the drawing styles
     *
     * @protected
     * @param {number} scale - The document scale
     * @return {void}
     */
    setContextStyles(scale) {
        if (!this.context) {
            return;
        }

        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        this.context.strokeStyle = 'black';
        this.context.lineWidth = BASE_LINE_WIDTH * scale;
    }

    /**
     * Draw the pending path onto the DrawingThread CanvasContext. Should be used
     * in conjunction with requestAnimationFrame.
     *
     * @protected
     * @param {number} timestamp - The time when the function was called;
     * @return {void}
     */
    render(timestamp) {
        if (this.drawingFlag === DRAW_POINTER_DOWN) {
            const elapsed = timestamp - (this.lastRenderTimestamp || 0);
            if (elapsed >= DRAW_RENDER_THRESHOLD && this.context) {
                this.lastRenderTimestamp = timestamp;
                const context = this.context;

                const numLines = this.container.data.children.length;
                for (let i = 0; i < numLines; i++) {
                    this.container.data.children[i].drawPath(context);
                }
            }
        }
    }
}

export default DrawingThread;
