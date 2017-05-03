import autobind from 'autobind-decorator';
import Browser from '../../Browser';
import ImageBaseViewer from './ImageBaseViewer';
import { CLASS_INVISIBLE } from '../../constants';
import {
    ICON_FILE_IMAGE,
    ICON_FULLSCREEN_IN,
    ICON_FULLSCREEN_OUT,
    ICON_ROTATE_LEFT
} from '../../icons/icons';
import { openContentInsideIframe } from '../../util';
import './Image.scss';

const CSS_CLASS_ZOOMABLE = 'zoomable';
const CSS_CLASS_PANNABLE = 'pannable';
const CSS_CLASS_IMAGE = 'bp-image';
const IMAGE_PADDING = 15;
const IMAGE_ZOOM_SCALE = 1.2;

@autobind
class ImageViewer extends ImageBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = ICON_FILE_IMAGE;

        // Call super() to set up common layout
        super.setup();

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_IMAGE;
        this.imageEl = this.wrapperEl.appendChild(document.createElement('img'));

        // hides image tag until content is loaded
        this.imageEl.classList.add(CLASS_INVISIBLE);

        this.currentRotationAngle = 0;
    }

    /**
     * [destructor]
     * @return {void}
     */
    destroy() {
        // Destroy the annotator
        if (this.annotator && typeof this.annotator.destroy === 'function') {
            this.annotator.removeAllListeners();
            this.annotator.destroy();
        }

        // Remove listeners
        this.unbindDOMListeners();

        super.destroy();
    }

    /**
     * Loads an Image.
     *
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
        const { file, representation, viewer } = this.options;
        const isWatermarked = file && file.watermark_info && file.watermark_info.is_watermarked;

        if (content && !isWatermarked && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            document.createElement('img').src = this.createContentUrlWithAuthParams(template, viewer.ASSET);
        }
    }

    /**
     * Can the viewer currently be panned
     *
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
     * Rotate image anti-clockwise by 90 degrees
     *
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
     *
     * @private
     * @param {string} [type] - Type of zoom in|out|reset
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

            /* istanbul ignore next */
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
     * @private
     * @param {number} width - The scale width
     * @param {number} height - The scale height
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
     * @override
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.controls.add(__('rotate_left'), this.rotateLeft, 'bp-image-rotate-left-icon', ICON_ROTATE_LEFT);
        this.controls.add(__('enter_fullscreen'), this.toggleFullscreen, 'bp-enter-fullscreen-icon', ICON_FULLSCREEN_IN);
        this.controls.add(__('exit_fullscreen'), this.toggleFullscreen, 'bp-exit-fullscreen-icon', ICON_FULLSCREEN_OUT);
    }

    /**
     * Prints image using an an iframe.
     *
     * @return {void}
     */
    print() {
        this.printframe = openContentInsideIframe(this.imageEl.outerHTML);
        this.printframe.contentWindow.focus();

        this.printImage = this.printframe.contentDocument.querySelector('img');
        this.printImage.style.display = 'block';
        this.printImage.style.margin = '0 auto';

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
     * @protected
     * @return {void}
     */
    initAnnotations() {
        super.initAnnotations();

        // Disables controls during point annotation mode
        /* istanbul ignore next */
        this.annotator.addListener('pointmodeenter', () => {
            this.imageEl.classList.remove(CSS_CLASS_ZOOMABLE);
            this.imageEl.classList.remove(CSS_CLASS_PANNABLE);
            if (this.controls) {
                this.controls.disable();
            }
        });

        /* istanbul ignore next */
        this.annotator.addListener('pointmodeexit', () => {
            this.updateCursor();
            if (this.controls) {
                this.controls.enable();
            }
        });
    }

    /**
     * Determines if Image file has been rotated 90 or 270 degrees to the left
     *
     * @return {boolean} Whether image has been rotated -90 or -270 degrees
     */
    isRotated() {
        return Math.abs(this.currentRotationAngle) % 180 === 90;
    }

    /**
     * Determines the left and top padding for the image file on zoom and
     * re-positions the image accordingly
     *
     * @private
     * @return {void}
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
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        super.bindDOMListeners();

        this.imageEl.addEventListener('load', this.finishLoading);
        this.imageEl.addEventListener('error', this.errorHandler);

        if (Browser.isMobile()) {
            this.imageEl.addEventListener('orientationchange', this.handleOrientationChange);
        }
    }

    /**
     * Unbinds DOM listeners for image viewer.
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        super.unbindDOMListeners();

        if (this.imageEl) {
            this.imageEl.removeEventListener('load', this.finishLoading);
            this.imageEl.removeEventListener('error', this.errorHandler);
        }

        if (Browser.isMobile()) {
            this.imageEl.removeEventListener('orientationchange', this.handleOrientationChange);
        }

        document.removeEventListener('mousemove', this.pan);
        document.removeEventListener('mouseup', this.stopPanning);
    }

    /**
     * Handles mouse down event.
     *
     * @param {Event} event - The mousemove event
     * @return {void}
     */
    handleMouseUp(event) {
        // Ignore zoom/pan mouse events if in annotation mode
        if (this.annotator && this.annotator.isInPointMode()) {
            return;
        }

        super.handleMouseUp(event);
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
     * @inheritdoc
     */
    getPointModeClickHandler() {
        if (!this.isAnnotatable('point')) {
            return null;
        }

        return () => {
            this.imageEl.classList.remove(CSS_CLASS_ZOOMABLE);
            this.imageEl.classList.remove(CSS_CLASS_PANNABLE);
            this.emit('togglepointannotationmode');
        };
    }
}

export default ImageViewer;
