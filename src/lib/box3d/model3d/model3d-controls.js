import Box3DControls from '../box3d-controls';
import Model3DSettingsPullup from './model3d-settings-pullup';
import autobind from 'autobind-decorator';
import {
    EVENT_CLOSE_UI,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SAVE_SCENE_DEFAULTS,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SET_RENDER_MODE,
    EVENT_TOGGLE_HELPERS,
    RENDER_MODE_LIT
} from './model3d-constants';

import {
    ICON_GEAR,
    ICON_3D_RESET
} from '../../icons/icons';

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
        this.settingsPanelEl = null;
        this.settingsPullup = new Model3DSettingsPullup();
    }

    /**
     * @inheritdoc
     * @param {bool} showSaveButton Whether or not we allow the user to attempt saving to metadata
     */
    addUi(showSaveButton = false) {
        this.addListener(EVENT_CLOSE_UI, this.handleCloseUi);

        if (!showSaveButton) {
            this.settingsPullup.hideSaveButton();
        }
        this.settingsPanelEl = this.settingsPullup.pullupEl;
        this.settingsPullup.addListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
        this.settingsPullup.addListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
        this.settingsPullup.addListener(EVENT_ROTATE_ON_AXIS, this.handleAxisRotation);
        this.settingsPullup.addListener(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);

        this.resetButtonEl = this.controls.add(__('box3d_reset_camera'), this.handleReset, '', ICON_3D_RESET);

        this.addVRButton();
        this.hideVrButton();

        this.settingsButtonEl = this.controls.add(__('box3d_settings'), this.handleToggleSettings, '', ICON_GEAR);
        this.settingsButtonEl.parentElement.appendChild(this.settingsPanelEl);

        this.addFullscreenButton();

        this.handleSetRenderMode(RENDER_MODE_LIT);
    }

    /**
     * Handle toggle rendermodes ui event
     * @returns {void}
     */
    handleToggleRenderModes() {
        this.setElementVisibility(this.settingsPanelEl, false);
    }

    /**
     * Handle toggle Settings ui event
     * @returns {void}
     */
    handleToggleSettings() {
        this.emit(EVENT_TOGGLE_HELPERS);
        this.toggleElementVisibility(this.settingsPanelEl);
    }

    /**
     * Handle a change of render mode, from the settings panel
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
     * Close the render mode ui
     * @returns {void}
     */
    handleCloseUi() {
        this.emit(EVENT_TOGGLE_HELPERS, false);
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
     * Set the current projection mode being used by the settings pullup
     * @param {string} renderMode The projection mode to set on the pullup
     * @returns {void}
     */
    setCurrentProjectionMode(mode) {
        this.settingsPullup.onProjectionSelected(mode);
        this.settingsPullup.setCurrentProjectionMode(mode);
    }

    /**
     * @inheritdoc
     */
    destroy() {
        if (this.controls) {
            this.controls.controlsEl.removeEventListener('click', this.handleControlsClick);
        }

        this.removeListener(EVENT_CLOSE_UI, this.handleCloseUi);

        this.settingsPullup.removeListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
        this.settingsPullup.removeListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
        this.settingsPullup.removeListener(EVENT_ROTATE_ON_AXIS, this.handleAxisRotation);
        this.settingsPullup.removeListener(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);
        this.settingsPullup.destroy();
        this.settingsPanelEl = null;
        this.settingsPullup = null;

        super.destroy();
    }
}

export default Model3dControls;
