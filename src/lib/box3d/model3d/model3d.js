import './model3d.scss';
import autobind from 'autobind-decorator';
import Box3D from '../box3d';
import Model3dControls from './model3d-controls';
import Model3dRenderer from './model3d-renderer';
import {
    CAMERA_PROJECTION_PERSPECTIVE,
    EVENT_CLOSE_UI,
    EVENT_METADATA_UPDATE_FAILURE,
    EVENT_METADATA_UPDATE_SUCCESS,
    EVENT_ROTATE_ON_AXIS,
    EVENT_SET_RENDER_MODE,
    EVENT_TOGGLE_HELPERS,
    EVENT_SET_CAMERA_PROJECTION,
    EVENT_SAVE_SCENE_DEFAULTS,
    RENDER_MODE_LIT

} from './model3d-constants';

import {
    CSS_CLASS_INVISIBLE,
    EVENT_LOAD
} from '../box3d-constants';

const Box = global.Box || {};

const DEFAULT_AXIS_UP = '+Y';
const DEFAULT_AXIS_FORWARD = '+Z';

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

        this.wrapperEl.classList.add(CSS_CLASS_INVISIBLE);

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
        this.renderer = new Model3dRenderer(this.wrapperEl, this.boxSdk);
    }

    /**
     * @inheritdoc
     */
    attachEventHandlers() {
        super.attachEventHandlers();

        if (this.controls) {
            this.controls.on(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
            this.controls.on(EVENT_TOGGLE_HELPERS, this.handleToggleHelpers);
            this.controls.on(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
            this.controls.on(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
            this.controls.on(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);
        }
        this.renderer.on(EVENT_CLOSE_UI, this.handleCloseUi);
    }

    /**
     * @inheritdoc
     */
    detachEventHandlers() {
        super.detachEventHandlers();

        if (this.controls) {
            this.controls.removeListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
            this.controls.removeListener(EVENT_TOGGLE_HELPERS, this.handleToggleHelpers);
            this.controls.removeListener(EVENT_SET_CAMERA_PROJECTION, this.handleSetCameraProjection);
            this.controls.removeListener(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
            this.controls.removeListener(EVENT_SAVE_SCENE_DEFAULTS, this.handleSceneSave);
        }
        this.renderer.removeListener(EVENT_CLOSE_UI, this.handleCloseUi);
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
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
        this.emit(EVENT_LOAD);
        this.loaded = true;

        // Get scene defaults for up/forward axes, and render mode
        this.boxSdk.getMetadataClient().get(this.options.file.id, 'global', 'box3d')
            .then((resp) => {
                if (resp.status !== 200) {
                    throw new Error(`Error loading template for ${this.options.file.id}`);
                }

                const defaults = resp.response;

                this.axes.up = defaults.upAxis;
                this.axes.forward = defaults.forwardAxis;
                this.renderMode = defaults.defaultRenderMode;
                this.projection = defaults.cameraProjection;

                const permissions = this.options.file.permissions || {};
                this.controls.addUi(permissions.can_upload && permissions.can_delete);

                this.handleRotationAxisSet(defaults.upAxis, defaults.forwardAxis, false);

                // Update settings ui
                this.controls.setCurrentProjectionMode(defaults.cameraProjection);

                // Update renderer
                this.handleSetCameraProjection(defaults.cameraProjection);

                // Update controls ui
                this.controls.handleSetRenderMode(defaults.defaultRenderMode);
                this.showWrapper();
                this.renderer.enableVrIfPresent();
            })
            .catch((error) => {
                /* eslint-disable no-console */
                console.error(error);
                /* eslint-enable no-console */
                this.axes.up = DEFAULT_AXIS_UP;
                this.axes.forward = DEFAULT_AXIS_FORWARD;
                this.renderMode = RENDER_MODE_LIT;
                this.projection = CAMERA_PROJECTION_PERSPECTIVE;
                // Make sure to display the settings panel, but hide the save button
                this.controls.addUi(false);
                this.showWrapper();
                this.renderer.enableVrIfPresent();
            });
    }

    /**
     * Notify the control module to close all ui, if open
     * @returns {void}
     */
    @autobind
    handleCloseUi() {
        this.controls.emit(EVENT_CLOSE_UI);
    }

    /**
     * Show the preview wrapper container element
     * @returns {void}
     */
    showWrapper() {
        this.wrapperEl.classList.remove(CSS_CLASS_INVISIBLE);
    }

    /**
     * Handle a scene save. Save defaults to metadata
     * @param {string} renderMode The default render mode to save
     * @param {string} projection The default projection to save
     * @returns {void}
     */
    @autobind
    handleSceneSave(renderMode, projection) {
        const metadata = this.boxSdk.getMetadataClient();
        const operations = [];

        operations.push(metadata.createOperation(!!this.renderMode ? 'replace' : 'add', '/defaultRenderMode', renderMode));
        operations.push(metadata.createOperation(!!this.projection ? 'replace' : 'add', '/cameraProjection', projection));

        this.renderMode = renderMode;
        this.projection = projection;

        this.renderer.getAxes().then((axes) => {
            operations.push(metadata.createOperation(!!this.axes.up ? 'replace' : 'add', '/upAxis', axes.up));
            operations.push(metadata.createOperation(!!this.axes.forward ? 'replace' : 'add', '/forwardAxis', axes.forward));

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
     * @inheritdoc
     */
    handleReset() {
        super.handleReset();
        this.handleRotationAxisSet(this.axes.up, this.axes.forward, true);
        this.controls.handleSetRenderMode(this.renderMode);
        this.controls.setCurrentProjectionMode(this.projection);
    }

    /**
     *  Handle set render mode event
     * @param  {String} mode The selected render mode string
     * @returns {void}
     */
    @autobind
    handleSetRenderMode(mode = 'Lit') {
        this.renderer.setRenderMode(mode);
    }

    /**
     * Show, hide or toggle the 'helpers' in the scene. These include the grid display
     * and axis markings.
     * @method handleToggleHelpers
     * @private
     * @param {Boolean} show True or false to show or hide. If not specified, the helpers will be toggled.
     * @returns {void}
     */
    @autobind
    handleToggleHelpers(show) {
        this.renderer.toggleHelpers(show);
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
