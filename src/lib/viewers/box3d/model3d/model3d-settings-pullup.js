import EventEmitter from 'events';
import {
    UIRegistry,
    createButton,
    createCheckbox,
    createDropdown,
    createLabel,
    createPullup,
    createRow
} from '../box3d-ui-utils';
import {
    AXIS_X,
    AXIS_Y,
    AXIS_Z,
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    QUALITY_LEVEL_AUTO,
    QUALITY_LEVEL_FULL,
    CSS_CLASS_HIDDEN,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SAVE_SCENE_DEFAULTS,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_QUALITY_LEVEL,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    RENDER_MODE_LIT,
    RENDER_MODE_UNLIT,
    RENDER_MODE_NORMALS,
    RENDER_MODE_SHAPE,
    RENDER_MODE_WIRE,
    RENDER_MODE_UNTEXTURED_WIRE,
    RENDER_MODE_UV,
    ROTATION_STEP
} from './model3d-constants';

import {
    CLASS_BOX_PREVIEW_OVERLAY_WRAPPER,
    CLASS_IS_VISIBLE
} from '../../../constants';

// For registering events on elements
const RENDER_MODES = [
    {
        text: RENDER_MODE_LIT,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_LIT]
    }, {
        text: RENDER_MODE_UNLIT,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_UNLIT]
    }, {
        text: RENDER_MODE_NORMALS,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_NORMALS]
    }, {
        text: RENDER_MODE_SHAPE,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_SHAPE]
    }, {
        text: RENDER_MODE_WIRE,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_WIRE]
    }, {
        text: RENDER_MODE_UNTEXTURED_WIRE,
        callback: 'onRenderModeSelected',
        args: [RENDER_MODE_UNTEXTURED_WIRE]
    }, {
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
    }, {
        text: 'Orthographic',
        callback: 'onProjectionSelected',
        args: [CAMERA_PROJECTION_ORTHOGRAPHIC]
    }
];

const QUALITY_LEVELS = [
    {
        text: 'Auto',
        callback: 'onQualityLevelSelected',
        args: [QUALITY_LEVEL_AUTO]
    }, {
        text: 'Full',
        callback: 'onQualityLevelSelected',
        args: [QUALITY_LEVEL_FULL]
    }
];

/**
 * The UI and events system necessary to run the Settings Panel.
 */
class Model3DSettingsPullup extends EventEmitter {
    /**
     * @constructor
     */
    constructor() {
        super();
        this.renderModeEl = null;
        this.renderModeListEl = null;
        this.showWireframesEl = null;
        this.showSkeletonsEl = null;
        this.projectionEl = null;
        this.projectionListEl = null;
        this.qualityLevelEl = null;
        this.qualityLevelListEl = null;
        this.saveRowEl = null;

        this.uiRegistry = new UIRegistry();
        this.pullupEl = this.createUi();
    }

    /**
     * Convert the callback property of a config callback to a valid callback function.
     * @method convertToValidCallback
     * @private
     * @param {Object} configEntry A descriptor for the callback.
     * @param {Function} configEntry.callback The callback function to search for and assign back to the entry.
     * @param {Array} configEntry.args Arguments to be bound to the function callback.
     * @returns {void}
     */
    convertToValidCallback(configEntry) {
        const entry = configEntry;
        const callback = entry.callback;

        if (typeof callback === 'string' && this[callback]) {
            entry.callback = this[callback].bind(this, ...entry.args);
        }
    }

    /**
     * Create the UI necessary to run the Settings panel pullup.
     * @method createUi
     * @private
     * @returns {HtmlElement} The pullup element for the settings panel.
     */
    createUi() {
        // The containing pullup element
        this.pullupEl = createPullup();
        this.uiRegistry.registerUiItem('settings-pullup-el', this.pullupEl);

        // Render Mode dropdown
        const renderPanelData = RENDER_MODES.map((entry) => {
            const entryCopy = Object.assign({}, entry);
            this.convertToValidCallback(entryCopy);
            return entryCopy;
        });

        const renderModeDropdownEl = createDropdown('Render Mode', 'Lit', renderPanelData);
        this.renderModeEl = renderModeDropdownEl.querySelector('button');
        this.pullupEl.appendChild(renderModeDropdownEl);

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
        this.showSkeletonEl = createCheckbox();
        const skeletonLabelEl = createLabel('Show skeletons');
        skeletonRowEl.appendChild(this.showSkeletonEl);
        skeletonRowEl.appendChild(skeletonLabelEl);
        this.pullupEl.appendChild(skeletonRowEl);

        // Camera Projection dropdown
        const projectionPanelData = PROJECTION_MODES.map((entry) => {
            const entryCopy = Object.assign({}, entry);
            this.convertToValidCallback(entryCopy);
            return entryCopy;
        });

        const projectionPanelRowEl = createDropdown('Camera Projection', 'Perspective',
            projectionPanelData);
        this.projectionEl = projectionPanelRowEl.querySelector('button');
        this.pullupEl.appendChild(projectionPanelRowEl);

        // Quality Level dropdown
        const qualityPanelData = QUALITY_LEVELS.map((entry) => {
            const entryCopy = Object.assign({}, entry);
            this.convertToValidCallback(entryCopy);
            return entryCopy;
        });

        const qualityPanelRowEl = createDropdown('Render Quality', 'Auto', qualityPanelData);
        this.qualityLevelEl = qualityPanelRowEl.querySelector('button');
        this.pullupEl.appendChild(qualityPanelRowEl);

        // Set up "click" handlers for the dropdown menus.
        this.renderModeListEl = renderModeDropdownEl.querySelector(`.${CLASS_BOX_PREVIEW_OVERLAY_WRAPPER}`);
        this.projectionListEl = projectionPanelRowEl.querySelector(`.${CLASS_BOX_PREVIEW_OVERLAY_WRAPPER}`);
        this.qualityLevelListEl = qualityPanelRowEl.querySelector(`.${CLASS_BOX_PREVIEW_OVERLAY_WRAPPER}`);

        this.uiRegistry.registerUiItem('settings-render-mode-selector-label', this.renderModeEl, 'click', () => {
            this.projectionListEl.classList.remove(CLASS_IS_VISIBLE);
            this.qualityLevelListEl.classList.remove(CLASS_IS_VISIBLE);
        });

        this.uiRegistry.registerUiItem('settings-projection-mode-selector-label', this.projectionEl, 'click', () => {
            this.renderModeListEl.classList.remove(CLASS_IS_VISIBLE);
            this.qualityLevelListEl.classList.remove(CLASS_IS_VISIBLE);
        });

        this.uiRegistry.registerUiItem('settings-quality-level-selector-label', this.qualityLevelEl, 'click', () => {
            this.projectionListEl.classList.remove(CLASS_IS_VISIBLE);
            this.renderModeListEl.classList.remove(CLASS_IS_VISIBLE);
        });

        // Axis Rotation icons
        const rotateRowEl = createRow('Rotate Model');
        const axisRowEl = this.createAxisWidget();
        this.pullupEl.appendChild(rotateRowEl);
        this.pullupEl.appendChild(axisRowEl);

        // Save button
        this.saveRowEl = createRow();
        const saveButtonEl = createButton('Save Settings');
        saveButtonEl.classList.add('box-preview-btn-primary');
        this.saveRowEl.appendChild(saveButtonEl);
        this.pullupEl.appendChild(this.saveRowEl);

        this.uiRegistry.registerUiItem('settings-save-button', saveButtonEl, 'click', () => {
            this.onSaveSelected();
        });

        return this.pullupEl;
    }

    /**
     * Create the axis rotation widget.
     * @method createAxisWidget
     * @private
     * @returns {HtmlElement} The newly created rotation axis widget element.
     */
    createAxisWidget() {
        const rowEl = createRow();

        rowEl.appendChild(this.createRotationAxis(AXIS_X,
            () => this.onAxisRotationSelected(AXIS_X, -1),
            () => this.onAxisRotationSelected(AXIS_X, 1)));

        rowEl.appendChild(this.createRotationAxis(AXIS_Y,
            () => this.onAxisRotationSelected(AXIS_Y, -1),
            () => this.onAxisRotationSelected(AXIS_Y, 1)));

        rowEl.appendChild(this.createRotationAxis(AXIS_Z,
            () => this.onAxisRotationSelected(AXIS_Z, 1),
            () => this.onAxisRotationSelected(AXIS_Z, -1)));

        return rowEl;
    }

    /**
     * Create a single axis rotation widget.
     * @method createRotationAxis
     * @private
     * @param {String} axisLabel The label for the axis.
     * @param {Function} minusIconCallback Called when the "minus" icon is clicked.
     * @param {Function} plusIconCallback Called when the "plus" icon is clicked.
     * @returns {HtmlElement} The axis widget for the supplied axis.
     */
    createRotationAxis(axisLabel, minusIconCallback, plusIconCallback) {
        const axisEl = document.createElement('div');
        axisEl.classList.add('box3d-settings-axis-widget');
        axisEl.classList.add(`box3d-settings-axis-widget-${axisLabel}`);

        const minusIconEl = document.createElement('span');
        minusIconEl.classList.add('box3d-setting-axis-rotate');
        minusIconEl.classList.add('box3d-setting-axis-rotate-left');
        this.uiRegistry.registerUiItem(`minus-${axisLabel}-axis-icon`, minusIconEl, 'click', minusIconCallback);
        axisEl.appendChild(minusIconEl);

        // axis label
        const axisLabelEl = document.createElement('span');
        axisLabelEl.textContent = axisLabel.toUpperCase();
        axisEl.appendChild(axisLabelEl);

        const plusIconEl = document.createElement('span');
        plusIconEl.classList.add('box3d-setting-axis-rotate');
        plusIconEl.classList.add('box3d-setting-axis-rotate-right');
        this.uiRegistry.registerUiItem(`plus-${axisLabel}-axis-icon`, plusIconEl, 'click', plusIconCallback);
        axisEl.appendChild(plusIconEl);

        return axisEl;
    }

    /**
     * Emit a message with the render mode that has been selected.
     * @method onRenderModeSelected
     * @private
     * @param {String} mode The render mode to emit a message about.
     * @returns {void}
     */
    onRenderModeSelected(mode) {
        this.emit(EVENT_SET_RENDER_MODE, mode);
    }

    /**
     * Emit an axis rotation event with the axis of rotation and direction to rotate.
     * @method onAxisRotationSelected
     * @private
     * @param {String} rotationAxis The axis to rotate on.
     * @param {Integer} direction The direction to rotate: 1 is positive rotation and -1 is negative.
     * @returns {void}
     */
    onAxisRotationSelected(rotationAxis, direction) {
        const axis = {};
        axis[rotationAxis] = direction * ROTATION_STEP;
        this.emit(EVENT_ROTATE_ON_AXIS, axis);
    }

    /**
     * Set the current projection mode being used.
     * @method onProjectionSelected
     * @private
     * @param {String} mode The projection mode to use.
     * @returns {void}
     */
    onProjectionSelected(mode) {
        this.emit(EVENT_SET_CAMERA_PROJECTION, mode);
    }

    /**
     * Set the current quality level used for rendering.
     * @method onQualityLevelSelected
     * @private
     * @param {String} level The quality level to use.
     * @returns {void}
     */
    onQualityLevelSelected(level) {
        this.emit(EVENT_SET_QUALITY_LEVEL, level);
    }

    /**
     * Notify listeners of save event.
     * @method onSaveSelected
     * @private
     * @returns {void}
     */
    onSaveSelected() {
        // We can cheat because the strings in the label match the metadata values
        this.emit(EVENT_SAVE_SCENE_DEFAULTS, this.renderModeEl.textContent, this.projectionEl.textContent);
    }

    /**
     * Notify listeners that the show wireframes checkbox was toggled.
     * @method onShowWireframeToggled
     * @private
     * @returns {void}
     */
    onShowWireframesToggled() {
        this.emit(EVENT_SET_WIREFRAMES_VISIBLE, this.showWireframesEl.checked);
    }

    /**
     * Set the current render mode being shown, in the dropdown label
     * @method setCurrentRenderMode
     * @public
     * @param {String} mode The render mode name to display.
     * @returns {void}
     */
    setCurrentRenderMode(mode) {
        this.renderModeEl.textContent = mode;
    }

    /**
     * Set the current projection mode being used, in the dropdown label.
     * @method setCurrentProjectionMode
     * @public
     * @param {String} mode The projection mode name to display
     * @returns {void}
     */
    setCurrentProjectionMode(mode) {
        this.projectionEl.textContent = mode;
    }

    /**
     * Hide the save button.
     * @method hideSaveButton
     * @public
     * @returns {void}
     */
    hideSaveButton() {
        this.saveRowEl.querySelector('button').classList.add(CSS_CLASS_HIDDEN);
    }

    /**
     * Show the settings panel.
     * @method show
     * @public
     * @returns {void}
     */
    show() {
        this.pullupEl.classList.remove(CSS_CLASS_HIDDEN);
    }

    /**
     * Hide the settings panel, and close inner dropdowns.
     * @method hide
     * @public
     * @returns {void}
     */
    hide() {
        this.pullupEl.classList.add(CSS_CLASS_HIDDEN);
        this.projectionListEl.classList.remove(CLASS_IS_VISIBLE);
        this.renderModeListEl.classList.remove(CLASS_IS_VISIBLE);
        this.qualityLevelListEl.classList.remove(CLASS_IS_VISIBLE);
    }

    /**
     * Toggle display of settings panel, make sure dropdowns are closed.
     * @method toggle
     * @public
     * @returns {void}
     */
    toggle() {
        this.pullupEl.classList.toggle(CSS_CLASS_HIDDEN);
        this.projectionListEl.classList.remove(CLASS_IS_VISIBLE);
        this.renderModeListEl.classList.remove(CLASS_IS_VISIBLE);
        this.qualityLevelListEl.classList.remove(CLASS_IS_VISIBLE);
    }

    /**
     * Release resources created by this pullup.
     * @method destroy
     * @public
     * @returns {void}
     */
    destroy() {
        this.uiRegistry.unregisterUiItems();
        this.uiRegistry = null;
        this.renderModeEl = null;
        this.showWireframesEl = null;
        this.showSkeletonsEl = null;
        this.projectionEl = null;
        this.qualityLevelEl = null;
        this.saveRowEl = null;
        this.pullupEl = null;
    }
}

export default Model3DSettingsPullup;
