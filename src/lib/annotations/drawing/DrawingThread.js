/* global Rbush */
import AnnotationThread from '../AnnotationThread';
import DrawingPath from './DrawingPath';
import { STATES_DRAW, DRAW_RENDER_THRESHOLD } from '../annotationConstants';

const RTREE_WIDTH = 5; // Lower number - faster search, higher - faster insert
const BASE_LINE_WIDTH = 3;

class DrawingThread extends AnnotationThread {
    /** @property {number} - Drawing state */
    drawingFlag = STATES_DRAW.idle;

    /** @property {Rbush} - Rtree path container */
    pathContainer = new Rbush(RTREE_WIDTH);

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

    /** @property {number} - The scale factor that the drawing thread was last rendered at */
    lastScaleFactor;

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

        if (data && data.location && data.location.drawingPaths instanceof Array) {
            data.location.drawingPaths.forEach((drawingPathData) => {
                const pathInstance = new DrawingPath(drawingPathData);
                this.pathContainer.insert(pathInstance);
            });
        }
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

        if (this.drawingContext) {
            const canvas = this.drawingContext.canvas;
            this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        }

        this.reset();
        super.destroy();
        this.emit('threadcleanup');
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
     * Set the drawing styles for a provided context. Sets the context of the memory context if
     * no other context is provided.
     *
     * @protected
     * @param {Object} config - The configuration Object
     * @param {number} config.scale - The document scale
     * @param {string} config.color - The brush color
     * @param {CanvasContext} [otherContext] - Optional context to be set
     * @return {void}
     */
    setContextStyles(config, otherContext) {
        if (!this.drawingContext && !otherContext) {
            return;
        }

        const { scale, color } = config;
        const contextToSet = otherContext || this.drawingContext;

        contextToSet.lineCap = 'round';
        contextToSet.lineJoin = 'round';
        contextToSet.strokeStyle = color || 'black';
        contextToSet.lineWidth = BASE_LINE_WIDTH * (scale || 1);
    }

    /**
     * Draw the pending path onto the DrawingThread CanvasContext. Should be used
     * in conjunction with requestAnimationFrame. Does nothing when there is drawingContext set.
     *
     * @protected
     * @param {number} timestamp - The time when the function was called;
     * @return {void}
     */
    render(timestamp) {
        if (this.drawingFlag === STATES_DRAW.draw) {
            this.lastAnimationRequestId = window.requestAnimationFrame(this.render);
        }

        const elapsed = timestamp - (this.lastRenderTimestamp || 0);
        if (elapsed < DRAW_RENDER_THRESHOLD || !this.drawingContext) {
            return;
        }

        this.lastRenderTimestamp = timestamp;

        const canvas = this.drawingContext.canvas;
        const drawings = this.getDrawings();
        if (this.pendingPath && !this.pendingPath.isEmpty()) {
            drawings.push(this.pendingPath);
        }

        /* OPTIMIZE (@minhnguyen): Render only what has been obstructed by the new drawing
         *           rather than every single line in the thread. If we do end
         *           up splitting saves into multiple requests, we can buffer
         *           the amount of re-renders onto a temporary memory canvas.
         */
        this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        this.drawingContext.beginPath();
        drawings.forEach((drawing) => drawing.drawPath(this.drawingContext));
        this.drawingContext.stroke();
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
        const annotation = super.createAnnotationData(type, text);
        const drawings = this.getDrawings();

        annotation.location.drawingPaths = drawings.map(DrawingPath.extractDrawingInfo);
        return annotation;
    }
}

export default DrawingThread;
