import AnnotationThread from '../AnnotationThread';
import DrawingPath from './DrawingPath';
import DrawingContainer from './DrawingContainer';
import { DRAW_STATES, DRAW_RENDER_THRESHOLD } from '../annotationConstants';
import * as docAnnotatorUtil from '../doc/docAnnotatorUtil';
import * as annotatorUtil from '../annotatorUtil';

const BASE_LINE_WIDTH = 3;

class DrawingThread extends AnnotationThread {
    /** @property {number} - Drawing state */
    drawingFlag = DRAW_STATES.idle;

    /** @property {DrawingContainer} - The path container supporting undo and redo */
    pathContainer = new DrawingContainer();

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
        this.handleStart = this.handleStart.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleStop = this.handleStop.bind(this);

        // Recreate stored paths
        if (data && data.location && data.location.drawingPaths) {
            const boundaryData = data.location.drawingPaths;
            this.minX = boundaryData.minX;
            this.maxX = boundaryData.maxX;
            this.minY = boundaryData.minY;
            this.maxY = boundaryData.maxY;
            boundaryData.paths.forEach((drawingPathData) => {
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

        super.destroy();
        this.reset();
        this.emit('threadcleanup');
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

    deleteThread() {
        this.annotations.forEach(this.deleteAnnotationWithID);

        const l1 = annotatorUtil.createLocation(this.minX, this.minY, this.location.dimensions);
        const l2 = annotatorUtil.createLocation(this.maxX, this.maxY, this.location.dimensions);
        const [x1, y1] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(l1, this.pageEl);
        const [x2, y2] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(l2, this.pageEl);
        const width = x2 - x1;
        const height = y2 - y1;
        this.concreteContext.clearRect(x1 - 5, y1 + 5, width + 10, height - 10);
        this.destroy();
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Set the drawing styles for a provided context. Sets the context of the in-progress context if
     * no other context is provided.
     *
     * @protected
     * @param {Object} config - The configuration Object
     * @param {number} config.scale - The document scale
     * @param {string} config.color - The brush color
     * @param {CanvasContext} [context] - Optional context provided to be styled
     * @return {void}
     */
    setContextStyles(config, context) {
        if (!this.drawingContext && !context) {
            return;
        }

        const { scale, color } = config;
        const contextToSet = context || this.drawingContext;

        contextToSet.lineCap = 'round';
        contextToSet.lineJoin = 'round';
        contextToSet.strokeStyle = color || 'black';
        contextToSet.lineWidth = BASE_LINE_WIDTH * (scale || 1);
        contextToSet.save();
    }

    /**
     * Draw the pending path onto the DrawingThread CanvasContext. Should be used
     * in conjunction with requestAnimationFrame. Does nothing when there is drawingContext set.
     *
     * @protected
     * @param {number} timestamp - The time when the function was called;
     * @return {void}
     */
    render(timestamp = window.performance.now()) {
        if (this.drawingFlag === DRAW_STATES.drawing) {
            this.lastAnimationRequestId = window.requestAnimationFrame(this.render);
        }

        const elapsed = timestamp - (this.lastRenderTimestamp || 0);
        if (elapsed >= DRAW_RENDER_THRESHOLD) {
            this.draw(this.drawingContext, true);
            this.lastRenderTimestamp = timestamp;
        }
    }

    /**
     * Overturns the last drawing stroke if it exists. Emits the number of undo and redo
     * actions available if an undo was executed.
     *
     * @return {void}
     */
    undo() {
        const executedUndo = this.pathContainer.undo();
        if (executedUndo) {
            this.draw(this.drawingContext, true);
            this.emitAvailableActions();
        }
    }

    /**
     * Replays the last undone drawing stroke if it exists. Emits the number of undo and redo
     * actions available if a redraw was executed.
     *
     * @return {void}
     *
     */
    redo() {
        const executedRedo = this.pathContainer.redo();
        if (executedRedo) {
            this.draw(this.drawingContext, true);
            this.emitAvailableActions();
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
        const annotation = super.createAnnotationData(type, text);
        const boundaryData = this.pathContainer.getAABB();
        this.minX = boundaryData.minX;
        this.maxX = boundaryData.maxX;
        this.minY = boundaryData.minY;
        this.maxY = boundaryData.maxY;

        annotation.location.drawingPaths = boundaryData;
        return annotation;
    }

    /**
     * Draws the paths in the thread onto the given context.
     *
     * @protected
     * @param {CanvasContext} context - The context to draw on
     * @param {boolean} [clearCanvas] - A flag to clear the canvas before drawing.
     * @return {void}
     */
    draw(context, clearCanvas = false) {
        if (!context) {
            return;
        }

        /* OPTIMIZE (@minhnguyen): Render only what has been obstructed by the new drawing
         *           rather than every single line in the thread. If we do end
         *           up splitting saves into multiple requests, we can buffer
         *           the amount of re-renders onto a temporary memory canvas.
         */
        if (clearCanvas) {
            const canvas = context.canvas;
            context.clearRect(0, 0, canvas.width, canvas.height);
        }

        context.beginPath();
        this.pathContainer.applyToItems((drawing) => drawing.drawPath(context));
        if (this.pendingPath && !this.pendingPath.isEmpty()) {
            this.pendingPath.drawPath(context);
        }

        context.stroke();
    }

    /**
     * Emit an event containing the number of undo and redo actions that can be done.
     *
     * @protected
     * @return {void}
     */
    emitAvailableActions() {
        const availableActions = this.pathContainer.getNumberOfItems();
        this.emit('annotationevent', {
            type: 'availableactions',
            undo: availableActions.undoCount,
            redo: availableActions.redoCount
        });
    }

    /**
     * Draw the boundary on a drawing thread
     *
     * @return {void}
     */
    drawBoundary() {
        const l1 = annotatorUtil.createLocation(this.minX, this.minY, this.location.dimensions);
        const l2 = annotatorUtil.createLocation(this.maxX, this.maxY, this.location.dimensions);

        const [x1, y1] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(l1, this.pageEl);
        const [x2, y2] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(l2, this.pageEl);
        const canvas = this.drawingContext.canvas;
        this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        this.drawingContext.beginPath();
        this.drawingContext.rect(x1, y1, x2 - x1, y2 - y1);
        const lineWidth = this.drawingContext.lineWidth;
        this.drawingContext.lineWidth = lineWidth / 2;
        this.drawingContext.setLineDash([5, 10]);
        this.drawingContext.stroke();
        this.drawingContext.restore();
        this.drawingContext.save();

        return {
            topLeft: l1,
            bottomRight: l2
        };
    }
}

export default DrawingThread;
