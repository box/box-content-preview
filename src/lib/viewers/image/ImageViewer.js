import React from 'react';
import getProp from 'lodash/get';
import AnnotationControlsFSM, { AnnotationInput, AnnotationMode, AnnotationState } from '../../AnnotationControlsFSM';
import ImageBaseViewer from './ImageBaseViewer';
import ImageControls from './ImageControls';
import {
    ANNOTATOR_EVENT,
    CLASS_ANNOTATIONS_IMAGE_FTUX_CURSOR_SEEN,
    CLASS_INVISIBLE,
    DISCOVERABILITY_ATTRIBUTE,
    IMAGE_FTUX_CURSOR_SEEN_KEY,
} from '../../constants';
import './Image.scss';

const CSS_CLASS_IMAGE = 'bp-image';
const IMAGE_PADDING = 15;
const IMAGE_ZOOM_SCALE = 1.2;

class ImageViewer extends ImageBaseViewer {
    /** @inheritdoc */
    constructor(options) {
        super(options);
        this.api = options.api;

        // Bind context for callbacks
        this.applyCursorFtux = this.applyCursorFtux.bind(this);
        this.getViewportDimensions = this.getViewportDimensions.bind(this);
        this.handleAnnotationColorChange = this.handleAnnotationColorChange.bind(this);
        this.handleAnnotationControlsClick = this.handleAnnotationControlsClick.bind(this);
        this.handleAnnotationCreateEvent = this.handleAnnotationCreateEvent.bind(this);
        this.handleAssetAndRepLoad = this.handleAssetAndRepLoad.bind(this);
        this.handleImageDownloadError = this.handleImageDownloadError.bind(this);
        this.handleZoomEvent = this.handleZoomEvent.bind(this);
        this.rotateLeft = this.rotateLeft.bind(this);
        this.updateDiscoverabilityResinTag = this.updateDiscoverabilityResinTag.bind(this);
        this.updateExperiences = this.updateExperiences(this);
        this.updatePannability = this.updatePannability.bind(this);

        this.annotationControlsFSM = new AnnotationControlsFSM(
            this.options.enableAnnotationsImageDiscoverability ? AnnotationState.REGION_TEMP : AnnotationState.NONE,
        );

        this.annotationControlsFSM.subscribe(this.applyCursorFtux);
        this.annotationControlsFSM.subscribe(this.updateDiscoverabilityResinTag);

        if (this.isMobile) {
            this.handleOrientationChange = this.handleOrientationChange.bind(this);
        }
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        if (this.options.enableAnnotationsImageDiscoverability) {
            this.removeListener('zoom', this.handleZoomEvent);
        }

        super.destroy();
    }

    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

        this.wrapperEl = this.createViewer(document.createElement('div'));
        this.wrapperEl.classList.add(CSS_CLASS_IMAGE);

        this.imageEl = this.wrapperEl.appendChild(document.createElement('img'));
        this.imageEl.setAttribute('data-page-number', 1);

        // hides image tag until content is loaded
        this.imageEl.classList.add(CLASS_INVISIBLE);

        this.currentRotationAngle = 0;

        const fileName = getProp(this.options, 'file.name');
        this.imageEl.setAttribute('alt', fileName);

        if (this.options.enableAnnotationsImageDiscoverability) {
            this.addListener('zoom', this.handleZoomEvent);
        }

        this.updateDiscoverabilityResinTag();
    }

    /**
     * Loads an Image.
     *
     * @return {Promise}
     */
    load() {
        super.load();

        const { representation, viewer } = this.options;
        const template = representation.content.url_template;
        const downloadUrl = this.createContentUrlWithAuthParams(template, viewer.ASSET);

        this.bindDOMListeners();
        return this.getRepStatus()
            .getPromise()
            .then(() => this.handleAssetAndRepLoad(downloadUrl))
            .catch(this.handleAssetError);
    }

    /**
     * Loads the image to be viewed
     *
     * @override
     * @return {void}
     */
    handleAssetAndRepLoad(downloadUrl) {
        this.startLoadTimer();
        this.imageEl.src = downloadUrl;

        super.handleAssetAndRepLoad();
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

        // Disallow creating annotations on rotated images
        if (this.currentRotationAngle === 0) {
            this.enableAnnotationControls();
        } else {
            this.disableAnnotationControls();
        }

        // Re-adjust image position after rotation
        this.handleOrientationChange();
        this.setScale(this.imageEl.offsetwidth, this.imageEl.offsetHeight);
    }

    // Annotation overrides
    getInitialAnnotationMode() {
        return this.options.enableAnnotationsImageDiscoverability ? AnnotationMode.REGION : AnnotationMode.NONE;
    }

    /**
     * Gets the width & height after the transforms are applied.
     * When an image is rotated, the width & height of an image, e.g. offsetWidth & offsetHeight,
     * are the values before transforms are applied, so if the image is rotated we need to swap the
     * width & height
     *
     * @private
     * @param {number} [width] - The width in px
     * @param {number} [height] - The height in px
     * @param {boolean} [isRotated] - if the image has a transform rotate applied to it
     * @return {Object} the width & height of the image after tranformations
     */
    getTransformWidthAndHeight(width, height, isRotated) {
        if (isRotated) {
            return {
                width: height,
                height: width,
            };
        }
        return {
            width,
            height,
        };
    }

    /**
     * Gets the viewport dimensions.
     *
     * @return {Object} the width & height of the viewport
     */
    getViewportDimensions() {
        return {
            width: this.wrapperEl.clientWidth - 2 * IMAGE_PADDING,
            height: this.wrapperEl.clientHeight - 2 * IMAGE_PADDING,
        };
    }

    /**
     * Sets mode to be AnnotationMode.NONE if the zoomed image overflows the viewport.
     *
     * @return {void}
     */
    handleZoomEvent({ newScale, type }) {
        const [width, height] = newScale;

        // type is undefined on initial render, we only want below logic to execute on user initiated actions
        if (!type) {
            return;
        }

        const viewport = this.getViewportDimensions();

        // We only set AnnotationMode to be NONE if the image overflows the viewport and the state is not explicit region creation
        const currentState = this.annotationControlsFSM.getState();
        if (currentState === AnnotationState.REGION_TEMP && (width > viewport.width || height > viewport.height)) {
            this.annotator.toggleAnnotationMode(AnnotationMode.NONE);
            this.processAnnotationModeChange(this.annotationControlsFSM.transition(AnnotationInput.CANCEL));
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
        let height;
        let width;
        const isRotated = this.isRotated();

        // From this point on, only 1 dimension will be modified. Either it will be width or it will be height.
        // The other one will remain null and eventually get cleared out. The image should automatically use the proper value
        // for the dimension that was cleared out.
        if (type === 'in' || type === 'out') {
            ({ width, height } = this.getTransformWidthAndHeight(
                this.imageEl.offsetWidth,
                this.imageEl.offsetHeight,
                isRotated,
            ));

            // Since we are taking offsetWidth, we only need to apply the zoom to the width
            // as clearing the height will preserve the aspect ratio
            newWidth = type === 'in' ? width * IMAGE_ZOOM_SCALE : width / IMAGE_ZOOM_SCALE;
        } else {
            // This can be triggered by initial render as well as reset
            // When it is an initial render or reset, take the original dimensions of the image
            const origHeight = parseInt(this.imageEl.getAttribute('originalHeight'), 10);
            const origWidth = parseInt(this.imageEl.getAttribute('originalWidth'), 10);
            ({ width, height } = this.getTransformWidthAndHeight(origWidth, origHeight, isRotated));
            const modifyWidthInsteadOfHeight = width >= height;

            const viewport = this.getViewportDimensions();

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
                newWidth = Math.min(viewport.width, origWidth);
            } else {
                newHeight = Math.min(viewport.height, origHeight);
            }
        }

        // If the image has been rotated, we need to swap the width and height
        // because when setting width or height, transforms / rotates are ignored.
        if (isRotated) {
            const temp = newWidth;
            newWidth = newHeight;
            newHeight = temp;
        }

        // Set the new dimensions. This ignores rotates, hence we need to swap the dimensions above (if zooming).
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
            canZoomOut: true,
            type,
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
        this.renderUI();

        this.emit('scale', {
            scale: this.scale,
            rotationAngle: this.rotationAngle,
        });
    }

    loadUI() {
        super.loadUI();

        this.annotationControlsFSM.subscribe(() => this.renderUI());
        this.renderUI();
    }

    /**
     * Updates experiences option after props have changed in parent app
     *
     * @protected
     * @param {Object} experiences - new experiences prop
     * @return {void}
     */
    updateExperiences(experiences) {
        if (!this.controls) {
            return;
        }

        this.controls.updateExperiences(experiences);

        this.renderUI();
    }

    renderUI() {
        if (!this.controls) {
            return;
        }

        const canAnnotate =
            this.areNewAnnotationsEnabled() && this.hasAnnotationCreatePermission() && this.currentRotationAngle === 0;
        const canDraw = canAnnotate && this.options.showAnnotationsDrawingCreate;

        this.controls.render(
            <ImageControls
                annotationColor={this.annotationModule.getColor()}
                annotationMode={this.annotationControlsFSM.getMode()}
                hasDrawing={canDraw}
                hasHighlight={false}
                hasRegion={canAnnotate}
                onAnnotationColorChange={this.handleAnnotationColorChange}
                onAnnotationModeClick={this.handleAnnotationControlsClick}
                onAnnotationModeEscape={this.handleAnnotationControlsEscape}
                onFullscreenToggle={this.toggleFullscreen}
                onRotateLeft={this.rotateLeft}
                onZoomIn={this.zoomIn}
                onZoomOut={this.zoomOut}
                scale={this.scale}
            />,
        );
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
        const imageDimensions = this.imageEl.getBoundingClientRect();
        const wrapperDimensions = this.wrapperEl.getBoundingClientRect();
        const viewport = {
            width: this.wrapperEl.clientWidth - IMAGE_PADDING,
            height: this.wrapperEl.clientHeight - IMAGE_PADDING,
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
        this.wrapperEl.scrollLeft = (imageDimensions.width - viewport.width) / 2;
        this.wrapperEl.scrollTop = (imageDimensions.height - viewport.height) / 2;
    }

    //--------------------------------------------------------------------------
    // Event Listeners
    //--------------------------------------------------------------------------

    /**
     * Passes the error and download URL to the download error handler.
     *
     * @param {Error} err - Download error
     * @return {void}
     */
    handleImageDownloadError(err) {
        this.handleDownloadError(err, this.imageEl.src);
    }

    /**
     * Binds DOM listeners for image viewer.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        super.bindDOMListeners();

        this.imageEl.addEventListener('load', this.finishLoading);
        this.imageEl.addEventListener('error', this.handleImageDownloadError);

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
            this.imageEl.removeEventListener('error', this.handleImageDownloadError);
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
            rotationAngle: this.rotationAngle,
        });
    }

    handleAnnotationColorChange(color) {
        this.annotationModule.setColor(color);
        this.annotator.emit(ANNOTATOR_EVENT.setColor, color);
        this.renderUI();
    }

    /**
     * Handler for annotation controls button click event.
     *
     * @private
     * @param {AnnotationMode} mode one of annotation modes
     * @return {void}
     */
    handleAnnotationControlsClick({ mode }) {
        const nextMode = this.annotationControlsFSM.transition(AnnotationInput.CLICK, mode);
        this.annotator.toggleAnnotationMode(nextMode);
        this.processAnnotationModeChange(nextMode);
    }

    handleAnnotationCreateEvent({ annotation: { id } = {}, meta: { status } = {} }) {
        if (status !== 'success') {
            return;
        }

        this.annotator.emit('annotations_active_set', id);
    }

    initAnnotations() {
        super.initAnnotations();

        if (this.areNewAnnotationsEnabled()) {
            this.annotator.addListener('annotations_create', this.handleAnnotationCreateEvent);
        }
    }

    updateDiscoverabilityResinTag() {
        if (!this.containerEl) {
            return;
        }

        const isDiscoverable = this.annotationControlsFSM.getState() === AnnotationState.REGION_TEMP;
        const isUsingDiscoverability = this.options.enableAnnotationsImageDiscoverability && isDiscoverable;

        // For tracking purposes, set property to true when the annotation controls are in a state
        // in which the default discoverability experience is enabled
        this.containerEl.setAttribute(DISCOVERABILITY_ATTRIBUTE, isUsingDiscoverability);
    }

    /**
     * Hides the create region cursor popup for an image
     *
     * @protected
     * @return {void}
     */
    applyCursorFtux() {
        if (!this.containerEl || this.annotationControlsFSM.getState() !== AnnotationState.REGION) {
            return;
        }

        if (this.cache.get(IMAGE_FTUX_CURSOR_SEEN_KEY)) {
            this.containerEl.classList.add(CLASS_ANNOTATIONS_IMAGE_FTUX_CURSOR_SEEN);
        } else {
            this.cache.set(IMAGE_FTUX_CURSOR_SEEN_KEY, true, true);
        }
    }
}

export default ImageViewer;
