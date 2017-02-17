import autobind from 'autobind-decorator';
import AnnotationService from '../../annotations/annotation-service';
import ImageAnnotator from '../../annotations/image/image-annotator';
import Browser from '../../browser';
import Base from './image-base';
import {
    ICON_ROTATE_LEFT,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT
} from '../../icons/icons';
import { CLASS_INVISIBLE } from '../../constants';
import { openContentInsideIframe } from '../../util';
import './image.scss';

const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';
const CSS_CLASS_PANNING = 'panning';
const CSS_CLASS_IMAGE = 'bp-image';
const IMAGE_PADDING = 15;
const IMAGE_ZOOM_SCALE = 1.2;

@autobind
class Image extends Base {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
        super.setup();

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_IMAGE;
        this.imageEl = this.wrapperEl.appendChild(document.createElement('img'));

        // hides image tag until content is loaded
        this.imageEl.classList.add(CLASS_INVISIBLE);

        this.initAnnotations();
        this.currentRotationAngle = 0;
    }

    /**
     * [destructor]
     * @return {void}
     */
    destroy() {
        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.removeAllListeners('pointmodeenter');
            this.annotator.destroy();
        }

        // Remove listeners
        this.unbindDOMListeners();

        super.destroy();
    }

    /**
     * Loads an Image.
     *
     * @public
     * @return {void}
     */
    load() {
        this.setup();
        super.load();

        const { representation, viewer } = this.options;
        const template = representation.content.url_template;

        this.bindDOMListeners();
        return this.getRepStatus().getPromise().then(() => {
            this.imageEl.src = this.createContentUrlWithAuthParams(template, viewer.ASSET);
        }).catch(this.handleAssetError);
    }

    /**
     * Prefetches assets for an image.
     *
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ content = true }) {
        const { representation, viewer } = this.options;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            document.createElement('img').src = this.createContentUrlWithAuthParams(template, viewer.ASSET);
        }
    }

    /**
     * Updates cursors on image content
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
     * Can the viewer currently be panned
     * @private
     * @return {void}
     */
    updatePannability() {
        if (!this.imageEl || (this.annotator && this.annotator.isInPointMode())) {
            return;
        }

        if (this.isRotated()) {
            this.isPannable = this.imageEl.height > this.wrapperEl.clientWidth || this.imageEl.width > this.wrapperEl.clientHeight;
        } else {
            this.isPannable = this.imageEl.width > this.wrapperEl.clientWidth || this.imageEl.height > this.wrapperEl.clientHeight;
        }

        this.didPan = false;
        this.updateCursor();
    }

    /**
     * Pan the image to the given x/y position
     * @param {Event} event - The mousemove event
     * @private
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
     * @private
     * @return {void}
     */
    stopPanning() {
        this.isPanning = false;
        document.removeEventListener('mousemove', this.pan);
        document.removeEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.remove(CSS_CLASS_PANNING);
        this.emit('panend');
    }

    /**
     * Start panning the image if the image is pannable
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
        this.isPanning = true;
        document.addEventListener('mousemove', this.pan);
        document.addEventListener('mouseup', this.stopPanning);
        this.imageEl.classList.add(CSS_CLASS_PANNING);
        this.emit('panstart');
    }

    /**
     * Rotate image anti-clockwise by 90 degrees
     * @public
     * @return {void}
     */
    rotateLeft() {
        this.currentRotationAngle = (this.currentRotationAngle - 90) % 3600 % 360;
        this.imageEl.setAttribute('data-rotation-angle', this.currentRotationAngle);
        this.imageEl.style.transform = `rotate(${this.currentRotationAngle}deg)`;
        this.emit('rotate');

        // Re-adjust image position after rotation
        this.handleOrientationChange();

        if (this.annotator) {
            this.scaleAnnotations(this.imageEl.offsetwidth, this.imageEl.offsetHeight);
        }
    }

    /**
     * Handles zoom
     * @param {string} [type] - Type of zoom in|out|reset
     * @private
     * @return {void}
     */
    zoom(type) {
        let newWidth;
        let newHeight;
        const imageCurrentDimensions = this.imageEl.getBoundingClientRect(); // Getting bounding rect does not ignore transforms / rotates
        const width = imageCurrentDimensions.width;
        const height = imageCurrentDimensions.height;
        const aspect = width / height;
        const viewport = {
            width: this.wrapperEl.clientWidth - IMAGE_PADDING,
            height: this.wrapperEl.clientHeight - IMAGE_PADDING
        };

        // For multi page tifs, we always modify the width, since its essentially a DIV and not IMG tag.
        // For images that are wider than taller we use width. For images that are taller than wider, we use height.
        const modifyWidthInsteadOfHeight = aspect >= 1;

        // From this point on, only 1 dimension will be modified. Either it will be width or it will be height.
        // The other one will remain null and eventually get cleared out. The image should automatically use the proper value
        // for the dimension that was cleared out.
        switch (type) {
            case 'in':
                if (modifyWidthInsteadOfHeight) {
                    newWidth = width * IMAGE_ZOOM_SCALE;
                } else {
                    newHeight = height * IMAGE_ZOOM_SCALE;
                }
                break;

            case 'out':
                if (modifyWidthInsteadOfHeight) {
                    newWidth = width / IMAGE_ZOOM_SCALE;
                } else {
                    newHeight = height / IMAGE_ZOOM_SCALE;
                }
                break;

            case 'reset':
                // Reset the dimensions to their original values by removing overrides
                // Doing so will make the browser render the image in its natural size
                // Then we can proceed by recalculating stuff from that natural size.
                this.imageEl.style.width = '';
                this.imageEl.style.height = '';

                this.adjustImageZoomPadding();

                // Image may still overflow the page, so do the default zoom by calling zoom again
                // This will go through the same workflow but end up in another case block.
                this.zoom();

                // Kill further execution
                return;

            default:
                // If the image is overflowing the viewport, figure out by how much
                // Then take that aspect that reduces the image the maximum (hence min ratio) to fit both width and height
                if (width > viewport.width || height > viewport.height) {
                    const ratio = Math.min(viewport.width / width, viewport.height / height);

                    if (modifyWidthInsteadOfHeight) {
                        newWidth = width * ratio;
                    } else {
                        newHeight = height * ratio;
                    }

                // If the image is smaller than the new viewport, zoom up to a
                // max of the original file size
                } else if (modifyWidthInsteadOfHeight) {
                    const originalWidth = this.isRotated() ? this.imageEl.naturalHeight : this.imageEl.naturalWidth;
                    newWidth = Math.min(viewport.width, originalWidth);
                } else {
                    const originalHeight = this.isRotated() ? this.imageEl.naturalWidth : this.imageEl.naturalHeight;
                    newHeight = Math.min(viewport.height, originalHeight);
                }
        }

        // If the image has been rotated, we need to swap the width and height
        // getBoundingClientRect always gives values based on how its rendered on the screen
        // But when setting width or height, transforms / rotates are ignored.
        if (this.isRotated()) {
            const temp = newWidth;
            newWidth = newHeight;
            newHeight = temp;
        }

        // Set the new dimensions. This ignores rotates, hence we need to swap the dimensions above.
        // Only one of the below will be set, while the other will get cleared out to let the browser
        // adjust it automatically based on the images aspect ratio.
        this.imageEl.style.width = newWidth ? `${newWidth}px` : '';
        this.imageEl.style.height = newHeight ? `${newHeight}px` : '';

        // Adjust image position after transformations
        this.adjustImageZoomPadding();

        // Give the browser some time to render before updating pannability
        setTimeout(this.updatePannability, 50);

        if (this.annotator) {
            this.scaleAnnotations(newWidth, newHeight);
        }

        this.emit('zoom', {
            newScale: [newWidth || width, newHeight || height],
            canZoomIn: true,
            canZoomOut: true
        });
    }

    /**
     * Scales annotations and repositions with rotation. Only one argument
     * (either height or width) is required for the scale calculations.
     *
     * @param {number} width
     * @param {number} height
     * @private
     * @return {void}
     */
    scaleAnnotations(width, height) {
        const scale = width ? (width / this.imageEl.naturalWidth) : (height / this.imageEl.naturalHeight);
        const rotationAngle = this.currentRotationAngle % 3600 % 360;
        this.annotator.setScale(scale);
        this.annotator.renderAnnotations(rotationAngle);
    }

    /**
     * Loads controls
     *
     * @private
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.controls.add(__('rotate_left'), this.rotateLeft, 'bp-image-rotate-left-icon', ICON_ROTATE_LEFT);
        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);

        // Show existing annotations after image is rendered
        if (!this.annotator || this.annotationsLoaded) {
            return;
        }
        this.annotator.showAnnotations();
        this.annotationsLoaded = true;
    }

    /**
     * Prints image using an an iframe.
     *
     * @return {void}
     */
    print() {
        this.printframe = openContentInsideIframe(this.imageEl.outerHTML);
        this.printframe.contentWindow.focus();

        if (Browser.getName() === 'Explorer' || Browser.getName() === 'Edge') {
            this.printframe.contentWindow.document.execCommand('print', false, null);
        } else {
            this.printframe.contentWindow.print();
        }

        this.emit('printsuccess');
    }


    /**
     * Initializes annotations.
     *
     * @return {void}
     * @private
     */
    initAnnotations() {
        // Ignore if viewer/file type is not annotatable
        if (!this.isAnnotatable()) {
            return;
        }

        // Users can currently only view annotations on mobile
        const canAnnotate = !!this.options.file.permissions.can_annotate && !Browser.isMobile();
        this.canAnnotate = canAnnotate;

        const fileVersionID = this.options.file.file_version.id;
        const annotationService = new AnnotationService({
            api: this.options.api,
            fileID: this.options.file.id,
            token: this.options.token,
            canAnnotate
        });

        // Construct and init annotator
        this.annotator = new ImageAnnotator({
            annotatedElement: this.wrapperEl,
            annotationService,
            fileVersionID,
            locale: this.options.location.locale
        });
        this.annotator.init(this);

        // Disables controls during point annotation mode
        this.annotator.addListener('pointmodeenter', () => {
            if (this.controls) {
                this.controls.disable();
            }
        });

        this.annotator.addListener('pointmodeexit', () => {
            if (this.controls) {
                this.controls.enable();
            }
        });
    }

    /**
     * Returns whether or not viewer is annotatable with the provided annotation
     * type.
     *
     * @param {string} type - Type of annotation
     * @return {boolean} Whether or not viewer is annotatable
     */
    isAnnotatable(type) {
        if (typeof type === 'string' && type !== 'point') {
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
     * Determines if Image file has been rotated 90 or 270 degrees to the left
     *
     * @return {Boolean} Whether image has been rotated -90 or -270 degrees
     */
    isRotated() {
        return Math.abs(this.currentRotationAngle) % 180 === 90;
    }

    /**
     * Determines the left and top padding for the image file on zoom and
     * re-positions the image accordingly
     *
     * @return {void}
     * @private
     */
    adjustImageZoomPadding() {
        let leftPadding = 0;
        let topPadding = 0;
        let largerWidth = 0;
        let largerHeight = 0;
        const wrapperDimensions = this.wrapperEl.getBoundingClientRect();
        const viewport = {
            width: this.wrapperEl.clientWidth - IMAGE_PADDING,
            height: this.wrapperEl.clientHeight - IMAGE_PADDING
        };

        if (this.isRotated()) {
            largerWidth = (wrapperDimensions.width > this.imageEl.clientHeight) ? wrapperDimensions.width : this.imageEl.clientHeight;
            largerHeight = (wrapperDimensions.height > this.imageEl.clientWidth) ? wrapperDimensions.height : this.imageEl.clientWidth;
        } else {
            largerWidth = (wrapperDimensions.width > this.imageEl.clientWidth) ? wrapperDimensions.width : this.imageEl.clientWidth;
            largerHeight = (wrapperDimensions.height > this.imageEl.clientHeight) ? wrapperDimensions.height : this.imageEl.clientHeight;
        }

        leftPadding = (largerWidth - this.imageEl.clientWidth) / 2;
        topPadding = (largerHeight - this.imageEl.clientHeight) / 2;

        this.imageEl.style.left = `${leftPadding}px`;
        this.imageEl.style.top = `${topPadding}px`;

        // Fix the scroll position of the image to be centered
        this.wrapperEl.scrollLeft = (this.wrapperEl.scrollWidth - viewport.width) / 2;
        this.wrapperEl.scrollTop = (this.wrapperEl.scrollHeight - viewport.height) / 2;
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Binds DOM listeners for image viewer.
     *
     * @return {void}
     * @protected
     */
    bindDOMListeners() {
        this.imageEl.addEventListener('load', this.loadHandler);
        this.imageEl.addEventListener('error', this.errorHandler);
        this.imageEl.addEventListener('mousedown', this.handleMouseDown);
        this.imageEl.addEventListener('mouseup', this.handleMouseUp);
        this.imageEl.addEventListener('dragstart', this.handleDragStart);

        if (Browser.isMobile()) {
            this.imageEl.addEventListener('orientationchange', this.handleOrientationChange);
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
     * Unbinds DOM listeners for image viewer.
     *
     * @return {void}
     * @protected
     */
    unbindDOMListeners() {
        if (this.imageEl) {
            this.imageEl.removeEventListener('load', this.loadHandler);
            this.imageEl.removeEventListener('error', this.errorHandler);
            this.imageEl.removeEventListener('mousedown', this.handleMouseDown);
            this.imageEl.removeEventListener('mouseup', this.handleMouseUp);
            this.imageEl.removeEventListener('dragstart', this.handleDragStart);

            if (Browser.isMobile()) {
                this.imageEl.removeEventListener('orientationchange', this.handleOrientationChange);

                if (Browser.isIOS()) {
                    this.imageEl.removeEventListener('gesturestart', this.mobileZoomStartHandler);
                    this.imageEl.removeEventListener('gestureend', this.mobileZoomEndHandler);
                } else {
                    this.imageEl.removeEventListener('touchstart', this.mobileZoomStartHandler);
                    this.imageEl.removeEventListener('touchmove', this.mobileZoomChangeHandler);
                    this.imageEl.removeEventListener('touchend', this.mobileZoomEndHandler);
                }
            }
        }

        document.removeEventListener('mousemove', this.pan);
        document.removeEventListener('mouseup', this.stopPanning);
    }

    /**
     * Handles the loading of an image once the 'load' event has been fired
     *
     * @return {void}
     * @private
     */
    loadHandler = () => {
        if (this.destroyed) {
            return;
        }

        this.loaded = true;
        this.emit('load');
        this.zoom();
        this.imageEl.classList.remove(CLASS_INVISIBLE);

        this.loadUI();
    }

    /**
     * Handles image element loading errors.
     *
     * @return {void}
     * @private
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
     * Handles mouse down event.
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseDown(event) {
        this.didPan = false;

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof event.button !== 'number' || event.button < 2) && !event.ctrlKey && !event.metaKey) {
            this.startPanning(event.clientX, event.clientY);
            event.preventDefault();
        }
    }

    /**
     * Handles mouse down event.
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseUp(event) {
        // Ignore zoom/pan mouse events if in annotation mode
        if (this.annotator && this.annotator.isInPointMode()) {
            return;
        }

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof event.button !== 'number' || event.button < 2) && !event.ctrlKey && !event.metaKey) {
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
    * Adjust padding on image rotation/zoom of images when the view port
    * orientation changes from landscape to portrait and vice versa. Especially
    * important for mobile devices because rotating the device doesn't triggers
    * rotateLeft()
    *
    * @return {void}
    */
    handleOrientationChange() {
        this.adjustImageZoomPadding();

        if (this.annotator) {
            const scale = (this.imageEl.clientWidth / this.imageEl.naturalWidth);
            const rotationAngle = this.currentRotationAngle % 3600 % 360;
            this.annotator.setScale(scale);
            this.annotator.renderAnnotations(rotationAngle);
        }
    }

    /**
     * Prevents drag events on the image
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleDragStart(event) {
        event.preventDefault();
        event.stopPropogation();
    }

    /**
     * Returns click handler for toggling point annotation mode.
     *
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
}

export default Image;
