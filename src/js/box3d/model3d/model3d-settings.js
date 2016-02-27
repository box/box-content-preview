'use strict';

import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import settingsTemplate from 'raw!./settings.html';
import {
    EVENT_CLOSE_RENDER_MODE_UI,
    EVENT_CLOSE_SETTINGS_UI,
    EVENT_RESET_SCENE_DEFAULTS,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SAVE_SCENE_DEFAULTS
} from './model3d-constants';
import { insertTemplate } from '../../util';

const AXIS_X = 'x';
const AXIS_Y = 'y';
const AXIS_Z = 'z';
const CSS_CLASS_HIDDEN = 'box-preview-is-hidden';
const CSS_CLASS_CURRENT_AXIS = 'box-preview-current-axis';
const RENDER_MODE_LIT = 'Lit';
const RENDER_MODE_UNLIT = 'Unlit';
const RENDER_MODE_NORMALS = 'Normals';
const RENDER_MODE_WIRE = 'Wireframe';
const RENDER_MODE_UNTEXTURED_WIRE = 'Untextured Wireframe';
const RENDER_MODE_UV = 'UV Overlay';
const ROTATION_STEP = 90;

/**
 * Model3dSettings
 * This class handles the UI for the 3D model settings. This includes editing of
 * metadata values for orientation and default render mode.
 * @class
 */
@autobind
class Model3dSettings extends EventEmitter  {
    /**
     * Creates UI panel for Metadata saving and modification
     * @constructor
     * @param {HTMLElement} containerEl the container element
     * @returns {Model3dControls} Model3dControls instance
     */
    constructor(containerEl) {
        super();

        this.containerEl = containerEl;

        const template = settingsTemplate.replace(/\>\s*\</g, '><'); // removing new lines
        insertTemplate(this.containerEl, template);

        this.currentAxis = AXIS_Y;
        this.currentDefaultRenderMode = RENDER_MODE_LIT;
        this.defaultRenderMode = RENDER_MODE_LIT;

        this.el = this.containerEl.querySelector('.box-preview-settings-wrapper');
        this.settingsButtonEl = this.el.querySelector('.box-preview-icon-cog');
        this.settingsPanelEl = this.el.querySelector('.box-preview-settings-panel');
        this.orientationXButton = this.el.querySelector('.box-preview-orientation-x');
        this.orientationYButton = this.el.querySelector('.box-preview-orientation-y');
        this.orientationZButton = this.el.querySelector('.box-preview-orientation-z');
        this.currentAxisEl = this.el.querySelector('.' + CSS_CLASS_CURRENT_AXIS);
        this.rotateNegativeButtonEl = this.el.querySelector('.box-preview-icon-setting-arrow-left');
        this.rotatePositiveButtonEl = this.el.querySelector('.box-preview-icon-setting-arrow-right');
        // Default render modes
        this.renderModeDefaultEl = this.el.querySelector('.box-preview-render-mode-selected');
        this.renderModeDefaultListEl = this.el.querySelector('.box-preview-render-mode-list');
        this.renderModeDefaultLit = this.el.querySelector('.box-preview-render-mode-lit');
        this.renderModeDefaultUnlit = this.el.querySelector('.box-preview-render-mode-unlit');
        this.renderModeDefaultNormals = this.el.querySelector('.box-preview-render-mode-normals');
        this.renderModeDefaultWireframe = this.el.querySelector('.box-preview-render-mode-wire');
        this.renderModeDefaultUntexturedWireframe = this.el.querySelector('.box-preview-render-mode-wire-untextured');
        this.renderModeDefaultUVOverlay = this.el.querySelector('.box-preview-render-mode-uv');
        // Save and Reset buttons
        this.saveSettingsEl = this.el.querySelector('.box-preview-settings-save-btn');
        this.resetSettingsEl = this.el.querySelector('.box-preview-settings-reset-btn');

        this.attachEventHandlers();
    }

    /**
     * Called on preview destroy
     * @returns {void}
     */
    destroy() {
        this.detachEventHandlers();
    }

    /**
     * Attaches event handlers
     * @returns {void}
     */
    attachEventHandlers() {
        this.orientationXButton.addEventListener('click', this.handleSelectOrientationX);
        this.orientationYButton.addEventListener('click', this.handleSelectOrientationY);
        this.orientationZButton.addEventListener('click', this.handleSelectOrientationZ);
        this.rotateNegativeButtonEl.addEventListener('click', this.handleRotateNegative);
        this.rotatePositiveButtonEl.addEventListener('click', this.handleRotatePositive);
        this.settingsButtonEl.addEventListener('click', this.handleToggleSettingsPanel);
        //Default render modes
        this.renderModeDefaultEl.addEventListener('click', this.handleToggleDefaultRenderMode);
        this.renderModeDefaultListEl.addEventListener('click', this.handleHideDefaultRenderMode);
        this.renderModeDefaultLit.addEventListener('click', this.handleSelectDefaultModeLit);
        this.renderModeDefaultUnlit.addEventListener('click', this.handleSelectDefaultModeUnlit);
        this.renderModeDefaultNormals.addEventListener('click', this.handleSelectDefaultModeNormals);
        this.renderModeDefaultWireframe.addEventListener('click', this.handleSelectDefaultModeWire);
        this.renderModeDefaultUntexturedWireframe.addEventListener('click', this.handleSelectDefaultModeUntexturedWire);
        this.renderModeDefaultUVOverlay.addEventListener('click', this.handleSelectDefaultModeUV);
        // Save and Reset buttons
        this.saveSettingsEl.addEventListener('click', this.handleSettingSelectSave);
        this.resetSettingsEl.addEventListener('click', this.handleSettingSelectReset);

        this.addListener(EVENT_CLOSE_SETTINGS_UI, this.handleHideUi);
        this.el.addEventListener('click', this.handleSettingsClick);
    }

    /**
     * Detaches event handlers
     * @returns {void}
     */
    detachEventHandlers() {
        this.orientationXButton.removeEventListener('click', this.handleSelectOrientationX);
        this.orientationYButton.removeEventListener('click', this.handleSelectOrientationY);
        this.orientationZButton.removeEventListener('click', this.handleSelectOrientationZ);
        this.rotateNegativeButtonEl.removeEventListener('click', this.handleRotateNegative);
        this.rotatePositiveButtonEl.removeEventListener('click', this.handleRotatePositive);
        this.settingsButtonEl.removeEventListener('click', this.handleToggleSettingsPanel);
        //Default render modes
        this.renderModeDefaultEl.removeEventListener('click', this.handleToggleDefaultRenderMode);
        this.renderModeDefaultListEl.removeEventListener('click', this.handleHideDefaultRenderMode);
        this.renderModeDefaultLit.removeEventListener('click', this.handleSelectDefaultModeLit);
        this.renderModeDefaultUnlit.removeEventListener('click', this.handleSelectDefaultModeUnlit);
        this.renderModeDefaultNormals.removeEventListener('click', this.handleSelectDefaultModeNormals);
        this.renderModeDefaultWireframe.removeEventListener('click', this.handleSelectDefaultModeWire);
        this.renderModeDefaultUntexturedWireframe.removeEventListener('click', this.handleSelectDefaultModeUntexturedWire);
        this.renderModeDefaultUVOverlay.removeEventListener('click', this.handleSelectDefaultModeUV);
        // Save and Reset Buttons
        this.saveSettingsEl.addEventListener('click', this.handleSettingSelectSave);
        this.resetSettingsEl.addEventListener('click', this.handleSettingSelectReset);

        this.removeListener(EVENT_CLOSE_SETTINGS_UI, this.handleHideUi);
        this.el.removeEventListener('click', this.handleSettingsClick);
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
        this.currentAxisEl.classList.remove(CSS_CLASS_CURRENT_AXIS);
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

        this.emit(EVENT_SAVE_SCENE_DEFAULTS, this.defaultRenderMode);
    }

    /**
     * Reset scene defaults and ui
     * @returns {void}
     */
    resetSceneDefaults() {
        this.handleDefaultRenderModeSelected(this.defaultRenderMode);
        this.emit(EVENT_RESET_SCENE_DEFAULTS);
    }

    /**
     * Set the default render mode
     * @param {string} mode The name of the render mode
     * @returns {void}
     */
    setDefaultRenderMode(mode) {
        this.defaultRenderMode = mode;
        this.handleDefaultRenderModeSelected(mode);
    }

    /**
     * Given a direction, rotate around the setting set axis
     * @param {int} direction The direction to spin around and axis
     * @returns {void}
     */
    rotateOnCurrentAxis(direction) {
        const axis = {};
        axis[this.currentAxis] = direction * ROTATION_STEP;

        this.emit(EVENT_ROTATE_ON_AXIS, axis);
    }

    /**
     * Handle toggle default render mode list event
     * @returns {void}
     */
    handleToggleDefaultRenderMode() {
        this.renderModeDefaultListEl.classList.toggle(CSS_CLASS_HIDDEN);
    }

    /**
     * Handle hide default render mode list event
     * @returns {void}
     */
    handleHideDefaultRenderMode() {
        this.renderModeDefaultListEl.classList.add(CSS_CLASS_HIDDEN);
    }

    /**
     * Handle choosing a default render mode
     * @param {string} mode The mode to select
     * @returns {void}
     */
    handleDefaultRenderModeSelected(mode) {
        // close the menu, first
        this.handleHideDefaultRenderMode();
        this.renderModeDefaultEl.textContent = mode;
        this.currentDefaultRenderMode = mode;
    }

    handleSelectDefaultModeLit() {
        this.handleDefaultRenderModeSelected(RENDER_MODE_LIT);
    }

    handleSelectDefaultModeUnlit() {
        this.handleDefaultRenderModeSelected(RENDER_MODE_UNLIT);
    }

    handleSelectDefaultModeNormals() {
        this.handleDefaultRenderModeSelected(RENDER_MODE_NORMALS);
    }

    handleSelectDefaultModeWire() {
        this.handleDefaultRenderModeSelected(RENDER_MODE_WIRE);
    }

    handleSelectDefaultModeUntexturedWire() {
        this.handleDefaultRenderModeSelected(RENDER_MODE_UNTEXTURED_WIRE);
    }

    handleSelectDefaultModeUV() {
        this.handleDefaultRenderModeSelected(RENDER_MODE_UV);
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
