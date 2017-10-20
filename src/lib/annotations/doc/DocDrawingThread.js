import DrawingPath from '../drawing/DrawingPath';
import DrawingThread from '../drawing/DrawingThread';
import DocDrawingDialog from '../doc/DocDrawingDialog';
import {
    STATES,
    DRAW_STATES,
    CLASS_ANNOTATION_LAYER_DRAW,
    CLASS_ANNOTATION_LAYER_DRAW_IN_PROGRESS
} from '../annotationConstants';
import { getBrowserCoordinatesFromLocation, getContext, getPageEl } from './docAnnotatorUtil';
import { createLocation, getScale } from '../annotatorUtil';

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
     * @public
     * @param {Object} location - The location information of the pointer
     * @return {void}
     */
    handleMove(location) {
        if (this.drawingFlag !== DRAW_STATES.drawing || !location) {
            return;
        } else if (this.hasPageChanged(location)) {
            this.onPageChange(location);
            return;
        }

        const [x, y] = getBrowserCoordinatesFromLocation(location, this.pageEl);
        const browserLocation = createLocation(x, y);

        if (this.pendingPath) {
            this.pendingPath.addCoordinate(location, browserLocation);
        }
    }

    /**
     * Start a drawing stroke
     *
     * @public
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
            this.emit('locationassigned');
        }

        this.drawingFlag = DRAW_STATES.drawing;
        if (!this.pendingPath) {
            this.pendingPath = new DrawingPath();
        }

        if (this.dialog && this.dialog.isVisible()) {
            this.dialog.hide();
        }

        // Start drawing rendering
        this.lastAnimationRequestId = window.requestAnimationFrame(this.render);
    }

    /**
     * End a drawing stroke
     *
     * @public
     * @return {void}
     */
    handleStop() {
        // Stop the render loop and finish drawing
        window.cancelAnimationFrame(this.lastAnimationRequestId);
        this.lastAnimationRequestId = 0;

        this.drawingFlag = DRAW_STATES.idle;

        if (!this.pendingPath || this.pendingPath.isEmpty()) {
            return;
        }

        if (!this.dialog) {
            this.createDialog();
        }

        this.pathContainer.insert(this.pendingPath);
        this.updateBoundary(this.pendingPath);
        this.setBoundary();
        this.drawBoundary();
        this.emitAvailableActions();
        this.pendingPath = null;
    }

    /**
     * Determine if the drawing in progress if a drawing goes to a different page
     *
     * @public
     * @param {Object} location - The current event location information
     * @return {boolean} Whether or not the thread page has changed
     */
    hasPageChanged(location) {
        return location && !!this.location && !!this.location.page && this.location.page !== location.page;
    }

    /**
     * Saves a drawing annotation to the drawing annotation layer canvas.
     *
     * @public
     * @param {string} type - Type of annotation
     * @param {string} text - Text of annotation to save
     * @return {void}
     */
    saveAnnotation(type, text) {
        this.reset();

        // Only make save request to server if there exist paths to save
        if (this.pathContainer.isEmpty()) {
            return;
        }

        this.setBoundary();
        super.saveAnnotation(type, text);

        // Move the in-progress drawing to the concrete context
        this.createDialog();
        this.show();
    }

    /**
     * Display the document drawing thread. Will set the drawing context if the scale has changed since the last show.
     *
     * @public
     * @return {void}
     */
    show() {
        if (!this.annotatedElement || !this.location) {
            return;
        }

        // Get the annotation layer context to draw with
        const context = this.selectContext();
        if (this.dialog && this.dialog.isVisible()) {
            this.drawBoundary();
            this.dialog.show();
        }

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
     * Binds custom event listeners for the dialog.
     *
     * @protected
     * @return {void}
     */
    bindCustomListenersOnDialog() {
        if (!this.dialog) {
            return;
        }

        this.dialog.addListener('annotationcreate', () => this.emit('softcommit'));
        this.dialog.addListener('annotationdelete', () => this.emit('dialogdelete'));
    }

    /**
     * Creates the document drawing annotation dialog for the thread.
     *
     * @protected
     * @override
     * @return {void}
     */
    createDialog() {
        if (this.dialog) {
            this.dialog.destroy();
        }

        this.dialog = new DocDrawingDialog({
            annotatedElement: this.annotatedElement,
            container: this.container,
            annotations: this.annotations,
            locale: this.locale,
            location: this.location,
            canAnnotate: this.annotationService.canAnnotate,
            isMobile: this.isMobile,
            hasTouch: this.hasTouch
        });
        this.dialog.localized = this.localized;

        this.bindCustomListenersOnDialog();
    }

    /**
     * Prepare the pending drawing canvas if the scale factor has changed since the last render. Will do nothing if
     * the thread has not been assigned a page.
     *
     * @private
     * @return {void}
     */
    checkAndHandleScaleUpdate() {
        const scale = getScale(this.annotatedElement);
        if (this.lastScaleFactor === scale || (!this.location || !this.location.page)) {
            return;
        }

        // Set the scale and in-memory context for the pending thread
        this.lastScaleFactor = scale;
        this.pageEl = getPageEl(this.annotatedElement, this.location.page);
        this.drawingContext = getContext(this.pageEl, CLASS_ANNOTATION_LAYER_DRAW_IN_PROGRESS);

        const config = { scale };
        this.setContextStyles(config);
    }

    /**
     * End the current drawing and emit a page changed event
     *
     * @private
     * @param {Object} location - The location information indicating the page has changed.
     * @return {void}
     */
    onPageChange(location) {
        this.handleStop();
        this.emit('softcommit', { location });
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
        const reconstructedLocation = createLocation(documentLocation.x, documentLocation.y, this.location.dimensions);
        const [xNew, yNew] = getBrowserCoordinatesFromLocation(reconstructedLocation, this.pageEl);
        return createLocation(xNew, yNew);
    }

    /**
     * Choose the context to draw on. If the state of the thread is pending, select the in-progress context,
     * otherwise select the concrete context.
     *
     * @private
     * @return {void}
     */
    selectContext() {
        this.checkAndHandleScaleUpdate();

        if (this.state === STATES.pending) {
            return this.drawingContext;
        }

        const config = { scale: this.lastScaleFactor };
        this.concreteContext = getContext(this.pageEl, CLASS_ANNOTATION_LAYER_DRAW);

        this.setContextStyles(config, this.concreteContext);

        return this.concreteContext;
    }

    /**
     * Retrieve the rectangle upper left coordinate along with its width and height
     *
     * @private
     * @return {Array|null} The an array of length 4 with the first item being the x coordinate, the second item
     *                      being the y coordinate, and the 3rd/4th items respectively being the width and height
     */
    getBrowserRectangularBoundary() {
        if (!this.location || !this.location.dimensions || !this.pageEl) {
            return null;
        }

        const l1 = createLocation(this.minX, this.minY, this.location.dimensions);
        const l2 = createLocation(this.maxX, this.maxY, this.location.dimensions);
        const [x1, y1] = getBrowserCoordinatesFromLocation(l1, this.pageEl);
        const [x2, y2] = getBrowserCoordinatesFromLocation(l2, this.pageEl);
        const width = x2 - x1;
        const height = y2 - y1;

        return [x1, y1, width, height];
    }
}

export default DocDrawingThread;
