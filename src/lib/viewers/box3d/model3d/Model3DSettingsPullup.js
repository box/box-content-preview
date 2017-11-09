import EventEmitter from 'events';
import { UIRegistry, createCheckbox, createDropdown, createLabel, createPullup, createRow } from '../Box3DUIUtils';
import {
    AXIS_X,
    AXIS_Y,
    AXIS_Z,
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    CSS_CLASS_HIDDEN,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    EVENT_SET_GRID_VISIBLE,
    RENDER_MODE_LIT,
    RENDER_MODE_UNLIT,
    RENDER_MODE_NORMALS,
    RENDER_MODE_SHAPE,
    RENDER_MODE_UV,
    ROTATION_STEP
} from './model3DConstants';

import { CLASS_BOX_PREVIEW_OVERLAY_WRAPPER, CLASS_IS_VISIBLE } from '../../../constants';

// For registering events on elements
const RENDER_MODES = [
    {
        text: RENDER_MODE_LIT,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_LIT]
    },
    {
        text: RENDER_MODE_UNLIT,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_UNLIT]
    },
    {
        text: RENDER_MODE_NORMALS,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_NORMALS]
    },
    {
        text: RENDER_MODE_SHAPE,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_SHAPE]
    },
    {
        text: RENDER_MODE_UV,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_UV]
    }
];

const PROJECTION_MODES = [
    {
        text: 'Perspective',
        callback: 'onProjectionSelected',
        args: [CAMERA_PROJECTION_PERSPECTIVE]
    },
    {
        text: 'Orthographic',
        callback: 'onProjectionSelected',
        args: [CAMERA_PROJECTION_ORTHOGRAPHIC]
    }
];

/**
 * The UI and events system necessary to run the Settings Panel.
 */
class Model3DSettingsPullup extends EventEmitter {
    /** @property {HTMLElement} - Element that contains UI to interact with render modes */
    renderModeEl;

    /** @property {HTMLElement} - Element containing list of render modes */
    renderModeListEl;

    /** @property {HTMLElement} - Element that toggles on and off wireframe rendering */
    showWireframesEl;

    /** @property {HTMLElement} - Element that toggles on and off the grid */
    showGridEl;

    /** @property {HTMLElement} - Element that toggles on and off skeleton rendering */
    showSkeletonsEl;

    /** @property {HTMLElement} - Element that contains UI to interact with projection modes */
    projectionEl;

    /** @property {HTMLElement} - Element containing list of projection modes */
    projectionListEl;

    /** @property {UIRegistry} - Used to track and cleanup UI pieces and event handlers */
    uiRegistry;

    /**
     * @constructor
     */
    constructor() {
        super();

        this.uiRegistry = new UIRegistry();
        this.createUi();
    }

    /**
     * Convert the callback property of a config callback to a valid callback function.
     *
     * @private
     * @param {Object} configEntry - A descriptor for the callback.
     * @param {Function} configEntry.callback - The callback function to search for and assign back to the entry.
     * @param {Array} configEntry.args - Arguments to be bound to the function callback.
     * @return {void}
     */
    convertToValidCallback(configEntry) {
        const entry = configEntry;
        const { callback } = entry;

        if (typeof callback === 'string' && this[callback]) {
            entry.callback = this[callback].bind(this, ...entry.args);
        }
    }

    /**
     * Create the UI necessary to run the Settings panel pullup.
     *
     * @private
     * @return {void}
     */
    createUi() {
        // The containing pullup element
        this.pullupEl = createPullup();
        this.uiRegistry.registerItem('settings-pullup-el', this.pullupEl);

        // Render Mode dropdown
        const renderPanelData = RENDER_MODES.map((entry) => {
            const entryCopy = Object.assign({}, entry);
            this.convertToValidCallback(entryCopy);
            return entryCopy;
        });

        const renderModeDropdownEl = createDropdown('Render Mode', 'Lit', renderPanelData);
        this.renderModeEl = renderModeDropdownEl.querySelector('button');
        this.pullupEl.appendChild(renderModeDropdownEl);

        // Grid option
        const gridRowEl = createRow();
        this.showGridEl = createCheckbox();
        const gridLabelEl = createLabel('Show grid');
        gridRowEl.appendChild(this.showGridEl);
        gridRowEl.appendChild(gridLabelEl);
        this.pullupEl.appendChild(gridRowEl);

        this.showGridEl.addEventListener('click', () => {
            this.onShowGridToggled();
        });

        // Wireframe option
        const wireframeRowEl = createRow();
        this.showWireframesEl = createCheckbox();
        const wireframeLabelEl = createLabel('Show wireframes');
        wireframeRowEl.appendChild(this.showWireframesEl);
        wireframeRowEl.appendChild(wireframeLabelEl);
        this.pullupEl.appendChild(wireframeRowEl);

        this.showWireframesEl.addEventListener('click', () => {
            this.onShowWireframesToggled();
        });

        // Skeleton option
        const skeletonRowEl = createRow();
        this.showSkeletonsEl = createCheckbox();
        const skeletonLabelEl = createLabel('Show skeletons');
        skeletonRowEl.appendChild(this.showSkeletonsEl);
        skeletonRowEl.appendChild(skeletonLabelEl);
        this.pullupEl.appendChild(skeletonRowEl);

        this.showSkeletonsEl.addEventListener('click', () => {
            this.onShowSkeletonsToggled();
        });

        // Camera Projection dropdown
        const projectionPanelData = PROJECTION_MODES.map((entry) => {
            const entryCopy = Object.assign({}, entry);
            this.convertToValidCallback(entryCopy);
            return entryCopy;
        });

        const projectionPanelRowEl = createDropdown('Camera Projection', 'Perspective', projectionPanelData);
        this.projectionEl = projectionPanelRowEl.querySelector('button');
        this.pullupEl.appendChild(projectionPanelRowEl);

        // Set up "click" handlers for the dropdown menus.
        this.renderModeListEl = renderModeDropdownEl.querySelector(`.${CLASS_BOX_PREVIEW_OVERLAY_WRAPPER}`);
        this.projectionListEl = projectionPanelRowEl.querySelector(`.${CLASS_BOX_PREVIEW_OVERLAY_WRAPPER}`);

        this.uiRegistry.registerItem('settings-render-mode-selector-label', this.renderModeEl, 'click', () => {
            this.projectionListEl.classList.remove(CLASS_IS_VISIBLE);
        });

        this.uiRegistry.registerItem('settings-projection-mode-selector-label', this.projectionEl, 'click', () => {
            this.renderModeListEl.classList.remove(CLASS_IS_VISIBLE);
        });

        // Axis Rotation icons
        const rotateRowEl = createRow('Rotate Model');
        const axisRowEl = this.createAxisWidget();
        this.pullupEl.appendChild(rotateRowEl);
        this.pullupEl.appendChild(axisRowEl);
    }

    /**
     * Create the axis rotation widget.
     *
     * @private
     * @return {HtmlElement} The newly created rotation axis widget element.
     */
    createAxisWidget() {
        const rowEl = createRow();

        rowEl.appendChild(
            this.createRotationAxis(
                AXIS_X,
                () => this.onAxisRotationSelected(AXIS_X, -1),
                () => this.onAxisRotationSelected(AXIS_X, 1)
            )
        );

        rowEl.appendChild(
            this.createRotationAxis(
                AXIS_Y,
                () => this.onAxisRotationSelected(AXIS_Y, -1),
                () => this.onAxisRotationSelected(AXIS_Y, 1)
            )
        );

        rowEl.appendChild(
            this.createRotationAxis(
                AXIS_Z,
                () => this.onAxisRotationSelected(AXIS_Z, 1),
                () => this.onAxisRotationSelected(AXIS_Z, -1)
            )
        );

        return rowEl;
    }

    /**
     * Create a single axis rotation widget.
     *
     * @private
     * @param {string} axisLabel - The label for the axis.
     * @param {Function} minusIconCallback - Called when the "minus" icon is clicked.
     * @param {Function} plusIconCallback - Called when the "plus" icon is clicked.
     * @return {HtmlElement} The axis widget for the supplied axis.
     */
    createRotationAxis(axisLabel, minusIconCallback, plusIconCallback) {
        const axisEl = document.createElement('div');
        axisEl.classList.add('box3d-settings-axis-widget');
        axisEl.classList.add(`box3d-settings-axis-widget-${axisLabel}`);

        const minusIconEl = document.createElement('span');
        minusIconEl.classList.add('box3d-setting-axis-rotate');
        minusIconEl.classList.add('box3d-setting-axis-rotate-left');
        this.uiRegistry.registerItem(`minus-${axisLabel}-axis-icon`, minusIconEl, 'click', minusIconCallback);
        axisEl.appendChild(minusIconEl);

        // axis label
        const axisLabelEl = document.createElement('span');
        axisLabelEl.textContent = axisLabel.toUpperCase();
        axisEl.appendChild(axisLabelEl);

        const plusIconEl = document.createElement('span');
        plusIconEl.classList.add('box3d-setting-axis-rotate');
        plusIconEl.classList.add('box3d-setting-axis-rotate-right');
        this.uiRegistry.registerItem(`plus-${axisLabel}-axis-icon`, plusIconEl, 'click', plusIconCallback);
        axisEl.appendChild(plusIconEl);

        return axisEl;
    }

    /**
     * Emit a message with the render mode that has been selected.
     *
     * @private
     * @param {string} mode - The render mode to emit a message about.
     * @return {void}
     */
    onRenderModeSelected(mode) {
        this.emit(EVENT_SET_RENDER_MODE, mode);
    }

    /**
     * Emit an axis rotation event with the axis of rotation and direction to rotate.
     *
     * @private
     * @param {string} rotationAxis - The axis to rotate on.
     * @param {number} direction - The direction to rotate: 1 is positive rotation and -1 is negative.
     * @return {void}
     */
    onAxisRotationSelected(rotationAxis, direction) {
        const axis = {};
        axis[rotationAxis] = direction * ROTATION_STEP;
        this.emit(EVENT_ROTATE_ON_AXIS, axis);
    }

    /**
     * Set the current projection mode being used.
     *
     * @private
     * @param {string} mode - The projection mode to use.
     * @return {void}
     */
    onProjectionSelected(mode) {
        this.emit(EVENT_SET_CAMERA_PROJECTION, mode);
    }

    /**
     * Notify listeners that the show skeletons checkbox was toggled.
     *
     * @private
     * @return {void}
     */
    onShowSkeletonsToggled() {
        this.emit(EVENT_SET_SKELETONS_VISIBLE, this.showSkeletonsEl.checked);
    }

    /**
     * Hide skeletons and uncheck check box.
     *
     * @public
     * @return {void}
     */
    hideSkeletons() {
        this.showSkeletonsEl.checked = false;
        this.onShowSkeletonsToggled();
    }

    /**
     * Notify listeners that the show wireframes checkbox was toggled.
     *
     * @private
     * @return {void}
     */
    onShowWireframesToggled() {
        this.emit(EVENT_SET_WIREFRAMES_VISIBLE, this.showWireframesEl.checked);
    }

    /**
     * Notify listeners that the show grid checkbox was toggled.
     *
     * @private
     * @return {void}
     */
    onShowGridToggled() {
        this.emit(EVENT_SET_GRID_VISIBLE, this.showGridEl.checked);
    }

    /**
     * Hide wireframes and uncheck check box
     *
     * @public
     * @return {void}
     */
    hideWireframes() {
        this.showWireframesEl.checked = false;
        this.onShowWireframesToggled();
    }

    /**
     * Show grid and check check box
     *
     * @public
     * @return {void}
     */
    showGrid() {
        this.showGridEl.checked = true;
        this.onShowGridToggled();
    }

    /**
     * Reset the pullup to its default state.
     *
     * @public
     * @return {void}
     */
    reset() {
        this.hideWireframes();
        this.hideSkeletons();
        this.showGrid();
    }

    /**
     * Set the current render mode being shown, in the dropdown label.
     *
     * @public
     * @param {string} mode - The render mode name to display.
     * @return {void}
     */
    setCurrentRenderMode(mode) {
        this.renderModeEl.textContent = mode;
    }

    /**
     * Set the current projection mode being used, in the dropdown label.
     *
     * @public
     * @param {string} mode - The projection mode name to display
     * @return {void}
     */
    setCurrentProjectionMode(mode) {
        this.projectionEl.textContent = mode;
    }

    /**
     * Set the current state of the grid to the checkbox in the UI.
     *
     * @public
     * @param {string} visible - Whether to check the box or not.
     * @return {void}
     */
    setGridVisible(visible) {
        this.showGridEl.checked = visible;
    }

    /**
     * Show the settings panel.
     *
     * @public
     * @return {void}
     */
    show() {
        this.pullupEl.classList.remove(CSS_CLASS_HIDDEN);
    }

    /**
     * Hide the settings panel, and close inner dropdowns.
     *
     * @public
     * @return {void}
     */
    hide() {
        this.pullupEl.classList.add(CSS_CLASS_HIDDEN);
        this.projectionListEl.classList.remove(CLASS_IS_VISIBLE);
        this.renderModeListEl.classList.remove(CLASS_IS_VISIBLE);
    }

    /**
     * Toggle display of settings panel, make sure dropdowns are closed.
     *
     * @public
     * @return {void}
     */
    toggle() {
        this.pullupEl.classList.toggle(CSS_CLASS_HIDDEN);
        this.projectionListEl.classList.remove(CLASS_IS_VISIBLE);
        this.renderModeListEl.classList.remove(CLASS_IS_VISIBLE);
    }

    /**
     * Release resources created by this pullup.
     * @method destroy
     * @public
     * @return {void}
     */
    destroy() {
        this.uiRegistry.unregisterAll();
        this.uiRegistry = null;
        this.renderModeEl = null;
        this.showWireframesEl = null;
        this.showGridEl = null;
        this.showSkeletonsEl = null;
        this.projectionEl = null;
        this.pullupEl = null;
    }
}

export default Model3DSettingsPullup;
