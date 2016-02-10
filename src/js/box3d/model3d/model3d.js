'use strict';

import '../../../css/model3d/model3d.css';
import autobind from 'autobind-decorator';
import Box3D from '../box3d';
import Model3dControls from './model3d-controls';
import Model3dSettings from './model3d-settings';
import Model3dRenderer from './model3d-renderer';
import {
    EVENT_MISSING_ASSET,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SAVE_SCENE_DEFAULTS,
    EVENT_METADATA_UPDATE_SUCCESS,
    EVENT_METADATA_UPDATE_FAILURE,
    EVENT_RESET_SCENE_DEFAULTS
} from './model3d-constants';

let Box = global.Box || {};

const MISSING_MAX = 4;

/**
 * Model3d
 * This is the entry point for the model3d preview.
 * @class
 */
@autobind
class Model3d extends Box3D {
    /**
     * Ties together rendering, settings, and controls modules
     * @constructor
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {Model3d} the Model3d object instance
     */
    constructor(container, options) {
        super(container, options);

        this.missingAssets = null;
        this.loadTimeout = 100000;
        this.instances = [];
        this.assets = [];
        this.axes = {
            up: null,
            forward: null
        };
    }

    /**
    * @inheritdoc
     */
    createSubModules() {
        if (this.options.ui !== false) {
            this.controls = new Model3dControls(this.wrapperEl);
        }
        this.settings = new Model3dSettings(this.wrapperEl);
        this.renderer = new Model3dRenderer(this.wrapperEl, this.boxSdk);
    }

    /**
     * @inheritdoc
     */
    attachEventHandlers() {
        super.attachEventHandlers();

        if (this.controls) {
            this.controls.on(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
            this.controls.on(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
        }
        this.renderer.on(EVENT_MISSING_ASSET, this.handleMissingAsset);
        this.settings.on(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
        this.settings.on(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);
        this.settings.on(EVENT_RESET_SCENE_DEFAULTS, this.handleSceneReset);
    }

    /**
     * @inheritdoc
     */
    detachEventHandlers() {
        super.detachEventHandlers();

        if (this.controls) {
            this.controls.removeListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
            this.controls.removeListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
        }
        this.renderer.removeListener(EVENT_MISSING_ASSET, this.handleMissingAsset);
        this.settings.removeListener(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
        this.settings.removeListener(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);
        this.settings.removeListener(EVENT_RESET_SCENE_DEFAULTS, this.handleSceneReset);
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();

        if (this.missingAssets) {
            this.missingAssets.length = 0;
        }

        this.settings.destroy();
    }

    /**
     * Build up the list of missing assets
     * @param {Object} data The error response for missing assets, contains the name and path of the asset
     * @returns {void}
     */
    @autobind
    handleMissingAsset(data) {
        this.missingAssets = this.missingAssets || [];

        //only store MISSING_MAX missing assets
        if (Object.keys(this.missingAssets).length >= MISSING_MAX) {
            return;
        }

        //storing in a dictionary due to progressive texture loading using the same name for different resolutions
        const key = data.fileName || data.assetName;
        this.missingAssets[key] = this.missingAssets[key] || data;
    }

    /**
     * Handle model rotation event
     * @param  {Object}  axis An object describing the axis to rotate on
     * @returns {void}
     */
    @autobind
    handleRotateOnAxis(axis) {
        this.renderer.rotateOnAxis(axis);
    }

    /**
     * Handle hard set of axes
     * @param {string} upAxis Up axis for model
     * @param {[type]} forwardAxis Forward axis for model
     * @param {[type]} transition True to trigger a smooth rotationd transition, false for snap to rotation
     * @returns {void}
     */
    @autobind
    handleRotationAxisSet(upAxis, forwardAxis, transition = true) {
        this.renderer.setAxisRotation(upAxis, forwardAxis, transition);
    }

    /**
     * @inheritdoc
     */
    @autobind
    handleSceneLoaded() {
        this.notifyAssetsMissing();

        // Get scene defaults for up/forward axes, and render mode
        this.boxSdk.getMetadataClient().get(this.options.file.id, 'global', 'box3d')
            .then((resp) => {

                if (resp.status !== 200) {
                    throw new Error('Error loading template for ' + this.options.file.id);
                }

                let defaults = resp.response;

                this.axes.up = defaults.upAxis;
                this.axes.forward = defaults.forwardAxis;

                this.handleRotationAxisSet(defaults.upAxis, defaults.forwardAxis, false);
                this.handleSetRenderMode(defaults.defaultRenderMode);

            })
            .catch((err) => {
                console.error(err);
            });
    }

    /**
     * Emit a message with a list of assets that are unavailable
     * @returns {void}
     */
    notifyAssetsMissing() {
        this.emit(EVENT_MISSING_ASSET, this.missingAssets);
    }

    /**
     * Handle a scene save. Save defaults to metadata
     * @param {string} renderMode The default render mode to save
     * @returns {void}
     */
    @autobind
    handleSceneSave(renderMode) {
        const metadata = this.boxSdk.getMetadataClient(),
            operations = [];

        operations.push(metadata.createOperation('replace', '/defaultRenderMode', renderMode));

        this.renderer.getAxes().then((axes) => {
            operations.push(metadata.createOperation('replace', '/upAxis', axes.up));
            operations.push(metadata.createOperation('replace', '/forwardAxis', axes.forward));

            this.axes.up = axes.up;
            this.axes.forward = axes.forward;

            metadata.update(this.options.file.id, 'global', 'box3d', operations)
                .then((resp) => {
                    const event = resp.status === '200' ? EVENT_METADATA_UPDATE_SUCCESS : EVENT_METADATA_UPDATE_FAILURE;
                    this.emit(event, resp);
                });
        });
    }

    /**
     * Spin the 3D model to the default orientation
     * @returns {void}
     */
    @autobind
    handleSceneReset() {
        this.handleRotationAxisSet(this.axes.up, this.axes.forward, true);
    }

    /**
     *  Handle set render mode event
     * @param  {string} mode The selected render mode string
     * @returns {void}
     */
    @autobind
    handleSetRenderMode(mode) {
        this.renderer.setRenderMode(mode);
    }

    /**
     * Handle setting camera projection
     * @private
     * @returns {void}
     */
    @autobind
    handleSetCameraProjection(projection) {
        this.renderer.setCameraProjection(projection);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Model3d = Model3d;
global.Box = Box;
export default Model3d;
