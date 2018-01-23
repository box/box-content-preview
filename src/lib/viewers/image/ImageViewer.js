import Browser from '../../Browser';
import ImageBaseViewer from './ImageBaseViewer';
import { ICON_FULLSCREEN_IN, ICON_FULLSCREEN_OUT, ICON_ROTATE_LEFT } from '../../icons/icons';
import { CLASS_INVISIBLE } from '../../constants';
import { openContentInsideIframe } from '../../util';
import './Image.scss';

const CSS_CLASS_IMAGE = 'bp-image';
const IMAGE_PADDING = 15;
const IMAGE_ZOOM_SCALE = 1.2;

class ImageViewer extends ImageBaseViewer {
    /** @inheritdoc */
    constructor(options) {
        super(options);

        this.rotateLeft = this.rotateLeft.bind(this);
        this.updatePannability = this.updatePannability.bind(this);

        if (this.isMobile) {
            this.handleOrientationChange = this.handleOrientationChange.bind(this);
        }
    }

    /**
     * @inheritdoc
     */
    setup() {
        // Call super() to set up common layout
        super.setup();

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.classList.add(CSS_CLASS_IMAGE);

        this.imageEl = this.wrapperEl.appendChild(document.createElement('img'));
        this.imageEl.setAttribute('data-page-number', 1);

        // hides image tag until content is loaded
        this.imageEl.classList.add(CLASS_INVISIBLE);

        this.currentRotationAngle = 0;
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
        return this.getRepStatus()
            .getPromise()
            .then(() => {
                this.imageEl.src = this.createContentUrlWithAuthParams(template, viewer.ASSET);
            })
            .catch(this.handleAssetError);
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
        if (!this.imageEl) {
            return;
        }

        if (this.isRotated()) {
            this.isPannable =
                this.imageEl.height > this.wrapperEl.clientWidth || this.imageEl.width > this.wrapperEl.clientHeight;
        } else {
            this.isPannable =
                this.imageEl.width > this.wrapperEl.clientWidth || this.imageEl.height > this.wrapperEl.clientHeight;
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
        this.currentRotationAngle = ((this.currentRotationAngle - 90) % 3600) % 360;
        this.imageEl.setAttribute('data-rotation-angle', this.currentRotationAngle);
        this.imageEl.style.transform = `rotate(${this.currentRotationAngle}deg)`;
        this.emit('rotate');

        // Re-adjust image position after rotation
        this.handleOrientationChange();
        this.setScale(this.imageEl.offsetwidth, this.imageEl.offsetHeight);
    }

    /**
     * Getter for modifyWidthInsteadOfHeight which will be used in zoom
     * and will determine if the width or the height needs to be modified
     *
     * @private
     * @param {number} [width] - The width in px
     * @param {number} [height] - The height in px
     * @return {boolean} true if the width will be modified instead of height
     */
    isLandscape(width, height) {
        // For multi page tifs, we always modify the width, since its essentially a DIV and not IMG tag.
        // For images that are wider than taller we use width. For images that are taller than wider, we use height.
        return width >= height;
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
        let height;
        let width;

        // From this point on, only 1 dimension will be modified. Either it will be width or it will be height.
        // The other one will remain null and eventually get cleared out. The image should automatically use the proper value
        // for the dimension that was cleared out.
        if (type === 'in' || type === 'out') {
            const imageCurrentDimensions = this.imageEl.getBoundingClientRect(); // Getting bounding rect does not ignore transforms / rotates
            ({ height, width } = imageCurrentDimensions);

            const modifyWidthInsteadOfHeight = this.isLandscape(width, height);
            if (modifyWidthInsteadOfHeight) {
                newWidth = type === 'in' ? width * IMAGE_ZOOM_SCALE : width / IMAGE_ZOOM_SCALE;
            } else {
                newHeight = type === 'in' ? height * IMAGE_ZOOM_SCALE : height / IMAGE_ZOOM_SCALE;
            }
        } else {
            // This can be triggered by initial render as well as reset
            // When it is an initial render or reset, take the original dimensions of the image
            // dont use getBoundingClientRect because it may be a reset, and it causes a reflow
            height = parseInt(this.imageEl.getAttribute('originalHeight'), 10);
            width = parseInt(this.imageEl.getAttribute('originalWidth'), 10);
            const modifyWidthInsteadOfHeight = this.isLandscape(width, height);

            const viewport = {
                width: this.wrapperEl.offsetWidth - 2 * IMAGE_PADDING,
                height: this.wrapperEl.offsetHeight - 2 * IMAGE_PADDING
            };
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
                const originalWidth = this.isRotated()
                    ? this.imageEl.getAttribute('originalHeight')
                    : this.imageEl.getAttribute('originalWidth');
                newWidth = Math.min(viewport.width, originalWidth);
            } else {
                const originalHeight = this.isRotated()
                    ? this.imageEl.getAttribute('originalWidth')
                    : this.imageEl.getAttribute('originalHeight');
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

        this.setScale(newWidth, newHeight);

        this.emit('zoom', {
            newScale: [newWidth || width, newHeight || height],
            canZoomIn: true,
            canZoomOut: true
        });
    }

    /**
     * Scales and repositions image with rotation. Only one argument
     * (either height or width) is required for the scale calculations.
     *
     * @private
     * @param {number} width - The scale width
     * @param {number} height - The scale height
     * @return {void}
     */
    setScale(width, height) {
        this.scale = width
            ? width / this.imageEl.getAttribute('originalWidth')
            : height / this.imageEl.getAttribute('originalHeight');
        this.rotationAngle = (this.currentRotationAngle % 3600) % 360;
        this.emit('scale', {
            scale: this.scale,
            rotationAngle: this.rotationAngle
        });
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
        this.controls.add(
            __('enter_fullscreen'),
            this.toggleFullscreen,
            'bp-enter-fullscreen-icon',
            ICON_FULLSCREEN_IN
        );
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
            largerWidth =
                wrapperDimensions.width > this.imageEl.clientHeight
                    ? wrapperDimensions.width
                    : this.imageEl.clientHeight;
            largerHeight =
                wrapperDimensions.height > this.imageEl.clientWidth
                    ? wrapperDimensions.height
                    : this.imageEl.clientWidth;
        } else {
            largerWidth =
                wrapperDimensions.width > this.imageEl.clientWidth ? wrapperDimensions.width : this.imageEl.clientWidth;
            largerHeight =
                wrapperDimensions.height > this.imageEl.clientHeight
                    ? wrapperDimensions.height
                    : this.imageEl.clientHeight;
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

        if (this.isMobile) {
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

        if (this.isMobile) {
            this.imageEl.removeEventListener('orientationchange', this.handleOrientationChange);
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

        this.scale = this.imageEl.clientWidth / this.imageEl.getAttribute('originalWidth');
        this.rotationAngle = (this.currentRotationAngle % 3600) % 360;
        this.emit('scale', {
            scale: this.scale,
            rotationAngle: this.rotationAngle
        });
    }
}

export default ImageViewer;
