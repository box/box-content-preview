/* global Rbush */
import AnnotationThread from '../AnnotationThread';
import { DRAW_POINTER_UP, DRAW_RENDER_THRESHOLD } from '../annotationConstants';

const RTREE_WIDTH = 5; // Lower number - faster search, higher - faster insert
const BASE_LINE_WIDTH = 3;

class DrawingThread extends AnnotationThread {
    /** @property {number} - Drawing state */
    drawingFlag = DRAW_POINTER_UP;

    /** @property {Rbush} - Rtree path container */
    pathContainer = new Rbush(RTREE_WIDTH);

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
     * [constructor]
     *
     * @inheritdoc
     * @param {AnnotationThreadData} data - Data for constructing thread
     * @return {DrawingThread} Drawing annotation thread instance
     */
    constructor(data) {
        super(data);
        this.render = this.render.bind(this);
    }

    /**
     * Soft destructor for a drawingthread object
     *
     * [destructor]
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
        return this.pathContainer.all();
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
     * Start a drawing stroke *
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
        const elapsed = timestamp - (this.lastRenderTimestamp || 0);
        if (elapsed >= DRAW_RENDER_THRESHOLD && this.context) {
            this.lastRenderTimestamp = timestamp;
            const context = this.context;
            const canvas = context.canvas;
            this.context.clearRect(0, 0, canvas.width, canvas.height);

            const drawings = this.getDrawings();
            /* OPTIMIZE: Render only what has been obstructed by the new drawing
             *           rather than every single line in the thread. If we do end
             *           up splitting saves into multiple requests, we can buffer
             *           the amount of re-renders onto a temporary memory canvas.
             */
            drawings.forEach((drawing) => drawing.drawPath(context));
            if (this.pendingPath) {
                this.pendingPath.drawPath(context);
            }
        }
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Create an annotation data object to pass to annotation service.
     *
     * @inheritdoc
     * @private
     * @param {string} type - Type of annotation
     * @param {string} text - Annotation text
     * @return {Object} Annotation data
     */
    createAnnotationData(type, text) {
        return {
            type,
            fileVersionId: this.fileVersionId,
            DrawingPaths: this.getDrawings(),
            user: this.annotationService.user,
            threadID: this.threadID,
            thread: this.thread
        };
    }
}

export default DrawingThread;
