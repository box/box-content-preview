import React from 'react';
import BaseViewer from '../BaseViewer';
import ControlsRoot from '../controls';
import TextControls from './TextControls';
import { CLASS_IS_PRINTABLE, CLASS_IS_SELECTABLE, PERMISSION_DOWNLOAD } from '../../constants';
import { checkPermission } from '../../file';

const ZOOM_DEFAULT = 1.0;
const ZOOM_MAX = 10;
const ZOOM_MIN = 0.1;
const ZOOM_STEP = 0.1;
const WHEEL_ZOOM_SCALE_FACTOR = 0.01;

class TextBaseViewer extends BaseViewer {
    /**
     * @inheritdoc
     */
    constructor(options) {
        super(options);

        this.api = options.api;
        this.scale = ZOOM_DEFAULT;

        // Bind context for handlers;
        this.zoomOut = this.zoomOut.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.wheelZoomHandler = this.wheelZoomHandler.bind(this);
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

        super.destroy();
    }

    /**
     * Binds DOM listeners for the text viewer.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        const textEl = this.containerEl && this.containerEl.querySelector('.bp-text');
        if (textEl && this.featureEnabled('pinchToZoom.enabled')) {
            textEl.addEventListener('wheel', this.wheelZoomHandler, { passive: false });
        }
    }

    /**
     * Unbinds DOM listeners for the text viewer.
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        const textEl = this.containerEl && this.containerEl.querySelector('.bp-text');
        if (textEl) {
            textEl.removeEventListener('wheel', this.wheelZoomHandler);
        }
    }

    /**
     * Handles trackpad pinch-to-zoom via wheel events with ctrlKey.
     * On Mac trackpads, pinch gestures fire wheel events with ctrlKey set to true.
     * Anchors zoom on the cursor position so content under the cursor stays in place.
     *
     * @protected
     * @param {WheelEvent} event - wheel event object
     * @return {void}
     */
    wheelZoomHandler(event) {
        const textEl = this.containerEl && this.containerEl.querySelector('.bp-text');
        if (!event.ctrlKey || !textEl) {
            return;
        }

        event.preventDefault();

        const scaleDelta = -event.deltaY * WHEEL_ZOOM_SCALE_FACTOR;
        const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.scale + scaleDelta));

        if (newScale === this.scale) {
            return;
        }

        // Find the text position under the cursor so we can keep it anchored
        const range = document.caretRangeFromPoint ? document.caretRangeFromPoint(event.clientX, event.clientY) : null;

        let anchorScreenY = event.clientY;
        if (range) {
            const rangeRect = range.getBoundingClientRect();
            anchorScreenY = rangeRect.top;
        }

        // Record where on screen the anchor line currently sits
        const textRect = textEl.getBoundingClientRect();
        const anchorViewportOffset = anchorScreenY - textRect.top;

        // Apply zoom via font-size
        textEl.style.fontSize = `${Math.round(newScale * 100)}%`;
        this.scale = newScale;

        // Find where the anchor text has moved to and adjust scroll
        if (range) {
            const newRangeRect = range.getBoundingClientRect();
            const newTextRect = textEl.getBoundingClientRect();
            const newPositionInContent = newRangeRect.top - newTextRect.top + textEl.scrollTop;
            textEl.scrollTop = newPositionInContent - anchorViewportOffset;
        }

        this.emit('zoom', {
            canZoomIn: newScale < ZOOM_MAX,
            canZoomOut: newScale > ZOOM_MIN,
            zoom: newScale,
        });

        this.renderUI();
    }

    /**
     * Zooms by increasing or decreasing font size
     * @public
     * @param {string} type - in, out, reset
     * @return {void}
     */
    zoom(type) {
        let newScale = ZOOM_DEFAULT;

        if (type === 'in') {
            newScale = this.scale + ZOOM_STEP;
            newScale = newScale <= ZOOM_MAX ? newScale : ZOOM_MAX;
        } else if (type === 'out') {
            newScale = this.scale - ZOOM_STEP;
            newScale = newScale >= ZOOM_MIN ? newScale : ZOOM_MIN;
        }

        // Convert the decimal scale to a percentage font size for text content
        this.containerEl.querySelector('.bp-text').style.fontSize = `${Math.round(newScale * 100)}%`;

        this.emit('zoom', {
            canZoomIn: true,
            canZoomOut: true,
            zoom: newScale,
        });

        this.scale = newScale;
        this.renderUI();
    }

    /**
     * Zooms in.
     *
     * @return {void}
     * @public
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Zooms out.
     *
     * @return {void}
     * @public
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Loads content.
     *
     * @override
     * @return {void}
     */
    load() {
        // Enable text selection if user has download permissions and 'disableTextLayer' option is not true
        if (checkPermission(this.options.file, PERMISSION_DOWNLOAD) && !this.getViewerOption('disableTextLayer')) {
            this.containerEl.classList.add(CLASS_IS_PRINTABLE);
            this.containerEl.classList.add(CLASS_IS_SELECTABLE);
        }

        super.load();
    }

    /**
     * Load controls
     *
     * @return {void}
     * @protected
     */
    loadUI() {
        this.controls = new ControlsRoot({ containerEl: this.containerEl, fileId: this.options.file.id });
        this.bindDOMListeners();
        this.renderUI();
    }

    /**
     * Render controls
     *
     * @return {void}
     * @protected
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        this.controls.render(
            <TextControls
                maxScale={ZOOM_MAX}
                minScale={ZOOM_MIN}
                onFullscreenToggle={this.toggleFullscreen}
                onZoomIn={this.zoomIn}
                onZoomOut={this.zoomOut}
                scale={this.scale}
            />,
        );
    }

    /**
     * Handles keyboard events for media
     *
     * @param {string} key - keydown key
     * @return {boolean} consumed or not
     * @protected
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
     * @inheritdoc
     */
    resize() {
        super.resize();
    }
}

export default TextBaseViewer;
