import rbush from 'rbush';
import AnnotationThread from '../AnnotationThread';
import { STATES_DRAW, DRAW_RENDER_THRESHOLD } from '../annotationConstants';

const RTREE_WIDTH = 5; // Lower number - faster search, higher - faster insert
const BASE_LINE_WIDTH = 3;

class DrawingThread extends AnnotationThread {
    /** @property {number} - Drawing state */
    drawingFlag = STATES_DRAW.idle;

    /** @property {rbush} - Rtree path container */
    /* eslint-disable new-cap */
    pathContainer = new rbush(RTREE_WIDTH);
    /* eslint-enable new-cap */

    /** @property {CanvasContext} - A canvas for drawing new strokes */
    memoryCanvas;

    /** @property {DrawingPath} - The path being drawn but not yet finalized */
    pendingPath;

    /** @property {CanvasContext} - The context to be drawn on */
    drawingContext;

    /** @property {number} - Timestamp of the last render */
    lastRenderTimestamp;

    /** @property {number} - The the last animation frame request id */
    lastAnimationRequestId;

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
        this.handleStart = this.handleStart.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleStop = this.handleStop.bind(this);
    }

    /**
     * Soft destructor for a drawingthread object
     *
     * [destructor]
     * @inheritdoc
     * @return {void}
     */
    destroy() {
        if (this.lastAnimationRequestId) {
            window.cancelAnimationFrame(this.lastAnimationRequestId);
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

    /**
     * Set the drawing styles
     *
     * @param {Object} config - The configuration Object
     * @param {number} config.scale - The document scale
     * @param {string} config.color - The brush color
     * @return {void}
     */
    setContextStyles(config) {
        if (!this.drawingContext) {
            return;
        }
        const { scale, color } = config;

        this.drawingContext.lineCap = 'round';
        this.drawingContext.lineJoin = 'round';
        this.drawingContext.strokeStyle = color || 'black';
        this.drawingContext.lineWidth = BASE_LINE_WIDTH * (scale || 1);
    }

    /**
     * Draw the pending path onto the DrawingThread CanvasContext. Should be used
     * in conjunction with requestAnimationFrame.
     *
     * @param {number} timestamp - The time when the function was called;
     * @return {void}
     */
    render(timestamp) {
        const elapsed = timestamp - (this.lastRenderTimestamp || 0);
        if (elapsed < DRAW_RENDER_THRESHOLD || !this.drawingContext) {
            return;
        }

        this.lastRenderTimestamp = timestamp;
        const canvas = this.drawingContext.canvas;
        const drawings = this.getDrawings();

        /* OPTIMIZE (@minhnguyen): Render only what has been obstructed by the new drawing
         *           rather than every single line in the thread. If we do end
         *           up splitting saves into multiple requests, we can buffer
         *           the amount of re-renders onto a temporary memory canvas.
         */
        this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        drawings.forEach((drawing) => drawing.drawPath(this.drawingContext));

        if (this.pendingPath) {
            this.pendingPath.drawPath(this.drawingContext);
        }
    }

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
            drawingPaths: this.getDrawings(),
            fileVersionId: this.fileVersionId,
            user: this.annotationService.user,
            threadID: this.threadID,
            threadNumber: this.threadNumber
        };
    }
}

export default DrawingThread;
