import AnnotationThread from '../AnnotationThread';
import DrawingPath from './DrawingPath';
import DrawingContainer from './DrawingContainer';
import {
    STATES,
    DRAW_STATES,
    DRAW_RENDER_THRESHOLD,
    DRAW_BASE_LINE_WIDTH,
    DRAW_BORDER_OFFSET,
    DRAW_DASHED_SPACING,
    THREAD_EVENT
} from '../annotationConstants';

class DrawingThread extends AnnotationThread {
    /** @property {number} - Drawing state */
    drawingFlag = DRAW_STATES.idle;

    /** @property {DrawingContainer} - The path container supporting undo and redo */
    pathContainer = new DrawingContainer();

    /** @property {DrawingPath} - The path being drawn but not yet finalized */
    pendingPath;

    /** @property {CanvasContext} - The context to draw in-progress drawings on */
    drawingContext;

    /** @property {CanvasContext} - The context to draw saved drawings on on */
    concreteContext;

    /** @property {number} - Timestamp of the last render */
    lastRenderTimestamp;

    /** @property {number} - The the last animation frame request id */
    lastAnimationRequestId;

    /** @property {number} - The scale factor that the drawing thread was last rendered at */
    lastScaleFactor;

    /** @property {number} - The minimum X coordinate occupied by the contained drawing paths */
    minX;

    /** @property {number} - The minimum Y coordinate occupied by the contained drawing paths */
    minY;

    /** @property {number} - The maximum X coordinate occupied by the contained drawing paths */
    maxX;

    /** @property {number} - The maximum Y coordinate occupied by the contained drawing paths */
    maxY;

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
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);

        // Recreate stored paths
        if (this.location && this.location.paths) {
            this.setBoundary();
            this.emit('locationassigned');

            this.location.paths.forEach((drawingPathData) => {
                const pathInstance = new DrawingPath(drawingPathData);
                this.pathContainer.insert(pathInstance);
            });
        }
    }

    /**
     * Destructor for a drawing thread object.
     *
     * [destructor]
     * @inheritdoc
     * @return {void}
     */
    destroy() {
        if (this.lastAnimationRequestId) {
            window.cancelAnimationFrame(this.lastAnimationRequestId);
        }

        if (this.dialog) {
            this.dialog.destroy();
            this.dialog = null;
        }

        super.destroy();
        this.reset();
        this.emit(THREAD_EVENT.threadCleanup);
    }

    /**
     * Reset the state of the thread and clear any drawn boundary
     *
     * @return {void}
     */
    reset() {
        super.reset();

        this.clearBoundary();
    }

    /* eslint-disable no-unused-vars */
    /**
     * Handle a pointer movement
     *
     * @public
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleMove(location) {}

    /**
     * Start a drawing stroke *
     *
     * @public
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleStart(location) {}

    /**
     * End a drawing stroke
     *
     * @public
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleStop(location) {}
    /* eslint-disable no-unused-vars */

    /**
     * Delete a saved drawing thread by deleting each annotation
     * and then clearing the concrete context, boundary, and destroying its path.
     *
     * @public
     * @return {void}
     */
    deleteThread() {
        this.annotations.forEach(this.deleteAnnotationWithID);

        // Calculate the bounding rectangle
        const [x, y, width, height] = this.getBrowserRectangularBoundary();
        // Clear the drawn thread and its boundary
        this.concreteContext.clearRect(
            x - DRAW_BORDER_OFFSET,
            y + DRAW_BORDER_OFFSET,
            width + DRAW_BORDER_OFFSET * 2,
            height - DRAW_BORDER_OFFSET * 2
        );

        this.clearBoundary();

        this.pathContainer.destroy();
        this.pathContainer = null;
    }

    /**
     * Set the drawing styles for a provided context. Sets the context of the in-progress context if
     * no other context is provided.
     *
     * @public
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
        contextToSet.lineWidth = DRAW_BASE_LINE_WIDTH * (scale || 1);
    }

    /**
     * Overturns the last drawing stroke if it exists. Emits the number of undo and redo
     * actions available if an undo was executed.
     *
     * @public
     * @return {void}
     */
    undo() {
        const executedUndo = this.pathContainer.undo();
        if (executedUndo) {
            this.draw(this.drawingContext, true);
            this.updateBoundary();
            this.setBoundary();
            this.drawBoundary();
            this.emitAvailableActions();
        }
    }

    /**
     * Replays the last undone drawing stroke if it exists. Emits the number of undo and redo
     * actions available if a redraw was executed.
     *
     * @public
     * @return {void}
     *
     */
    redo() {
        const executedRedo = this.pathContainer.redo();
        if (executedRedo) {
            this.draw(this.drawingContext, true);
            this.updateBoundary();
            this.setBoundary();
            this.drawBoundary();
            this.emitAvailableActions();
        }
    }

    //--------------------------------------------------------------------------
    // Protected
    //--------------------------------------------------------------------------

    /**
     * Sets up the thread state.
     *
     * @override
     * @protected
     * @return {void}
     */
    setup() {
        if (Object.keys(this.annotations).length === 0) {
            // Newly created thread
            this.state = STATES.pending;
        } else {
            // Saved thread, load boundary dialog
            this.state = STATES.inactive;
            this.createDialog();
        }
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
        this.emit('availableactions', {
            undo: availableActions.undoCount,
            redo: availableActions.redoCount
        });
    }

    /**
     * Draw the boundary on a drawing thread that has been saved
     *
     * @protected
     * @return {void}
     */
    drawBoundary() {
        if (!this.location.page) {
            return;
        }

        const [x, y, width, height] = this.getBrowserRectangularBoundary();

        // Save context style
        this.drawingContext.save();

        this.drawingContext.beginPath();
        this.drawingContext.lineWidth = this.drawingContext.lineWidth / 2;
        this.drawingContext.setLineDash([DRAW_DASHED_SPACING, DRAW_DASHED_SPACING * 2]);
        this.drawingContext.rect(x, y, width, height);
        this.drawingContext.stroke();

        // Restore context style
        this.drawingContext.restore();

        if (this.dialog) {
            if (!this.dialog.isVisible() && !this.pathContainer.isEmpty()) {
                this.showDialog();
            }

            this.dialog.position(x + width, y);
        }
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
        let renderAgain = true;

        const elapsed = timestamp - (this.lastRenderTimestamp || 0);
        if (elapsed >= DRAW_RENDER_THRESHOLD) {
            this.draw(this.drawingContext, true);

            this.lastRenderTimestamp = timestamp;
            renderAgain = this.drawingFlag === DRAW_STATES.drawing;
        }

        if (!renderAgain) {
            return;
        }

        this.lastAnimationRequestId = window.requestAnimationFrame(this.render);
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Update the boundary information
     *
     * @inheritdoc
     * @private
     * @return {void}
     */
    updateBoundary(item) {
        // Recompute the entire AABB when no item is provided, check a new item if it is provided
        const boundaryData = !item
            ? this.pathContainer.getAxisAlignedBoundingBox()
            : DrawingPath.extractDrawingInfo(item, this.location);

        Object.assign(this.location, boundaryData);
    }

    /**
     * Set the coordinates of the rectangular boundary on the saved thread for inserting into the rtree
     *
     * @private
     * @return {void}
     */
    setBoundary() {
        if (!this.location) {
            return;
        }

        const boundaryData = this.location;
        this.minX = boundaryData.minX;
        this.maxX = boundaryData.maxX;
        this.minY = boundaryData.minY;
        this.maxY = boundaryData.maxY;

        if (this.dialog && this.pathContainer.isEmpty()) {
            this.dialog.hide();
        }
    }

    /**
     * Get the rectangular boundary in the form of [x, y, width, height] where the coordinate indicates the upper left
     * point of the rectangular boundary in browser space
     *
     * @private
     * @return {void}
     */
    getBrowserRectangularBoundary() {}

    /**
     * Clear any drawn boundary and associated dialog
     *
     * @return {void}
     */
    clearBoundary() {
        if (this.drawingContext) {
            const canvas = this.drawingContext.canvas;
            this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (!this.dialog || !this.dialog.isVisible()) {
            return;
        }

        this.dialog.hide();
    }
}

export default DrawingThread;
