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
     * Load controls
     *
     * @protected
     * @return {void}
     */
    loadUI() {
        this.controls = new ControlsRoot({
            containerEl: this.containerEl,
            experiences: this.options.experiences,
            fileId: this.options.file.id,
        });
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

        this.imageEl.removeEventListener('gesturestart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('gestureend', this.mobileZoomEndHandler);
        this.imageEl.removeEventListener('touchstart', this.mobileZoomStartHandler);
        this.imageEl.removeEventListener('touchmove', this.mobileZoomChangeHandler);
        this.imageEl.removeEventListener('touchend', this.mobileZoomEndHandler);
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
