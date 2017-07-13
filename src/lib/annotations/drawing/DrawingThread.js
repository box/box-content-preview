/* global Rbush */
import AnnotationThread from '../AnnotationThread';
import { DRAW_POINTER_UP, DRAW_POINTER_DOWN, DRAW_RENDER_THRESHOLD } from '../annotationConstants';

const RTREE_WIDTH = 5; // Lower number - faster search, higher - faster insert
const BASE_LINE_WIDTH = 3;

class DrawingThread extends AnnotationThread {
    /** @property {number} - Timestamp of the last render */
    lastRenderTimestamp;

    /** @property {number} - Drawing state */
    drawingFlag;

    /** @property {Rbush} - Rtree path container */
    pathContainer;

    /** @property {ImageData} - The ImageData after the last saved stroke */
    savedState;

    /** @property {DrawingPath} - The path being drawn but not yet finalized */
    pendingPath;

    /** @property {CanvasContext} - The context to be drawn on */
    context;

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /**
     * Creates and mananges drawing annotations
     *
     * [constructor]
     * @inheritdoc
     * @return {DrawingThread} DrawingThread
     */
    constructor(data) {
        super(data);

        this.drawingFlag = DRAW_POINTER_UP;
        this.pathContainer = new Rbush(RTREE_WIDTH);
    }

    /**
     * Unbind any listeners still attached
     *
     * [destructor]
     * @return {void}
     */
    destroy() {
        this.removeAllListeners();
    }
    /**
     * Get all of the DrawingPaths in the current thread.
     * @return {void}
     */
    getDrawings() {
        return this.pathContainer.data.children;
    }

    /* eslint-disable no-unused-vars */
    /**
     * Handle a pointer movement
     *
     * @param {Object} location The location information of the pointer
     * @return {void}
     */
    handleMove(location) {}

    /**
     * Start a drawing stroke
     *
     * @param {Object} location The location information of the pointer
     * @return {void}
     */
    handleStart(location) {}

    /**
     * End a drawing stroke
     *
     * @param {Object} location The location information of the pointer
     * @return {void}
     */
    handleStop(location) {}
    /* eslint-disable no-unused-vars */

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * @protected
     * @param {number} scale The document scale
     * @return {void}
     */
    updateContextStyles(scale) {
        if (this.context) {
            this.context.lineCap = 'round';
            this.context.lineJoin = 'round';
            this.context.strokeStyle = 'black';
            this.context.lineWidth = BASE_LINE_WIDTH * scale;
        }
    }

    /**
     * @protected
     * @param {number} timestamp The time when the function was called;
     * @return {void}
     */
    render(timestamp) {
        if (this.drawingFlag === DRAW_POINTER_DOWN) {
            const elapsed = timestamp - (this.lastRenderTimestamp || 0);
            if (elapsed >= DRAW_RENDER_THRESHOLD && this.context) {
                this.lastRenderTimestamp = timestamp;
                const context = this.context;
                if (this.savedState) {
                    context.putImageData(this.savedState, 0, 0);
                }
                this.pendingPath.drawPath(context);
            }
            // Keep animating while the drawing flag is down
            window.requestAnimationFrame(this.render.bind(this));
        }
    }
}

export default DrawingThread;
