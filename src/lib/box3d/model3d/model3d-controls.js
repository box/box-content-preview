import Box3DControls from '../box3d-controls';
import Model3DRenderModePullup from './model3d-render-mode-pullup';
import Model3DSettingsPullup from './model3d-settings-pullup';
import autobind from 'autobind-decorator';
import {
    EVENT_CLOSE_UI,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SAVE_SCENE_DEFAULTS,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_RENDER_MODE
} from './model3d-constants';

import {
    ICON_GEAR,
    ICON_3D_RENDER_MODES,
    ICON_3D_RESET
} from '../../icons/icons';

const DEFAULT_RENDER_MODE = 'Lit';

/**
 * Model3dControls
 * This class handles the UI for 3d preview controls. This includes Reset,
 * Render Mode selection, VR and fullscreen buttons.
 * @class
 */
@autobind
class Model3dControls extends Box3DControls {
    /**
     * Creates UI and Handles events for 3D Model Preview
     * @constructor
     * @inheritdoc
     * @returns {Model3dControls} Model3dControls instance
     */
    constructor(containerEl) {
        super(containerEl);
        this.renderModesSelectorEl = null;
        this.settingsPanelEl = null;
        this.renderModePullup = new Model3DRenderModePullup();
        this.settingsPullup = new Model3DSettingsPullup();
    }

    /**
     * @inheritdoc
     * @param {bool} showSaveButton Whether or not we allow the user to attempt saving to metadata
     */
    addUi(showSaveButton = false) {
        this.addListener(EVENT_CLOSE_UI, this.handleCloseUi);

        this.renderModesSelectorEl = this.renderModePullup.pullupEl;
        this.renderModePullup.addListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);

        if (!showSaveButton) {
            this.settingsPullup.hideSaveButton();
        }
        this.settingsPanelEl = this.settingsPullup.pullupEl;
        this.settingsPullup.addListener(EVENT_SET_RENDER_MODE, this.handleSettingsSetRenderMode);
        this.settingsPullup.addListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
        this.settingsPullup.addListener(EVENT_ROTATE_ON_AXIS, this.handleAxisRotation);
        this.settingsPullup.addListener(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);

        this.resetButtonEl = this.controls.add(__('box3d_reset_camera'), this.handleReset, '', ICON_3D_RESET);

        this.addVRButton();
        this.hideVrButton();

        const renderModesEl = this.controls.add(__('box3d_render_modes'), this.handleToggleRenderModes, '', ICON_3D_RENDER_MODES);
        renderModesEl.parentElement.appendChild(this.renderModesSelectorEl);

        this.settingsButtonEl = this.controls.add(__('box3d_settings'), this.handleToggleSettings, '', ICON_GEAR);
        this.settingsButtonEl.parentElement.appendChild(this.settingsPanelEl);

        this.addFullscreenButton();

        this.setCurrentRenderMode(DEFAULT_RENDER_MODE);
    }

    /**
     * Handle toggle rendermodes ui event
     * @returns {void}
     */
    handleToggleRenderModes() {
        this.setElementVisibility(this.settingsPanelEl, false);
        this.toggleElementVisibility(this.renderModesSelectorEl);
    }

    /**
     * Handle toggle Settings ui event
     * @returns {void}
     */
    handleToggleSettings() {
        this.setElementVisibility(this.renderModesSelectorEl, false);
        this.toggleElementVisibility(this.settingsPanelEl);
    }

    /**
     * Handle a change of render mode, from the render mode panel
     * @param {string} renderMode The render mode name to notify listeners of
     * @returns {void}
     */
    handleSetRenderMode(renderMode) {
        this.emit(EVENT_SET_RENDER_MODE, renderMode);
        this.settingsPullup.setCurrentRenderMode(renderMode);
    }

    /**
     * Handle change of camera projection
     * @param {string} mode The projection mode to use
     * @returns {void}
     */
    handleSetCameraProjection(mode) {
        this.emit(EVENT_SET_CAMERA_PROJECTION, mode);
    }

    /**
     * Handle rotation on axis
     * @param {Object} rotation Rotation axis description with axis and amount (in degrees)
     * @returns {void}
     */
    handleAxisRotation(rotation) {
        this.emit(EVENT_ROTATE_ON_AXIS, rotation);
    }

    /**
     * Handle settings render mode set event
     * @param {string} mode The render mode to use
     * @returns {void}
     */
    handleSettingsSetRenderMode(mode) {
        this.handleSetRenderMode(mode);
        this.setCurrentRenderMode(mode);
    }

    /**
     * Close the render mode ui
     * @returns {void}
     */
    handleCloseUi() {
        this.setElementVisibility(this.renderModesSelectorEl, false);
        this.setElementVisibility(this.settingsPanelEl, false);
    }

    /**
     * @inheritdoc
     */
    handleReset() {
        super.handleReset();
        this.handleCloseUi();
    }

    /**
     * Handle a save event
     * @param {string} renderMode     The render mode to save
     * @param {string} projectionMode The projection mode to save
     * @returns {void}
     */
    handleSceneSave(renderMode, projectionMode) {
        this.emit(EVENT_SAVE_SCENE_DEFAULTS, renderMode, projectionMode);
    }

    /**
     * @inheritdoc
     */
    handleToggleFullscreen() {
        super.handleToggleFullscreen();
        this.handleCloseUi();
    }

    /**
     * Set the current render mode being used by the render mode pullup
     * @param {string} renderMode The render mode to set on the pullup
     * @returns {void}
     */
    setCurrentRenderMode(renderMode) {
        this.renderModePullup.setRenderMode(renderMode);
    }

    /**
     * Set the current projection mode being used by the settings pullup
     * @param {string} renderMode The projection mode to set on the pullup
     * @returns {void}
     */
    setCurrentProjectionMode(mode) {
        this.settingsPullup.onProjectionSelected(mode);
        this.settingsPullup.setCurrentProjectionMode(mode);
    }

    /**
     * Set a the render mode, from a key in the Render Modes dictionary
     * @param {string} modeIcon The key in the RENDER_MODES dictionary to use to
     * get the icon class that we'll change the render mode button to
     * @returns {void}
     */
    setRenderModeIcon(modeIcon) {
        const icon = this.renderModeControl.querySelector('span');
        icon.className = modeIcon;
    }

    /**
     * @inheritdoc
     */
    destroy() {
        if (this.controls) {
            this.controls.controlsEl.removeEventListener('click', this.handleControlsClick);
        }

        this.removeListener(EVENT_CLOSE_UI, this.handleCloseUi);

        this.renderModePullup.removeListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
        this.renderModePullup.destroy();

        this.settingsPullup.removeListener(EVENT_SET_RENDER_MODE, this.handleSettingsSetRenderMode);
        this.settingsPullup.removeListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
        this.settingsPullup.removeListener(EVENT_ROTATE_ON_AXIS, this.handleAxisRotation);
        this.settingsPullup.removeListener(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);
        this.settingsPullup.destroy();

        super.destroy();
    }
}

export default Model3dControls;
