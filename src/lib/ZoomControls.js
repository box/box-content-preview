import isFinite from 'lodash/isFinite';
import noop from 'lodash/noop';
import { ICON_ZOOM_IN, ICON_ZOOM_OUT } from './icons/icons';
import Controls, { CLASS_BOX_CONTROLS_GROUP_BUTTON } from './Controls';

const CLASS_ZOOM_CURRENT_SCALE = 'bp-ZoomControls-currentScale';
const CLASS_ZOOM_CURRENT_SCALE_VALUE = 'bp-zoom-current-scale-value';
const CLASS_ZOOM_IN_BUTTON = 'bp-zoom-in-btn';
const CLASS_ZOOM_OUT_BUTTON = 'bp-zoom-out-btn';
const CLASS_ZOOM_BUTTON = 'bp-zoom-btn';
const ZOOM_MAX = Number.POSITIVE_INFINITY;
const ZOOM_MIN = 0.1;

class ZoomControls {
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
        if (!controls || !(controls instanceof Controls)) {
            throw Error('controls must be an instance of Controls');
        }

        this.controls = controls;
        this.controlsElement = controls.controlsEl;
    }

    /**
     * Initialize the zoom controls with the initial scale and options.
     *
     * @param {number} currentScale - Initial scale value, assumes range on the scale of 0-1
     * @param {number} [options.maxZoom] - Maximum zoom, on the scale of 0-1, though the max could be upwards of 1
     * @param {number} [options.minZoom] - Minimum zoom, on the scale of 0-1
     * @param {String} [options.zoomInClassName] - Class name for zoom in button
     * @param {String} [options.zoomOutClassName] - Class name for zoom out button
     * @param {Function} [options.onZoomIn] - Callback when zoom in is triggered
     * @param {Function} [options.onZoomOut] - Callback when zoom out is triggered
     * @return {void}
     */
    init(
        currentScale,
        {
            zoomOutClassName = '',
            zoomInClassName = '',
            minZoom = ZOOM_MIN,
            maxZoom = ZOOM_MAX,
            onZoomIn = noop,
            onZoomOut = noop,
        } = {},
    ) {
        this.maxZoom = Math.round((isFinite(maxZoom) && maxZoom <= ZOOM_MAX ? maxZoom : ZOOM_MAX) * 100);
        this.minZoom = Math.round((isFinite(minZoom) && minZoom >= ZOOM_MIN ? minZoom : ZOOM_MIN) * 100);

        const groupElement = this.controls.addGroup();
        this.controls.add(
            __('zoom_out'),
            onZoomOut,
            `${CLASS_BOX_CONTROLS_GROUP_BUTTON} ${CLASS_ZOOM_BUTTON} ${CLASS_ZOOM_OUT_BUTTON} ${zoomOutClassName}`,
            ICON_ZOOM_OUT,
            undefined,
            groupElement,
        );
        this.controls.add(
            __('zoom_current_scale'),
            undefined,
            CLASS_ZOOM_CURRENT_SCALE,
            `<span class="${CLASS_ZOOM_CURRENT_SCALE_VALUE}" data-testid="current-zoom">100%</span>`,
            'div',
            groupElement,
        );
        this.controls.add(
            __('zoom_in'),
            onZoomIn,
            `${CLASS_BOX_CONTROLS_GROUP_BUTTON} ${CLASS_ZOOM_BUTTON} ${CLASS_ZOOM_IN_BUTTON} ${zoomInClassName}`,
            ICON_ZOOM_IN,
            undefined,
            groupElement,
        );

        this.currentScaleElement = this.controlsElement.querySelector(`.${CLASS_ZOOM_CURRENT_SCALE_VALUE}`);
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
}

export default ZoomControls;
