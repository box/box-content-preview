import autobind from 'autobind-decorator';
import AnnotationService from '../../annotations/AnnotationService';
import Controls from '../../Controls';
import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import {
    ICON_ZOOM_IN,
    ICON_ZOOM_OUT
} from '../../icons/icons';

import { CLASS_INVISIBLE, PERMISSION_ANNOTATE } from '../../constants';
import { checkPermission } from '../../file';

const CSS_CLASS_PANNING = 'panning';
const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';

@autobind
class ImageBaseViewer extends BaseViewer {

    /**
     * [constructor]
     *
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        this.imageEl = undefined;
        this.annotationTypes = [];
    }

    /**
     * @inheritdoc
     */
    setup() {
        super.setup();

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
    }

    /**
     * Loads the image type.
     *
     * @return {void}
     */
    load() {
        super.load();
        this.initAnnotations();
        this.bindDOMListeners();
    }

    /**
     * [destructor]
     * @return {void}
     */
    destroy() {
        this.unbindDOMListeners();
        // Destroy the controls
        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        // Remove listeners
        if (this.imageEl) {
            this.imageEl.removeEventListener('mouseup', this.handleMouseUp);
        }

        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.removeAllListeners('pointmodeenter');
            this.annotator.destroy();
        }

        super.destroy();
    }

    /**
     * Finishes loading the images.
     *
     * @return {void}
     */
    finishLoading() {
        if (this.isDestroyed()) {
            return;
        }

        this.zoom();
        this.loadUI();
        this.showAnnotations();

        this.imageEl.classList.remove(CLASS_INVISIBLE);
        this.loaded = true;
        this.emit('load');
    }

    /**
     * Zooms in.
     *
     * @return {void}
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Zooms out.
     *
     * @return {void}
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Resize image by calling zoom.
     *
     * @return {void}
     */
    resize() {
        this.zoom();
        super.resize();
    }

    /**
     * Start panning the image if the image is pannable
     *
     * @param {number} x - The initial x position of the mouse
     * @param {number} y - The initial y position of the mouse
     * @return {void}
     */
    startPanning(x, y) {
        if (!this.isPannable) {
            return;
        }

        this.panStartX = x;
        this.panStartY = y;
        this.panStartScrollLeft = this.wrapperEl.scrollLeft;
        this.panStartScrollTop = this.wrapperEl.scrollTop;

        document.addEventListener('mousemove', this.pan);
        document.addEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.add(CSS_CLASS_PANNING);

        this.isPanning = true;
        this.emit('panstart');
    }

    /**
     * Pan the image to the given x/y position
     *
     * @private
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    pan(event) {
        if (!this.isPanning) {
            return;
        }
        const offsetX = event.clientX - this.panStartX;
        const offsetY = event.clientY - this.panStartY;

        this.wrapperEl.scrollLeft = this.panStartScrollLeft - offsetX;
        this.wrapperEl.scrollTop = this.panStartScrollTop - offsetY;
        this.didPan = true;
        this.emit('pan');
    }

    /**
     * Stop panning the image
     *
     * @private
     * @return {void}
     */
    stopPanning() {
        document.removeEventListener('mousemove', this.pan);
        document.removeEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.remove(CSS_CLASS_PANNING);
        this.isPanning = false;
        this.emit('panend');
    }

    /**
     * Updates cursors on image content
     *
     * @private
     * @return {void}
     */
    updateCursor() {
        if (this.isPannable) {
            this.isZoomable = false;
            this.imageEl.classList.add(CSS_CLASS_PANNABLE);
            this.imageEl.classList.remove(CSS_CLASS_ZOOMABLE);
        } else {
            this.isZoomable = true;
            this.imageEl.classList.remove(CSS_CLASS_PANNABLE);
            this.imageEl.classList.add(CSS_CLASS_ZOOMABLE);
        }
    }

    /**
     * Adds UI controls
     *
     * @private
     * @return {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(__('zoom_out'), this.zoomOut, 'bp-image-zoom-out-icon', ICON_ZOOM_OUT);
        this.controls.add(__('zoom_in'), this.zoomIn, 'bp-image-zoom-in-icon', ICON_ZOOM_IN);
    }

    /**
     * Initializes annotations.
     *
     * @private
     * @return {void}
     */
    initAnnotations() {
        // Ignore if viewer/file type is not annotatable
        if (!this.isAnnotatable()) {
            return;
        }

        // Users can currently only view annotations on mobile
        const { apiHost, file, token } = this.options;
        const canAnnotate = checkPermission(file, PERMISSION_ANNOTATE) && !Browser.isMobile();
        this.canAnnotate = canAnnotate;

        const fileVersionID = file.file_version.id;
        const annotationService = new AnnotationService({
            apiHost,
            fileId: file.id,
            token,
            canAnnotate
        });

        this.createAnnotator(fileVersionID, annotationService);
    }

    /**
     * Adds annotations to the preview.
     *
     * @protected
     * @return {void}
     */
    showAnnotations() {
        // Show existing annotations after image is rendered
        if (!this.annotator || this.annotationsLoaded) {
            return;
        }

        this.annotator.showAnnotations();
        this.annotationsLoaded = true;
    }

    /**
     * Returns whether or not viewer is annotatable with the provided annotation
     * type.
     *
     * @protected
     * @param {string} type - Type of annotation
     * @return {boolean} Whether or not viewer is annotatable
     */
    isAnnotatable(type) {
        const typeIsAllowed = this.annotationTypes.some((allowed) => {
            return allowed === type;
        });

        if (typeof type === 'string' && !typeIsAllowed) {
            return false;
        }

        // Respect viewer-specific annotation option if it is set
        const viewerAnnotations = this.getViewerOption('annotations');
        if (typeof viewerAnnotations === 'boolean') {
            return viewerAnnotations;
        }

        // Otherwise, use global preview annotation option
        return this.options.showAnnotations;
    }

    /**
     * Returns click handler for toggling point annotation mode.
     *
     * @private
     * @return {Function|null} Click handler
     */
    getPointModeClickHandler() {
        if (!this.isAnnotatable('point')) {
            return null;
        }

        return (event = {}) => {
            this.imageEl.classList.remove(CSS_CLASS_ZOOMABLE);
            this.imageEl.classList.remove(CSS_CLASS_PANNABLE);
            this.annotator.togglePointModeHandler(event);
        };
    }

    /**
     * Binds DOM listeners for image viewers.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        this.imageEl.addEventListener('mousedown', this.handleMouseDown);
        this.imageEl.addEventListener('mouseup', this.handleMouseUp);
        this.imageEl.addEventListener('dragstart', this.cancelDragEvent);

        if (Browser.isMobile()) {
            if (Browser.isIOS()) {
                this.imageEl.addEventListener('gesturestart', this.mobileZoomStartHandler);
                this.imageEl.addEventListener('gestureend', this.mobileZoomEndHandler);
            } else {
                this.imageEl.addEventListener('touchstart', this.mobileZoomStartHandler);
                this.imageEl.addEventListener('touchmove', this.mobileZoomChangeHandler);
                this.imageEl.addEventListener('touchend', this.mobileZoomEndHandler);
            }
        }
    }

    /**
     * Unbinds DOM listeners for image viewers.
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        document.removeEventListener('mousemove', this.pan);
        document.removeEventListener('mouseup', this.stopPanning);

        if (!this.imageEl) {
            return;
        }

        this.imageEl.removeEventListener('mousedown', this.handleMouseDown);
        this.imageEl.removeEventListener('mouseup', this.handleMouseUp);
        this.imageEl.removeEventListener('dragstart', this.cancelDragEvent);

        this.imageEl.removeEventListener('gesturestart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('gestureend', this.mobileZoomEndHandler);
        this.imageEl.removeEventListener('touchstart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('touchmove', this.mobileZoomChangeHandler);
        this.imageEl.removeEventListener('touchend', this.mobileZoomEndHandler);
    }

    /**
     * Handles image element loading errors.
     *
     * @private
     * @return {void}
     */
    errorHandler = (err) => {
        /* eslint-disable no-console */
        console.error(err);
        /* eslint-enable no-console */

        // Display a generic error message but log the real one
        const error = err;
        if (err instanceof Error) {
            error.displayMessage = __('error_refresh');
        }
        this.emit('error', error);
    }

    /**
     * Handles keyboard events for media
     *
     * @private
     * @param {string} key - Keydown key
     * @return {boolean} Consumed or not
     */
    onKeydown(key) {
        // Return false when media controls are not ready or are focused
        if (!this.controls) {
            return false;
        }

        if (key === 'Shift++') {
            this.zoomIn();
            return true;
        } else if (key === 'Shift+_') {
            this.zoomOut();
            return true;
        }

        return false;
    }

    /**
     * Handles mouse down event.
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseDown(event) {
        // Ignore zoom/pan mouse events if in annotation mode
        if (this.annotator && this.annotator.isInPointMode()) {
            return;
        }

        const { button, ctrlKey, metaKey, clientX, clientY } = event;
        this.didPan = false;

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof button !== 'number' || button < 2) && !ctrlKey && !metaKey) {
            this.startPanning(clientX, clientY);
            event.preventDefault();
        }
    }

    /**
     * Handles mouse up event.
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseUp(event) {
        // Ignore zoom/pan mouse events if in annotation mode
        if (this.annotator && this.annotator.isInPointMode()) {
            return;
        }

        const { button, ctrlKey, metaKey } = event;

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof button !== 'number' || button < 2) && !ctrlKey && !metaKey) {
            if (!this.isPannable && this.isZoomable) {
                // If the mouse up was not due to panning, and the image is zoomable, then zoom in.
                this.zoom('in');
            } else if (!this.didPan) {
                // If the mouse up was not due to ending of panning, then assume it was a regular
                // click mouse up. In that case reset the image size, mimicking single-click-unzoom.
                this.zoom('reset');
            }
            event.preventDefault();
        }
    }

    /**
     * Prevents drag events on the image
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    cancelDragEvent(event) {
        event.preventDefault();
        event.stopPropagation();
    }


    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Handles zoom
     * @param {string} [type] - Type of zoom in|out|reset
     * @private
     * @return {void}
     */
    /* istanbul ignore next */
    zoom(/* type */) {}

    /**
     * Must be implemented to create annotators.
     *
     * @param {string} fileVersionID The file version id of the file to annotate.
     * @param {AnnotationService} annotationService An instance of the annotation service.
     */
    /* istanbul ignore next */
    createAnnotator(/* fileVersionID, annotationService */) {}


    /** Scales annotations and repositions. Only one argument
     * (either height or width) is required for the scale calculations.
     *
     * @private
     * @param {number} width - The scale width
     * @param {number} height - The scale height
     * @return {void}
     */
    /* istanbul ignore next */
    scaleAnnotations(/* width, height */) {}
}

export default ImageBaseViewer;
