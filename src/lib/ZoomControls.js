import isFinite from 'lodash/isFinite';
import EventEmitter from 'events';
import { ICON_ZOOM_IN, ICON_ZOOM_OUT } from './icons/icons';
import Controls from './Controls';
import { ZOOM_CONTROLS_EVENTS } from './events';

const CLASS_ZOOM_CURRENT_SCALE = 'bp-zoom-current-scale';
const CLASS_ZOOM_IN_BUTTON = 'bp-zoom-in-btn';
const CLASS_ZOOM_OUT_BUTTON = 'bp-zoom-out-btn';

class ZoomControls extends EventEmitter {
    /** @property {Controls} - Controls object */
    controls;

    /** @property {HTMLElement} - Controls element */
    controlsElement;

    /** @property {number} - Current zoom scale */
    currentScale;

    /** @property {HTMLElement} - Current scale element */
    currentScaleElement;

    /** @property {number} - Max zoom scale */
    maxZoom;

    /** @property {number} - Min zoom scale */
    minZoom;

    /**
     * [constructor]
     *
     * @param {Controls} controls - Viewer controls
     * @return {ZoomControls} Instance of ZoomControls
     */
    constructor(controls) {
        super();

        if (!controls || !(controls instanceof Controls)) {
            throw Error('controls must be an instance of Controls');
        }

        this.controls = controls;
        this.controlsElement = controls.controlsEl;

        this.handleZoomIn = this.handleZoomIn.bind(this);
        this.handleZoomOut = this.handleZoomOut.bind(this);
    }

    /**
     * Add the zoom controls
     *
     * @param {number} currentScale - Initial scale value, assumes range of 0-1
     * @param {number} [options.maxZoom] - Maximum zoom, range 0-1
     * @param {number} [options.minZoom] - Minimum zoom, range 0-1
     * @param {String} [options.zoomInClassName] - Class name for zoom in button
     * @param {String} [options.zoomOutClassName] - Class name for zoom out button
     * @return {void}
     */
    add(
        currentScale,
        { zoomOutClassName = '', zoomInClassName = '', minZoom = 0, maxZoom = Number.POSITIVE_INFINITY } = {},
    ) {
        this.maxZoom = Math.ceil(maxZoom * 100);
        this.minZoom = Math.ceil(minZoom * 100);

        this.controls.add(
            __('zoom_out'),
            this.handleZoomOut,
            `${CLASS_ZOOM_OUT_BUTTON} ${zoomOutClassName}`,
            ICON_ZOOM_OUT,
        );
        this.controls.add(
            __('zoom_current_scale'),
            undefined,
            undefined,
            `<span class="${CLASS_ZOOM_CURRENT_SCALE}" data-testid="current-zoom">100%</span>`,
            'div',
        );
        this.controls.add(__('zoom_in'), this.handleZoomIn, `${CLASS_ZOOM_IN_BUTTON} ${zoomInClassName}`, ICON_ZOOM_IN);

        this.currentScaleElement = this.controlsElement.querySelector(`.${CLASS_ZOOM_CURRENT_SCALE}`);
        this.setCurrentScale(currentScale);
    }

    /**
     * Sets the current scale
     *
     * @param {number} scale - New scale to be set as current, range 0-1
     * @return {void}
     */
    setCurrentScale(scale) {
        if (!isFinite(scale)) {
            return;
        }

        this.currentScale = Math.round(scale * 100);
        this.currentScaleElement.textContent = `${this.currentScale}%`;

        this.checkButtonEnablement();
    }

    /**
     * Checks the zoom in and zoom out button enablement
     *
     * @return {void}
     */
    checkButtonEnablement() {
        const zoomOutElement = this.controlsElement.querySelector(`.${CLASS_ZOOM_OUT_BUTTON}`);
        const zoomInElement = this.controlsElement.querySelector(`.${CLASS_ZOOM_IN_BUTTON}`);

        if (zoomOutElement) {
            zoomOutElement.disabled = this.currentScale <= this.minZoom;
        }

        if (zoomInElement) {
            zoomInElement.disabled = this.currentScale >= this.maxZoom;
        }
    }

    /**
     * Handles the zoom in button click
     *
     * @emits zoomin
     */
    handleZoomIn() {
        this.emit(ZOOM_CONTROLS_EVENTS.zoomin);
    }

    /**
     * Handles the zoom out button click
     *
     * @emits zoomout
     */
    handleZoomOut() {
        this.emit(ZOOM_CONTROLS_EVENTS.zoomout);
    }
}

export default ZoomControls;
