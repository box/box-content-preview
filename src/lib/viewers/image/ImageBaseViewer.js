import BaseViewer from '../BaseViewer';
import Browser from '../../Browser';
import ControlsRoot from '../controls/controls-root';
import PreviewError from '../../PreviewError';
import { BROWSERS, CLASS_INVISIBLE } from '../../constants';
import { ERROR_CODE, VIEWER_EVENT } from '../../events';
import { openContentInsideIframe } from '../../util';

const CSS_CLASS_PANNING = 'panning';
const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';
const MIN_PINCH_SCALE_DELTA = 0.01;
const WHEEL_ZOOM_MAX_SCALE = 100;
const WHEEL_ZOOM_MIN_SCALE = 0.1;

class ImageBaseViewer extends BaseViewer {
    /** @inheritdoc */
    constructor(options) {
        super(options);

        if (options.api) {
            this.api = options.api;
        }

        // Explicit event handler bindings
        this.pan = this.pan.bind(this);
        this.stopPanning = this.stopPanning.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.cancelDragEvent = this.cancelDragEvent.bind(this);
        this.finishLoading = this.finishLoading.bind(this);
        this.isDiscoverabilityEnabled = this.isDiscoverabilityEnabled.bind(this);

        // Trackpad pinch-to-zoom support
        this.wheelZoomHandler = this.wheelZoomHandler.bind(this);
        if (this.isMobile) {
            if (Browser.isIOS()) {
                this.mobileZoomStartHandler = this.mobileZoomStartHandler.bind(this);
                this.mobileZoomEndHandler = this.mobileZoomEndHandler.bind(this);
            } else {
                this.mobileZoomStartHandler = this.mobileZoomStartHandler.bind(this);
                this.mobileZoomChangeHandler = this.mobileZoomChangeHandler.bind(this);
                this.mobileZoomEndHandler = this.mobileZoomEndHandler.bind(this);
            }
        }
    }

    /**
     * [destructor]
     *
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

        const loadOriginalDimensions = this.setOriginalImageSize(this.imageEl);
        loadOriginalDimensions.then(() => {
            this.zoom();
            this.initialWidth = this.imageEl.offsetWidth;
            this.initialRect = this.getInitialImageRect();
            this.loadUI();

            this.imageEl.classList.remove(CLASS_INVISIBLE);
            this.loaded = true;
            this.emit(VIEWER_EVENT.load);
        });
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
        this.initialWidth = this.imageEl.offsetWidth;
        this.initialRect = this.getInitialImageRect();
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
     * Determines whether discoverability is enabled
     *
     * @private
     * @return {boolean} value of whether discoverability is enabled for given type
     */
    isDiscoverabilityEnabled() {
        const { enableAnnotationsImageDiscoverability, experiences = {} } = this.options;
        const canShow = Object.values(experiences).some(experience => experience.canShow);

        return !canShow && !!enableAnnotationsImageDiscoverability;
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
     * Load controls
     *
     * @protected
     * @return {void}
     */
    loadUI() {
        this.controls = new ControlsRoot({ containerEl: this.containerEl, fileId: this.options.file.id });
    }

    /**
     * Sets the original image width and height on the img element. Can be removed when
     * naturalHeight and naturalWidth attributes work correctly in IE 11.
     *
     * @protected
     * @param {HTMLElement} imageEl - The image to set the original size attributes on
     * @return {Promise} A promise that is resolved if the original image dimensions were set.
     */
    setOriginalImageSize(imageEl) {
        const promise = new Promise(resolve => {
            // Do not bother loading a new image when the natural size attributes exist
            if (imageEl.naturalWidth && imageEl.naturalHeight) {
                imageEl.setAttribute('originalWidth', imageEl.naturalWidth);
                imageEl.setAttribute('originalHeight', imageEl.naturalHeight);
                resolve();
            } else {
                // Case when natural dimensions are not assigned, such as with SVGs
                // By default, assigned width and height in Chrome/Safari/Firefox will be 300x150.
                // IE11 workaround. Dimensions only displayed if the image is attached to the document.
                this.api
                    .get(imageEl.src, { type: 'text' })
                    .then(imageAsText => {
                        try {
                            const parser = new DOMParser();
                            const svgEl = parser.parseFromString(imageAsText, 'image/svg+xml'); // Can throw in IE11
                            const viewBox = svgEl.documentElement.getAttribute('viewBox');
                            const [, , w, h] = viewBox.split(' ');
                            const aspectRatio = h ? w / h : w;
                            imageEl.setAttribute('originalWidth', Math.round(aspectRatio * 150));
                            imageEl.setAttribute('originalHeight', 150);
                        } catch (e) {
                            // Assume 300x150 that chrome does by default
                            imageEl.setAttribute('originalWidth', 300);
                            imageEl.setAttribute('originalHeight', 150);
                        } finally {
                            resolve();
                        }
                    })
                    .catch(resolve);
            }
        });

        return promise;
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

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
        // Trackpad pinch-to-zoom
        this.wrapperEl.addEventListener('wheel', this.wheelZoomHandler, { passive: false });

        if (this.isMobile) {
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
        if (this.wrapperEl) {
            this.wrapperEl.removeEventListener('wheel', this.wheelZoomHandler);
        }

        this.imageEl.removeEventListener('gesturestart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('gestureend', this.mobileZoomEndHandler);
        this.imageEl.removeEventListener('touchstart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('touchmove', this.mobileZoomChangeHandler);
        this.imageEl.removeEventListener('touchend', this.mobileZoomEndHandler);
    }

    /**
     * Returns the image's bounding rect relative to the wrapper.
     * Used to capture the initial position for zoom-out clamping.
     *
     * @protected
     * @return {Object} Rect with left, top, right, bottom relative to wrapper
     */
    getInitialImageRect() {
        if (!this.imageEl || !this.wrapperEl) {
            return null;
        }
        const imageRect = this.imageEl.getBoundingClientRect();
        const wrapperRect = this.wrapperEl.getBoundingClientRect();
        return {
            left: imageRect.left - wrapperRect.left,
            top: imageRect.top - wrapperRect.top,
            right: imageRect.right - wrapperRect.left,
            bottom: imageRect.bottom - wrapperRect.top,
        };
    }

    /**
     * Handles trackpad pinch-to-zoom via wheel events with ctrlKey.
     * On Mac trackpads, pinch gestures fire wheel events with ctrlKey set to true.
     *
     * @protected
     * @param {WheelEvent} event - wheel event object
     * @return {void}
     */
    wheelZoomHandler(event) {
        if (!event.ctrlKey || !this.imageEl || !this.wrapperEl || !this.featureEnabled('pinchToZoom.enabled')) {
            this.isPinching = false;
            return;
        }

        // Only start a pinch session if the gesture begins over the image.
        // Once active, continue even if the cursor drifts outside the image.
        if (!this.isPinching) {
            const imageRect = this.imageEl.getBoundingClientRect();
            const isOverImage =
                event.clientX >= imageRect.left &&
                event.clientX <= imageRect.right &&
                event.clientY >= imageRect.top &&
                event.clientY <= imageRect.bottom;
            if (!isOverImage) {
                return;
            }
            this.isPinching = true;
        }

        // Reset pinch session after a brief idle (no explicit "pinch end" event exists)
        clearTimeout(this.pinchIdleTimer);
        this.pinchIdleTimer = setTimeout(() => {
            this.isPinching = false;
        }, 200);

        event.preventDefault();

        const currentWidth = this.imageEl.offsetWidth;
        if (!currentWidth) {
            return;
        }

        const baseWidth = parseInt(this.imageEl.getAttribute('originalWidth'), 10) || currentWidth;
        const minWidth = this.initialWidth || baseWidth * WHEEL_ZOOM_MIN_SCALE;
        const maxWidth = baseWidth * WHEEL_ZOOM_MAX_SCALE;

        const delta = -event.deltaY * MIN_PINCH_SCALE_DELTA;
        const newWidth = Math.min(maxWidth, Math.max(minWidth, currentWidth * (1 + delta)));
        const ratio = newWidth / currentWidth;

        // Record where the cursor sits within the image (in image-local coords).
        // This is what we'll keep anchored to the cursor through the zoom.
        const oldImageRect = this.imageEl.getBoundingClientRect();
        const pointInImageX = event.clientX - oldImageRect.left;
        const pointInImageY = event.clientY - oldImageRect.top;

        // Resize the image. This grows/shrinks from the top-left corner, so the exact
        // pixel that was under the cursor is now at a different screen position.
        this.imageEl.style.width = `${newWidth}px`;
        this.imageEl.style.height = '';

        // Compute how far the image pixel drifted from the cursor after resizing.
        const newImageRect = this.imageEl.getBoundingClientRect();
        const wrapperRect = this.wrapperEl.getBoundingClientRect();
        let dx = newImageRect.left + pointInImageX * ratio - event.clientX;
        let dy = newImageRect.top + pointInImageY * ratio - event.clientY;

        // When zooming out, clamp so edges don't retreat past the initial rect.
        // This guides the image back to its initial position as it shrinks.
        if (newWidth < currentWidth && this.initialRect) {
            // Where the image would end up after full cursor-anchor correction
            let targetLeft = newImageRect.left - wrapperRect.left - dx;
            let targetTop = newImageRect.top - wrapperRect.top - dy;
            const targetRight = targetLeft + newImageRect.width;
            const targetBottom = targetTop + newImageRect.height;

            // Clamp: don't let an edge retreat past its initial boundary
            if (targetLeft > this.initialRect.left) {
                targetLeft = this.initialRect.left;
            } else if (targetRight < this.initialRect.right) {
                targetLeft = this.initialRect.right - newImageRect.width;
            }

            if (targetTop > this.initialRect.top) {
                targetTop = this.initialRect.top;
            } else if (targetBottom < this.initialRect.bottom) {
                targetTop = this.initialRect.bottom - newImageRect.height;
            }

            dx = newImageRect.left - wrapperRect.left - targetLeft;
            dy = newImageRect.top - wrapperRect.top - targetTop;
        }

        // Apply correction: scroll first, then CSS offset for any remainder.
        const prevScrollLeft = this.wrapperEl.scrollLeft;
        const prevScrollTop = this.wrapperEl.scrollTop;
        this.wrapperEl.scrollLeft += dx;
        this.wrapperEl.scrollTop += dy;

        const remainderX = dx - (this.wrapperEl.scrollLeft - prevScrollLeft);
        const remainderY = dy - (this.wrapperEl.scrollTop - prevScrollTop);
        if (remainderX !== 0 || remainderY !== 0) {
            const currentLeft = parseFloat(this.imageEl.style.left) || 0;
            const currentTop = parseFloat(this.imageEl.style.top) || 0;
            this.imageEl.style.left = `${currentLeft - remainderX}px`;
            this.imageEl.style.top = `${currentTop - remainderY}px`;
        }

        // When we've reached the minimum width, snap to the correct centered position
        // via adjustImageZoomPadding. This handles rotation where the initial rect is stale.
        if (newWidth <= minWidth && typeof this.adjustImageZoomPadding === 'function') {
            this.adjustImageZoomPadding();
        }

        // setScale emits 'scale', which triggers annotation re-render. Call it AFTER
        // final image position is set so the overlay reads correct offsetLeft/offsetTop.
        if (typeof this.setScale === 'function') {
            this.setScale(newWidth, null);
        }
        this.updatePannability();

        this.emit('zoom', {
            newScale: [newWidth, this.imageEl.offsetHeight],
            canZoomIn: newWidth < maxWidth,
            canZoomOut: newWidth > minWidth,
        });
    }

    /**
     * Handles a content download error
     *
     * @param {Error} err - Load error
     * @param {string} imgUrl - Image src URL
     * @return {void}
     */
    handleDownloadError(err, imgUrl) {
        // eslint-disable-next-line
        console.error(err);

        // Display a generic error message but log the real one
        const error = new PreviewError(ERROR_CODE.CONTENT_DOWNLOAD, __('error_refresh'), {}, err.message);
        super.handleDownloadError(error, imgUrl);
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
        }
        if (key === 'Shift+_') {
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
        const { button, ctrlKey, metaKey, clientX, clientY } = event;
        this.didPan = false;

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof button !== 'number' || button < 2) && !ctrlKey && !metaKey) {
            this.startPanning(clientX, clientY);
        }
    }

    /**
     * Handles mouse up event.
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseUp(event) {
        const { button, ctrlKey, metaKey } = event;

        // If this is not a left click, then ignore
        // If this is a CTRL or CMD click, then ignore
        if ((typeof button !== 'number' || button < 2) && !ctrlKey && !metaKey) {
            if (!this.isPannable && this.isZoomable) {
                // If the mouse up was not due to panning, and the image is zoomable, then zoom in.
                this.zoom('in');
                this.emitMetric('zoom', 'inClick');
            } else if (!this.didPan) {
                // If the mouse up was not due to ending of panning, then assume it was a regular
                // click mouse up. In that case reset the image size, mimicking single-click-unzoom.
                this.zoom('reset');
                this.emitMetric('zoom', 'resetClick');
            }
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

    /**
     * Disables viewer controls
     *
     * @override
     * @return {void}
     */
    disableViewerControls() {
        super.disableViewerControls();
        this.unbindDOMListeners();

        // Ensure zoom/pan classes are removed when controls are disabled
        this.imageEl.classList.remove(CSS_CLASS_ZOOMABLE);
        this.imageEl.classList.remove(CSS_CLASS_PANNABLE);
    }

    /**
     * Enables viewer controls
     *
     * @override
     * @return {void}
     */
    enableViewerControls() {
        super.enableViewerControls();
        this.bindDOMListeners();

        if (!this.isMobile) {
            this.updateCursor();
        }
    }

    /**
     * Prints image using an an iframe.
     *
     * @return {void}
     */
    print() {
        const browserName = Browser.getName();

        /**
         * Called async to ensure resource is loaded for print preview. Then removes listener to prevent
         * multiple handlers.
         *
         * @return {void}
         */
        const defaultPrintHandler = () => {
            if (browserName === BROWSERS.INTERNET_EXPLORER || browserName === BROWSERS.EDGE) {
                this.printframe.contentWindow.document.execCommand('print', false, null);
            } else {
                this.printframe.contentWindow.print();
            }

            this.printframe.removeEventListener('load', defaultPrintHandler);
            this.emit(VIEWER_EVENT.printSuccess);
        };

        this.printframe = openContentInsideIframe(this.imageEl.outerHTML);
        this.printImages = this.printframe.contentDocument.querySelectorAll('img');

        for (let i = 0; i < this.printImages.length; i += 1) {
            this.printImages[i].setAttribute('style', 'display: block; margin: 0 auto; width: 100%');
        }

        this.printframe.contentWindow.focus();

        this.printframe.addEventListener(VIEWER_EVENT.load, defaultPrintHandler);
    }

    //--------------------------------------------------------------------------
    // Abstract
    //--------------------------------------------------------------------------

    /**
     * Must be implemented to zoom image.
     *
     * @return {void}
     */
    zoom() {}
}

export default ImageBaseViewer;
