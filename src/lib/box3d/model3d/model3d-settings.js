import Box3DControls from '../box3d-controls';
import autobind from 'autobind-decorator';
import {
    AXIS_X,
    AXIS_Y,
    AXIS_Z,
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    CSS_CLASS_OVERLAY,
    CSS_CLASS_CURRENT_AXIS,
    CSS_CLASS_DEFAULT_SETTING_SELECTOR,
    CSS_CLASS_SETTINGS_BUTTON,
    CSS_CLASS_SETTINGS_PANEL,
    CSS_CLASS_SETTINGS_PANEL_BUTTON,
    CSS_CLASS_SETTINGS_PANEL_LABEL,
    CSS_CLASS_SETTINGS_PANEL_ROW,
    CSS_CLASS_SETTINGS_PANEL_SELECTOR_LABEL,
    CSS_CLASS_SETTINGS_WRAPPER,
    CSS_CLASS_HIDDEN,
    EVENT_CLOSE_RENDER_MODE_UI,
    EVENT_CLOSE_SETTINGS_UI,
    EVENT_RESET_SCENE_DEFAULTS,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SAVE_SCENE_DEFAULTS,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_RENDER_MODE,
    RENDER_MODE_LIT,
    RENDER_MODE_UNLIT,
    RENDER_MODE_NORMALS,
    RENDER_MODE_WIRE,
    RENDER_MODE_UNTEXTURED_WIRE,
    RENDER_MODE_UV,
    ROTATION_STEP
} from './model3d-constants';

// For registering events on elements
const RENDER_MODES = [
    {
        text: RENDER_MODE_LIT,
        callback: 'handleDefaultRenderModeSelected',
        args: [RENDER_MODE_LIT]
    }, {
        text: RENDER_MODE_UNLIT,
        callback: 'handleDefaultRenderModeSelected',
        args: [RENDER_MODE_UNLIT]
    }, {
        text: RENDER_MODE_NORMALS,
        callback: 'handleDefaultRenderModeSelected',
        args: [RENDER_MODE_NORMALS]
    }, {
        text: RENDER_MODE_WIRE,
        callback: 'handleDefaultRenderModeSelected',
        args: [RENDER_MODE_WIRE]
    }, {
        text: RENDER_MODE_UNTEXTURED_WIRE,
        callback: 'handleDefaultRenderModeSelected',
        args: [RENDER_MODE_UNTEXTURED_WIRE]
    }, {
        text: RENDER_MODE_UV,
        callback: 'handleDefaultRenderModeSelected',
        args: [RENDER_MODE_UV]
    }
];

const PROJECTION_MODES = [
    {
        text: 'Perspective',
        callback: 'handleCameraProjectionSelected',
        args: [CAMERA_PROJECTION_PERSPECTIVE]
    }, {
        text: 'Orthographic',
        callback: 'handleCameraProjectionSelected',
        args: [CAMERA_PROJECTION_ORTHOGRAPHIC]
    }
];

/**
 * Model3dSettings
 * This class handles the UI for the 3D model settings. This includes editing of
 * metadata values for orientation and default render mode.
 * @class
 */
@autobind
class Model3dSettings extends Box3DControls {
    /**
     * Creates UI panel for Metadata saving and modification
     * @constructor
     * @param {HTMLElement} containerEl the container element
     * @returns {Model3dControls} Model3dControls instance
     */
    constructor(containerEl) {
        super(containerEl);

        this.currentAxis = AXIS_Y;
        this.currentDefaultRenderMode = RENDER_MODE_LIT;
        this.defaultRenderMode = RENDER_MODE_LIT;

        this.currentProjection = CAMERA_PROJECTION_PERSPECTIVE;
        this.defaultProjection = CAMERA_PROJECTION_PERSPECTIVE;

        this.orientationXButton = null;
        this.orientationYButton = null;
        this.orientationZButton = null;
        this.renderModeEl = null;
        this.projectionModeEl = null;
    }

    /**
     * @inheritdoc
     */
    addUi() {
        // container
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.classList.add(CSS_CLASS_OVERLAY, CSS_CLASS_SETTINGS_WRAPPER);
        this.registerUiItem('settings_container_wrapper', this.wrapperEl);
        this.el.appendChild(this.wrapperEl);

        // The cog and clickable container
        this.settingsButtonEl = this.createSettingsWidgetButton('box-preview-icon-cog', 'settings_cog',
            () => {
                this.handleToggleSettingsPanel();
                this.handleSettingsClick();
            });

        this.wrapperEl.appendChild(this.settingsButtonEl);

        // Settings panel
        this.settingsPanelEl = document.createElement('div');
        this.settingsPanelEl.classList.add(CSS_CLASS_OVERLAY, 'box-preview-pullup',
            CSS_CLASS_SETTINGS_PANEL, CSS_CLASS_HIDDEN);
        this.registerUiItem('settings_panel', this.settingsPanelEl);
        this.settingsButtonEl.appendChild(this.settingsPanelEl);

        const renderPanelRowEl = this.createSettingsDropdown('Default Render Mode',
            'Lit', RENDER_MODES);
        this.renderModeEl = renderPanelRowEl.querySelector(`span.${CSS_CLASS_SETTINGS_PANEL_SELECTOR_LABEL}`);
        this.settingsPanelEl.appendChild(renderPanelRowEl);

        const projectionPanelRowEl = this.createSettingsDropdown('Default Projection',
            'Perspective', PROJECTION_MODES);
        this.projectionModeEl = projectionPanelRowEl.querySelector(`span.${CSS_CLASS_SETTINGS_PANEL_SELECTOR_LABEL}`);
        this.settingsPanelEl.appendChild(projectionPanelRowEl);

        // Rotation Axis buttons
        const rotationAxisRowEl = this.createAxisWidget();
        this.settingsPanelEl.appendChild(rotationAxisRowEl);

        // Save and reset buttons
        // #TODO @jholdstock: disable save and revert buttons if not an editor
        const saveButtonsPanelRowEl = this.createSaveButtons();
        this.settingsPanelEl.appendChild(saveButtonsPanelRowEl);

        // Add event for hiding UI if anything but the panel is selected
        this.addListener(EVENT_CLOSE_SETTINGS_UI, this.handleHideUi);

        this.handleSelectOrientationY();
    }

    /**
     * Create a button that goes in the settings widget, on the bottom right of the screen
     * @param {String} iconClass The CSS class to use for the icon in the clickable element
     * @param {String} buttonUid A unique id for the element, for registering events
     * @param {Function} clickCallback The function to call on click of the icon
     * @returns {HtmlElement} A button formatted for use in the settings widget
     */
    createSettingsWidgetButton(iconClass, buttonUid, clickCallback) {
        const widgetButtonEl = document.createElement('div');
        widgetButtonEl.classList.add(CSS_CLASS_SETTINGS_BUTTON);

        const icon = document.createElement('span');
        icon.classList.add(iconClass);
        this.registerUiItem(buttonUid, icon, 'click', clickCallback);
        widgetButtonEl.appendChild(icon);

        return widgetButtonEl;
    }

    /**
     * Create the axis widget
     * @returns {HtmlElement} The newly created axis widget
     */
    createAxisWidget() {
        const axisRowEl = this.createSettingsRow('Rotation Axis');

        const leftArrowEl = this.createOrientationArrow('left', this.handleRotateNegative);
        leftArrowEl.classList.add('box-preview-orientation-prev');
        axisRowEl.appendChild(leftArrowEl);

        const axisButtonsEl = document.createElement('ul');
        axisButtonsEl.classList.add('box-preview-orientation-selector', CSS_CLASS_SETTINGS_PANEL_BUTTON);

        const xAxisEl = this.createOrientationAxis('x', this.handleSelectOrientationX);
        this.orientationXButton = xAxisEl;
        axisButtonsEl.appendChild(xAxisEl);

        const yAxisEl = this.createOrientationAxis('y', this.handleSelectOrientationY);
        this.orientationYButton = yAxisEl;
        axisButtonsEl.appendChild(yAxisEl);

        const zAxisEl = this.createOrientationAxis('z', this.handleSelectOrientationZ);
        this.orientationZButton = zAxisEl;
        axisButtonsEl.appendChild(zAxisEl);

        axisRowEl.appendChild(axisButtonsEl);

        const rightArrowEl = this.createOrientationArrow('right', this.handleRotatePositive);
        rightArrowEl.classList.add('box-preview-orientation-next');
        axisRowEl.appendChild(rightArrowEl);

        return axisRowEl;
    }

    /**
     * Create a row of save buttons
     * @returns {HtmlElement} A row elment with save/revert buttons
     */
    createSaveButtons() {
        const saveButtonRowEl = this.createSettingsRow();

        const saveButtonEl = this.createSettingsButton('Save', this.saveSceneDefaults);
        saveButtonEl.classList.add('box-preview-settings-save-btn');
        saveButtonRowEl.appendChild(saveButtonEl);

        const resetButtonEl = this.createSettingsButton('Reset', this.resetSceneDefaults);
        saveButtonRowEl.appendChild(resetButtonEl);

        return saveButtonRowEl;
    }

    /**
     * Create a button for the settings panel
     * @param {string} text The text for the button
     * @param {function} callback The function to call on click
     * @returns {HtmlElement} The newly created button
     */
    createSettingsButton(text = '', callback) {
        const button = document.createElement('button');
        button.textContent = text;
        button.classList.add(CSS_CLASS_SETTINGS_PANEL_BUTTON);
        this.registerUiItem(`settings-button-${text}`, button, 'click', callback);
        return button;
    }

    /**
     * Create a settings panel row label
     * @param {string} text The text to put in the label
     * @returns {HtmlElement} The newly create label
     */
    createSettingsLabel(text = '') {
        const label = document.createElement('div');
        label.classList.add(CSS_CLASS_SETTINGS_PANEL_LABEL);
        label.textContent = text;
        return label;
    }

    /**
     * Create an element with a label, as a settings-panel-row
     * @param {string} [labelText] The text to display as the row label
     * @param {HtmlElement} [content] An HtmlElement to append to the row
     * @returns {HtmlElement} The row element created
     */
    createSettingsRow(labelText) {
        const panelRowEl = document.createElement('div');
        panelRowEl.classList.add(CSS_CLASS_SETTINGS_PANEL_ROW);

        if (labelText) {
            const rowLabel = this.createSettingsLabel(labelText);
            panelRowEl.appendChild(rowLabel);
        }

        return panelRowEl;
    }

    /**
     * Create a dropdown for the settings panel,
     * @param {[type]} defaultText [description]
     * @returns {HtmlElement} The settings dropdown that can be added to the settings panel
     */
    createSettingsDropdown(labelText = '', listText = '', listContent = []) {
        const wrapperEl = this.createSettingsRow(labelText);

        const dropdownWrapperEl = document.createElement('div');
        dropdownWrapperEl.classList.add(CSS_CLASS_DEFAULT_SETTING_SELECTOR);
        wrapperEl.appendChild(dropdownWrapperEl);

        const listLabelEl = document.createElement('span');
        listLabelEl.textContent = listText;
        listLabelEl.classList.add(CSS_CLASS_SETTINGS_PANEL_SELECTOR_LABEL, CSS_CLASS_SETTINGS_PANEL_BUTTON);
        dropdownWrapperEl.appendChild(listLabelEl);

        const dropdownEl = document.createElement('ul');
        dropdownEl.classList.add(CSS_CLASS_HIDDEN);
        dropdownWrapperEl.appendChild(dropdownEl);

        let i = 0;
        const length = listContent.length;

        for (i; i < length; ++i) {
            const text = listContent[i].text || '';
            const listItemEl = document.createElement('li');
            listItemEl.textContent = text;

            const labelId = `${labelText}-ul-li-${text}`;
            this.registerUiItem(labelId, listItemEl, 'click', () => {
                listLabelEl.textContent = text;
            });

            let callback = listContent[i].callback;
            // Callbacks come as a string OR a function
            if (callback) {
                if (typeof callback === 'string' && this[callback]) {
                    callback = this[callback].bind(this, ...listContent[i].args);
                }
                this.registerUiItem(labelId, listItemEl, 'click', callback);
            }

            dropdownEl.appendChild(listItemEl);
        }

        function onListClick() {
            // close all currently open lists, but not ours
            this.closeDropdowns(dropdownEl);
            // and open ours
            dropdownEl.classList.toggle(CSS_CLASS_HIDDEN);
        }

        this.registerUiItem(`${labelText}_${listText}`, dropdownWrapperEl, 'click', onListClick.bind(this));

        return wrapperEl;
    }

    /**
     * Create an axis orientation button
     * @param {string}  [axisLabel] = '' The text to put in the button
     * @param {function} [callback] The function to call on click
     * @returns {HtmlElement} The newly created axis button
     */
    createOrientationAxis(axisLabel = '', callback) {
        const axisEl = document.createElement('li');
        axisEl.textContent = axisLabel.toUpperCase();
        this.registerUiItem(`axis-item-li-${axisLabel}`, axisEl, 'click', callback);
        return axisEl;
    }

    /**
     * Create an arrow button for orientation controls
     * @param {string} direction The class specific arrow direction. IE: left, right, down
     * @param {function} [callback] The callback to call on clicking the arrow
     * @returns {HtmlElement} Teh newly created arrow button
     */
    createOrientationArrow(direction, callback) {
        const arrowWrapperEl = document.createElement('div');
        arrowWrapperEl.classList.add('box-preview-orientation-controls');
        const arrowEl = document.createElement('span');
        arrowEl.classList.add(`box-preview-icon-setting-arrow-${direction}`);
        arrowWrapperEl.appendChild(arrowEl);
        this.registerUiItem(`box-preview-settings-arrow-${direction}`, arrowWrapperEl, 'click', callback);
        return arrowWrapperEl;
    }

    /**
     * Called on preview destroy
     * @returns {void}
     */
    destroy() {
        super.destroy();
    }

    /**
     * Closes all lists in the settings panel
     * @param {HtmlElement} [exceptionEl] If provided, don't close this element
     * @returns {void}
     */
    closeDropdowns(exceptionEl) {
        const dropdownEls = this.settingsPanelEl.querySelectorAll(`div.${CSS_CLASS_DEFAULT_SETTING_SELECTOR} ul`);
        Object.keys(dropdownEls).forEach((nodeKey) => {
            const node = dropdownEls[nodeKey];
            if (node === exceptionEl) {
                return;
            }
            node.classList.add(CSS_CLASS_HIDDEN);
        });
    }

    /**
     * Rotate positively on the currently selected axis
     * @returns {void}
     */
    handleRotatePositive() {
        this.rotateOnCurrentAxis(1);
    }

    /**
     * Rotate negatively on the currently selected axis
     * @returns {void}
     */
    handleRotateNegative() {
        this.rotateOnCurrentAxis(-1);
    }

    /**
     * Sets X as the current axis
     * @returns {void}
     */
    handleSelectOrientationX() {
        this.setCurrentRotationAxis(AXIS_X, this.orientationXButton);
    }

    /**
     * Sets Y as the current axis
     * @returns {void}
     */
    handleSelectOrientationY() {
        this.setCurrentRotationAxis(AXIS_Y, this.orientationYButton);
    }

    /**
     * Sets Z as the current axis
     * @returns {void}
     */
    handleSelectOrientationZ() {
        this.setCurrentRotationAxis(AXIS_Z, this.orientationZButton);
    }

    /**
     * Toggles visibility of settings panel
     * @returns {void}
     */
    handleToggleSettingsPanel() {
        this.settingsPanelEl.classList.toggle(CSS_CLASS_HIDDEN);
    }

    /**
     * Close the settings panel
     * @returns {void}
     */
    handleHideUi() {
        this.closeDropdowns();
        this.settingsPanelEl.classList.add(CSS_CLASS_HIDDEN);
    }

    /**
     * Handle the settings panel being clicked
     * @returns {void}
     */
    handleSettingsClick() {
        this.emit(EVENT_CLOSE_RENDER_MODE_UI);
    }

    /**
     * Set the axis in which we will rotate the model
     * @param {string} axisKey The axis to set for current rotation
     * @param {element} el The element to set as the active axis
     * @returns {void}
     */
    setCurrentRotationAxis(axisKey, el) {
        if (this.currentAxisEl) {
            this.currentAxisEl.classList.remove(CSS_CLASS_CURRENT_AXIS);
        }
        el.classList.add(CSS_CLASS_CURRENT_AXIS);
        this.currentAxis = axisKey;
        this.currentAxisEl = el;
    }

    /**
     * Trigger an event to save scene defaults
     * @returns {void}
     */
    saveSceneDefaults() {
        // Only send render scene, as axes will be retrieved from B3D component
        this.setDefaultRenderMode(this.currentDefaultRenderMode);
        this.handleDefaultRenderModeSelected(this.currentDefaultRenderMode);
        this.setDefaultProjection(this.currentProjection);
        this.handleCameraProjectionSelected(this.currentProjection);
        this.emit(EVENT_SAVE_SCENE_DEFAULTS, this.defaultRenderMode, this.defaultProjection);
    }

    /**
     * Reset scene defaults and ui
     * @returns {void}
     */
    resetSceneDefaults() {
        this.setDefaultRenderMode(this.defaultRenderMode);
        this.handleDefaultRenderModeSelected(this.defaultRenderMode);
        this.setDefaultProjection(this.defaultProjection);
        this.handleCameraProjectionSelected(this.defaultProjection);
        // projection reset
        this.emit(EVENT_RESET_SCENE_DEFAULTS);
    }

    /**
     * Set the default render mode
     * @param {string} mode The name of the render mode
     * @returns {void}
     */
    setDefaultRenderMode(mode) {
        this.defaultRenderMode = this.currentDefaultRenderMode = mode;
        this.setRenderText(mode);
    }

    /**
     * Set the default projection mode
     * @param {String} projection Type of projection to use
     * @returns {void}
     */
    setDefaultProjection(projection) {
        this.defaultProjection = this.currentProjection = projection;
        this.setProjectionText(projection);
    }

    /**
     * Given a direction, rotate around the setting set axis
     * @param {Int} direction The direction to spin around and axis
     * @returns {void}
     */
    rotateOnCurrentAxis(direction) {
        const axis = {};
        axis[this.currentAxis] = direction * ROTATION_STEP;

        this.emit(EVENT_ROTATE_ON_AXIS, axis);
    }

    /**
     * Set the render mode element text
     * @param {String} text The text to fill the render label with
     * @returns {void}
     */
    setRenderText(text) {
        this.renderModeEl.textContent = text;
    }

    /**
     * Set the projection element text
     * @param {String} text The text to fill the projection label with
     * @returns {void}
     */
    setProjectionText(text) {
        this.projectionModeEl.textContent = text;
    }

    /**
     * Handle choosing a default render mode
     * @param {String} mode The mode to select
     * @returns {void}
     */
    handleDefaultRenderModeSelected(mode) {
        this.currentDefaultRenderMode = mode;
        this.setRenderText(mode);
        this.emit(EVENT_SET_RENDER_MODE, mode);
    }

    /**
     * Handle setting camera projection
     * @param {string} projection Projection type to switch to
     * @returns {void}
     */
    handleCameraProjectionSelected(projection) {
        this.currentProjection = projection;
        this.setProjectionText(projection);
        this.emit(EVENT_SET_CAMERA_PROJECTION, projection);
    }

    handleSettingSelectSave() {
        this.handleToggleSettingsPanel();
        this.saveSceneDefaults();
    }

    handleSettingSelectReset() {
        this.resetSceneDefaults();
    }
}

export default Model3dSettings;
