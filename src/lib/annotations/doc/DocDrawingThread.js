import {
    STATES,
    STATES_DRAW,
    PAGE_PADDING_TOP,
    PAGE_PADDING_BOTTOM,
    CLASS_ANNOTATION_LAYER_DRAW
} from '../annotationConstants';
import DrawingPath from '../drawing/DrawingPath';
import DrawingThread from '../drawing/DrawingThread';
import * as docAnnotatorUtil from './docAnnotatorUtil';
import * as annotatorUtil from '../annotatorUtil';

const CLASS_ANNOTATION_LAYER_DRAW_MEMORY = `${CLASS_ANNOTATION_LAYER_DRAW}-mem`;

class DocDrawingThread extends DrawingThread {
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
        const pageChanged = this.hasPageChanged(location);
        if (this.drawingFlag !== STATES_DRAW.draw || pageChanged) {
            return;
        }

        const [x, y] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(location, this.pageEl);
        const browserLocation = annotatorUtil.createLocation(x, y);
        this.pendingPath.addCoordinate(location, browserLocation);

        // Cancel any pending animation to a new request.
        if (this.lastAnimationRequestId) {
            window.cancelAnimationFrame(this.lastAnimationRequestId);
        }

        // Keep animating while the drawing flag is down
        this.lastAnimationRequestId = window.requestAnimationFrame(this.render);
    }

    /**
     * Start a drawing stroke
     *
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleStart(location) {
        const pageChanged = this.hasPageChanged(location);
        if (pageChanged) {
            this.handleStop(location);
            if (this.postButtonEl) {
                this.postButtonEl.click();
            }

            return;
        }

        // Assign a location and dimension to the annotation thread
        if (!this.location || (this.location && !this.location.page)) {
            this.location = {
                page: location.page,
                dimensions: location.dimensions
            };
            this.pageEl = docAnnotatorUtil.getPageEl(this.annotatedElement, this.location.page);
            this.checkAndHandleScaleUpdate();
        }

        this.drawingFlag = STATES_DRAW.draw;
        if (!this.pendingPath) {
            this.pendingPath = new DrawingPath();
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

    /**
     * Commit the drawing in progress if a drawing goes to a different page
     *
     * @param {Object} location - The current event location information
     * @return {boolean} Whether or not the page actually changed and was subsequently handled
     */
    hasPageChanged(location) {
        return this.location && this.location.page && this.location.page !== location.page;
    }

    /**
     * Saves a drawing annotation to the drawing annotation layer canvas.
     *
     * @param {string} type - Type of annotation
     * @param {string} text - Text of annotation to save
     * @return {void}
     */
    saveAnnotation(type, text) {
        super.saveAnnotation(type, text);
        this.reset();

        const drawingAnnotationLayerContext = docAnnotatorUtil.getContext(
            this.pageEl,
            CLASS_ANNOTATION_LAYER_DRAW,
            PAGE_PADDING_TOP,
            PAGE_PADDING_BOTTOM
        );

        if (drawingAnnotationLayerContext) {
            const memoryCanvas = this.drawingContext.canvas;
            drawingAnnotationLayerContext.drawImage(memoryCanvas, 0, 0);
            this.drawingContext.clearRect(0, 0, memoryCanvas.width, memoryCanvas.height);
        }
    }

    /**
     * Display the doc drawing thread
     *
     * @return {void}
     */
    show() {
        if (!this.annotatedElement || !this.location) {
            return;
        }

        // Get DrawingPath objects to be shown
        const drawings = this.getDrawings();
        if (this.pendingPath && !this.pendingPath.isEmpty()) {
            drawings.push(this.pendingPath);
        }

        this.checkAndHandleScaleUpdate();

        // Get the annotation layer context to draw with
        let context;
        if (this.state === STATES.pending) {
            context = this.drawingContext;
        } else {
            this.pageEl = docAnnotatorUtil.getPageEl(this.annotatedElement, this.location.page);
            const config = { scale: this.lastScaleFactor };
            context = docAnnotatorUtil.getContext(
                this.pageEl,
                CLASS_ANNOTATION_LAYER_DRAW,
                PAGE_PADDING_TOP,
                PAGE_PADDING_BOTTOM
            );
            this.setContextStyles(config, context);
        }

        // Draw the paths to the annotation layer canvas
        /* eslint-disable require-jsdoc */
        const scaleAndDraw = (drawing) => {
            drawing.generateBrowserPath(this.pageEl, this.location.dimensions);
            drawing.drawPath(context);
        };
        /* eslint-enable require-jsdoc */
        if (context) {
            context.beginPath();
            drawings.forEach(scaleAndDraw);
            context.stroke();
        }
    }

    /**
     * Prepare the pending drawing canvas if the scale factor has changed since the last render
     *
     * @return {void}
     */
    checkAndHandleScaleUpdate() {
        const scale = annotatorUtil.getScale(this.annotatedElement);
        if (this.lastScaleFactor === scale) {
            return;
        }

        this.lastScaleFactor = scale;
        // Set the in-memory context for the pending thread
        if (this.drawingContext) {
            // Resetting the height clears the canvas
            this.drawingContext.canvas.height = this.drawingContext.canvas.height;
        } else {
            this.drawingContext = docAnnotatorUtil.getContext(
                this.pageEl,
                CLASS_ANNOTATION_LAYER_DRAW_MEMORY,
                PAGE_PADDING_TOP,
                PAGE_PADDING_BOTTOM
            );
        }

        const config = { scale };
        this.setContextStyles(config);
    }
}

export default DocDrawingThread;
