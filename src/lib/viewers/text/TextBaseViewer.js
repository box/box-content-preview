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
        // Destroy the controls
        if (this.controls && typeof this.controls.destroy === 'function') {
            this.controls.destroy();
        }

        super.destroy();
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
