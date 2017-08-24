import {
    STATES,
    DRAW_STATES,
    PAGE_PADDING_TOP,
    PAGE_PADDING_BOTTOM,
    CLASS_ANNOTATION_LAYER_DRAW,
    CLASS_ANNOTATION_LAYER_DRAW_IN_PROGRESS
} from '../annotationConstants';
import DrawingPath from '../drawing/DrawingPath';
import DrawingThread from '../drawing/DrawingThread';
import * as docAnnotatorUtil from './docAnnotatorUtil';
import * as annotatorUtil from '../annotatorUtil';

class DocDrawingThread extends DrawingThread {
    /** @property {HTMLElement} - Page element being observed */
    pageEl;

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /**
     * [constructor]
     *
     * @inheritdoc
     * @param {AnnotationThreadData} data - Data for constructing thread
     * @return {DocDrawingThread} Drawing annotation thread instance
     */
    constructor(data) {
        super(data);

        this.onPageChange = this.onPageChange.bind(this);
        this.reconstructBrowserCoordFromLocation = this.reconstructBrowserCoordFromLocation.bind(this);
    }
    /**
     * Handle a pointer movement
     *
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleMove(location) {
        if (this.drawingFlag !== DRAW_STATES.drawing || !location) {
            return;
        } else if (this.hasPageChanged(location)) {
            this.onPageChange(location);
        }

        const [x, y] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(location, this.pageEl);
        const browserLocation = annotatorUtil.createLocation(x, y);

        if (this.pendingPath) {
            this.pendingPath.addCoordinate(location, browserLocation);
        }
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
            this.onPageChange(location);
            return;
        }

        // Assign a location and dimension to the annotation thread
        if ((!this.location || !this.location.page) && location.page) {
            this.location = {
                page: location.page,
                dimensions: location.dimensions
            };
            this.checkAndHandleScaleUpdate();
            this.emit('annotationevent', {
                type: 'locationassigned'
            });
        }

        this.drawingFlag = DRAW_STATES.drawing;
        if (!this.pendingPath) {
            this.pendingPath = new DrawingPath();
        }

        // Start drawing rendering
        this.lastAnimationRequestId = window.requestAnimationFrame(this.render);
    }

    /**
     * End a drawing stroke
     *
     * @return {void}
     */
    handleStop() {
        this.drawingFlag = DRAW_STATES.idle;

        if (this.pendingPath && !this.pendingPath.isEmpty()) {
            this.pathContainer.insert(this.pendingPath);
            this.emitAvailableActions();
            this.pendingPath = null;
        }
    }

    /**
     * Determine if the drawing in progress if a drawing goes to a different page
     *
     * @param {Object} location - The current event location information
     * @return {boolean} Whether or not the thread page has changed
     */
    hasPageChanged(location) {
        return location && !!this.location && !!this.location.page && this.location.page !== location.page;
    }

    /**
     * Saves a drawing annotation to the drawing annotation layer canvas.
     *
     * @param {string} type - Type of annotation
     * @param {string} text - Text of annotation to save
     * @return {void}
     */
    saveAnnotation(type, text) {
        this.emit('annotationevent', {
            type: 'drawcommit'
        });
        this.reset();

        // Only make save request to server if there exist paths to save
        const { undoCount } = this.pathContainer.getNumberOfItems();
        if (undoCount === 0) {
            return;
        }

        super.saveAnnotation(type, text);
        this.setBoundary();

        this.concreteContext = docAnnotatorUtil.getContext(
            this.pageEl,
            CLASS_ANNOTATION_LAYER_DRAW,
            PAGE_PADDING_TOP,
            PAGE_PADDING_BOTTOM
        );

        if (this.concreteContext) {
            // Move the in-progress drawing to the concrete context
            const inProgressCanvas = this.drawingContext.canvas;
            const width = parseInt(inProgressCanvas.style.width, 10);
            const height = parseInt(inProgressCanvas.style.height, 10);
            this.concreteContext.drawImage(inProgressCanvas, 0, 0, width, height);
            this.drawingContext.clearRect(0, 0, inProgressCanvas.width, inProgressCanvas.height);
        }
    }

    /**
     * Display the document drawing thread. Will set the drawing context if the scale has changed since the last show.
     *
     * @return {void}
     */
    show() {
        if (!this.annotatedElement || !this.location) {
            return;
        }

        // Get the annotation layer context to draw with
        const context = this.selectContext();

        // Generate the paths and draw to the annotation layer canvas
        this.pathContainer.applyToItems((drawing) =>
            drawing.generateBrowserPath(this.reconstructBrowserCoordFromLocation)
        );

        if (this.pendingPath && !this.pendingPath.isEmpty()) {
            this.pendingPath.generateBrowserPath(this.reconstructBrowserCoordFromLocation);
        }

        this.draw(context, false);
    }

    /**
     * Prepare the pending drawing canvas if the scale factor has changed since the last render. Will do nothing if
     * the thread has not been assigned a page.
     *
     * @return {void}
     */
    checkAndHandleScaleUpdate() {
        const scale = annotatorUtil.getScale(this.annotatedElement);
        if (this.lastScaleFactor === scale || (!this.location || !this.location.page)) {
            return;
        }

        // Set the scale and in-memory context for the pending thread
        this.lastScaleFactor = scale;
        this.pageEl = docAnnotatorUtil.getPageEl(this.annotatedElement, this.location.page);
        this.drawingContext = docAnnotatorUtil.getContext(
            this.pageEl,
            CLASS_ANNOTATION_LAYER_DRAW_IN_PROGRESS,
            PAGE_PADDING_TOP,
            PAGE_PADDING_BOTTOM
        );

        const config = { scale };
        this.setContextStyles(config);
    }

    /**
     * End the current drawing and emit a page changed event
     *
     * @param {Object} location - The location information indicating the page has changed.
     * @return {void}
     */
    onPageChange(location) {
        this.handleStop();
        this.emit('annotationevent', {
            type: 'pagechanged',
            location
        });
    }

    /**
     * Requires a DocDrawingThread to have been started with DocDrawingThread.start(). Reconstructs a browserCoordinate
     * relative to the dimensions of the DocDrawingThread page element.
     *
     * @private
     * @param {Location} documentLocation - The location coordinate relative to the document
     * @return {Location} The location coordinate relative to the browser
     */
    reconstructBrowserCoordFromLocation(documentLocation) {
        const reconstructedLocation = annotatorUtil.createLocation(
            documentLocation.x,
            documentLocation.y,
            this.location.dimensions
        );
        const [xNew, yNew] = docAnnotatorUtil.getBrowserCoordinatesFromLocation(reconstructedLocation, this.pageEl);
        return annotatorUtil.createLocation(xNew, yNew);
    }

    /**
     * Choose the context to draw on. If the state of the thread is pending, select the in-progress context,
     * otherwise select the concrete context.
     *
     * @return {void}
     */
    selectContext() {
        this.checkAndHandleScaleUpdate();

        if (this.state === STATES.pending) {
            return this.drawingContext;
        }

        const config = { scale: this.lastScaleFactor };
        this.concreteContext = docAnnotatorUtil.getContext(
            this.pageEl,
            CLASS_ANNOTATION_LAYER_DRAW,
            PAGE_PADDING_TOP,
            PAGE_PADDING_BOTTOM
        );

        this.setContextStyles(config, this.concreteContext);

        return this.concreteContext;
    }
}

export default DocDrawingThread;
