/* global Box3D, THREE */
import Box3DRenderer from '../Box3DRenderer';
import Model3DVrControls from './Model3DVrControls';
import sceneEntities from './SceneEntities';
import {
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    EVENT_CANVAS_CLICK,
    EVENT_RESET_SKELETONS,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_SKELETONS_VISIBLE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    GRID_SIZE,
    GRID_SECTIONS,
    GRID_COLOR_METRE,
    GRID_COLOR_HALF_METRE,
    RENDER_MODE_LIT,
    RENDER_MODE_UNLIT,
    RENDER_MODE_SHAPE,
    RENDER_MODE_NORMALS,
    RENDER_MODE_UV
} from './model3DConstants';
import { MODEL3D_STATIC_ASSETS_VERSION } from '../../../constants';
import { createAssetUrlCreator } from '../../../util';

const previewApplication = `third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/box3d-player.json`;

const ORIGIN_VECTOR = { x: 0, y: 0, z: 0 };
const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };

const PREVIEW_CAMERA_ORBIT_DISTANCE_FACTOR = 1.5;

/**
 * This class handles rendering the preview of the 3D model using the Box3D
 * Runtime library.
 */
class Model3DRenderer extends Box3DRenderer {
    /** @property {Box3D.BaseObject} - The instance that contains the model that is added to the scene */
    instance;

    /** @property {THREE.GridHelper} - The grid overlayed on the scene when opening the settings panel. Used to judge scale */
    grid;

    /** @property {THREE.AxisHelper} - Axis lines overlayed on the scene to help judge alignment */
    axisDisplay;

    /** A mapping of preview render mode names to Box3D render mode enum values */
    renderModeValues;

    /**
     * Creates a 3D runtime and loads in a 3D model for rendering
     *
     * @constructor
     * @inheritdoc
     * @param {HTMLElement} containerEl - the container element
     * @param {BoxSDK} [boxSdk] - Box SDK instance, used for requests to Box
     * @return {Model3DRenderer} Model3DRenderer instance
     */
    constructor(containerEl, boxSdk) {
        super(containerEl, boxSdk);

        this.renderModeValues = {
            [RENDER_MODE_LIT]: Box3D.RenderMode.Lit,
            [RENDER_MODE_UNLIT]: Box3D.RenderMode.Unlit,
            [RENDER_MODE_NORMALS]: Box3D.RenderMode.Normals,
            [RENDER_MODE_SHAPE]: Box3D.RenderMode.Shape,
            [RENDER_MODE_UV]: Box3D.RenderMode.UVOverlay
        };

        this.handleCanvasClick = this.handleCanvasClick.bind(this);
    }

    /** @inheritdoc */
    destroy() {
        if (!this.box3d) {
            return;
        }

        this.box3d.canvas.removeEventListener('click', this.handleCanvasClick);

        this.cleanupScene();

        super.destroy();
    }

    /** @inheritdoc */
    load(assetUrl, options = {}) {
        const opts = {
            ...options
        };
        const { location } = opts;
        if (location) {
            opts.sceneEntities = sceneEntities(location.staticBaseURI);
            if (!opts.box3dApplication) {
                const assetUrlCreator = createAssetUrlCreator(location);
                opts.box3dApplication = assetUrlCreator(previewApplication);
            }
        }

        return super
            .load(assetUrl, opts)
            .then(this.loadBox3dFile.bind(this, options.file.id))
            .catch(() => this.onUnsupportedRepresentation());
    }

    /**
     * Handle the canvas being clicked.
     *
     * @private
     * @param {Event} event - The click event.
     * @return {void}
     */
    handleCanvasClick(event) {
        this.emit(EVENT_CANVAS_CLICK, event);
    }

    /**
     * Load a box3d representation and initialize the scene.
     *
     * @private
     * @param {string} fileId - The ID of the Box file to load.
     * @return {void}
     */
    loadBox3dFile(fileId) {
        this.box3d.canvas.addEventListener('click', this.handleCanvasClick);

        // Set MatCap texture for the 'Shape' render mode
        const renderModes = this.box3d.getApplication().getComponentByScriptId('render_modes');
        if (renderModes) {
            renderModes.setAttribute('shapeTexture', 'MAT_CAP_TEX');
        }

        return new Promise((resolve, reject) => {
            const scene = this.getScene();
            if (!scene) {
                reject(new Error('Provided Box3D application data contains no scene'));
            }

            this.instance = scene.getDescendantByName('Preview Model');
            if (!this.instance) {
                reject(new Error('Provided Box3D application must include node named "Preview Model"'));
            }

            this.instance.once('remoteInstanceCreated', () => {
                this.setupScene();
                resolve();
            });
            this.instance.trigger('createRemoteInstance', fileId);
        });
    }

    /**
     * Setup scene ground visualization grid, optimize materials for rendering, and create prefabs to
     * create the scene with.
     *
     * @private
     * @return {void}
     */
    setupScene() {
        const scene = this.getScene();
        if (!scene) {
            this.onSceneLoad();
            return;
        }

        // Add components to the instance.
        this.instance.addComponent('preview_axis_rotation', {}, `axis_rotation_${this.instance.id}`);
        this.instance.addComponent('animation', {}, `animation_${this.instance.id}`);
        const animations = this.box3d.getAssetsByClass(Box3D.AnimationAsset);
        if (animations.length > 0) {
            this.setAnimationAsset(animations[0]);
        }

        this.addHelpersToScene();
        scene.when('load', () => this.onSceneLoad());
    }

    /**
     * Request from the engine, the up and forward axes.
     *
     * @public
     * @return {Promise} Resolves with the up and forward axes.
     */
    getAxes() {
        return new Promise((resolve) => {
            this.box3d.trigger('get_axes', resolve);
        });
    }

    /** @inheritdoc */
    reset() {
        this.resetModel();
        super.reset();
    }

    /**
     * Reset the model and all of its children to the origin and preset position.
     *
     * @return {void}
     */
    resetModel() {
        if (!this.instance) {
            return;
        }

        // Reset the transforms of the instances under the root (they can be modified in VR).
        this.instance.getChildren().forEach((instance) => {
            instance.setPosition(ORIGIN_VECTOR.x, ORIGIN_VECTOR.y, ORIGIN_VECTOR.z);
            instance.setQuaternion(
                IDENTITY_QUATERNION.x,
                IDENTITY_QUATERNION.y,
                IDENTITY_QUATERNION.z,
                IDENTITY_QUATERNION.w
            );
        });
    }

    /** @inheritdoc */
    resetView() {
        super.resetView();
        const camera = this.getCamera();
        if (!camera) {
            return;
        }

        const orbitController = camera.getComponentByScriptId('orbit_camera');
        if (!orbitController || !this.instance.runtimeData) {
            return;
        }

        const bounds = this.instance.getBounds();
        this.instance.runtimeData.updateMatrixWorld();
        bounds.min.applyMatrix4(this.instance.runtimeData.matrixWorld);
        bounds.max.applyMatrix4(this.instance.runtimeData.matrixWorld);

        const maxDimension = new THREE.Vector3();
        maxDimension.subVectors(bounds.max, bounds.min);

        const center = this.instance.getCenter();
        center.applyMatrix4(this.instance.runtimeData.matrixWorld);

        orbitController.reset();
        orbitController.setPivotPosition(center);

        const distance =
            PREVIEW_CAMERA_ORBIT_DISTANCE_FACTOR * Math.max(Math.max(maxDimension.x, maxDimension.y), maxDimension.z);
        orbitController.setOrbitDistance(distance);
    }

    /** @inheritdoc */
    onSceneLoad() {
        super.onSceneLoad();

        // Reset the skeleton visualization.
        this.initVrGamepadControls();
        this.resetSkeletons();
        const videos = this.box3d.getEntitiesByType('video');
        videos.forEach((video) => video.play());
    }

    /**
     * Set the current animation asset.
     *
     * @public
     * @param {AnimationAsset} animation - The animation asset.
     * @return {void}
     */
    setAnimationAsset(animation) {
        if (!this.instance) {
            return;
        }

        const component = this.instance.getComponentByScriptId('animation');
        component.setAsset(animation);
        component.setLoop(true);
    }

    /**
     * Set the current animation clip.
     *
     * @public
     * @param {string} clipId - The animation clip ID.
     * @return {void}
     */
    setAnimationClip(clipId) {
        if (!this.instance) {
            return;
        }

        const component = this.instance.getComponentByScriptId('animation');
        component.setClipId(clipId);
    }

    /**
     * Play / pause the current animation.
     *
     * @public
     * @param {boolean} play - Whether to play or pause the animation.
     * @return {void}
     */
    toggleAnimation(play) {
        if (!this.instance) {
            return;
        }

        const component = this.instance.getComponentByScriptId('animation');
        const animation = component ? component.asset : undefined;
        if (!animation) {
            return;
        }

        // Make sure the animation asset and instance are loaded before trying
        // to play / pause.
        animation.when('load', () => {
            this.instance.when('load', () => {
                if (play) {
                    component.play();
                } else {
                    component.pause();
                }
            });
        });
    }

    /**
     * Stop the current animation and reset it to its beginning.
     *
     * @public
     * @return {void}
     */
    stopAnimation() {
        if (!this.instance) {
            return;
        }

        const component = this.instance.getComponentByScriptId('animation');
        if (component) {
            component.stop();
        }
    }

    /**
     * Handles unsupported representation errors.
     *
     * @private
     * @return {void}
     */
    onUnsupportedRepresentation() {
        this.emit('error', new Error(__('error_default')));
    }

    /**
     * Add the helpers (e.g., grid and axes) to the scene.
     *
     * @private
     * @return {void}
     */
    addHelpersToScene() {
        const scene = this.getScene() ? this.getScene().runtimeData : undefined;
        if (!scene) {
            return;
        }

        this.grid = new THREE.GridHelper(GRID_SIZE, GRID_SECTIONS, GRID_COLOR_METRE, GRID_COLOR_HALF_METRE);
        this.grid.material.transparent = true;
        this.grid.material.blending = THREE.MultiplyBlending;
        scene.add(this.grid);
        this.grid.visible = true;

        this.axisDisplay = new THREE.AxisHelper(0.5);
        scene.add(this.axisDisplay);
        this.axisDisplay.visible = false;
    }

    /**
     * Remove the helpers (e.g., grid and axis) from the scene and cleanup their resources.
     *
     * @private
     * @return {void}
     */
    cleanupHelpers() {
        const scene = this.getScene() ? this.getScene().runtimeData : undefined;
        if (!scene) {
            return;
        }

        if (this.grid) {
            scene.remove(this.grid);
            this.grid.material.dispose();
            this.grid.geometry.dispose();
        }

        if (this.axisDisplay) {
            scene.remove(this.axisDisplay);
            this.axisDisplay.material.dispose();
            this.axisDisplay.geometry.dispose();
        }
    }

    /**
     * Show, hide or toggle visibility of the helpers (e.g., grid and axes).
     *
     * @private
     * @param {boolean} show - True or false to show or hide. If not specified, the helpers will be
     * toggled.
     * @return {void}
     */
    toggleHelpers(show) {
        const enable = show !== undefined ? show : !this.axisDisplay.visible;
        this.axisDisplay.visible = enable;
        this.box3d.needsRender = true;
    }

    /**
     * Remove instances specific to this preview from the scene.
     *
     * @private
     * @return {void}
     */
    cleanupScene() {
        this.cleanupHelpers();
        this.resetSkeletons();
    }

    /**
     * Reset the skeleton visualization, for example, if the scene changes.
     *
     * @public
     * @return {void}
     */
    resetSkeletons() {
        if (this.box3d) {
            Box3D.globalEvents.trigger(EVENT_RESET_SKELETONS);
        }
    }

    /**
     * Sets the render mode.
     *
     * @public
     * @param {string} mode - The render mode.
     * @return {void}
     */
    setRenderMode(mode) {
        if (this.box3d) {
            Box3D.globalEvents.trigger(EVENT_SET_RENDER_MODE, this.renderModeValues[mode]);
        }
    }

    /**
     * Sets the projection type for the camera.
     *
     * @public
     * @param {string} projection - The projection mode.
     * @return {void}
     */
    setCameraProjection(projection) {
        const camera = this.getCamera();
        if (!camera) {
            return;
        }

        switch (projection) {
            case CAMERA_PROJECTION_ORTHOGRAPHIC:
                camera.setProperty('cameraType', 'orthographic');
                break;

            case CAMERA_PROJECTION_PERSPECTIVE:
                camera.setProperty('cameraType', 'perspective');
                break;

            default:
                break;
        }

        this.resetView();
    }

    /**
     * Rotates the loaded model on the provided axis.
     *
     * @public
     * @param {Object} axis - The rotation axis.
     * @return {void}
     */
    rotateOnAxis(axis) {
        if (!this.instance || !this.box3d) {
            return;
        }

        this.box3d.trigger('rotate_on_axis', axis, true);
    }

    /**
     * Given a set of up and forward axis keys, rotate the model.
     *
     * @public
     * @param {string} upAxis - The axis key for the models up vector.
     * @param {string} forwardAxis - The axis key for the models forward facing vector.
     * @param {bool} useTransition - Whether or not to smoothly rotate.
     * @return {void}
     */
    setAxisRotation(upAxis, forwardAxis, useTransition) {
        if (!this.instance) {
            return;
        }

        // Modify the axes.
        this.box3d.trigger('set_axes', upAxis, forwardAxis, useTransition);
    }

    /**
     * Set the visibility of skeletons.
     *
     * @private
     * @param {boolean} visible - Indicates whether or not skeletons are visible.
     * @return {void}
     */
    setSkeletonsVisible(visible) {
        if (this.box3d) {
            Box3D.globalEvents.trigger(EVENT_SET_SKELETONS_VISIBLE, visible);
        }
    }

    /**
     * Set the visibility of wireframes.
     *
     * @private
     * @param {boolean} visible - Indicates whether or not wireframes are visible.
     * @return {void}
     */
    setWireframesVisible(visible) {
        if (this.box3d) {
            Box3D.globalEvents.trigger(EVENT_SET_WIREFRAMES_VISIBLE, visible);
        }
    }

    /**
     * Set the visibility of the grid.
     *
     * @private
     * @param {boolean} visible - Indicates whether or not the grid is visible.
     * @return {void}
     */
    setGridVisible(visible) {
        if (this.box3d) {
            this.grid.visible = visible;
        }
    }

    /** @inheritdoc */
    enableVr() {
        if (this.vrEnabled) {
            return;
        }

        super.enableVr();

        // Scale the instance for VR.
        const display = this.box3d.getVrDisplay();
        this.vrDeviceHasPosition = display ? display.capabilities.hasPosition : undefined;
        if (this.vrDeviceHasPosition) {
            this.grid.visible = true;
        } else {
            // Enable position-less camera controls
            this.box3d.on('update', this.updateNonPositionalVrControls, this);
        }
    }

    /** @inheritdoc */
    onDisableVr() {
        if (!this.vrDeviceHasPosition) {
            // Disable position-less camera controls
            this.box3d.off('update', this.updateNonPositionalVrControls, this);
        }

        super.onDisableVr();
    }

    /**
     * Update the controls for non-positional VR when enabled.
     *
     * @private
     * @return {void}
     */
    updateNonPositionalVrControls() {
        const cameraObject = this.getCamera();
        const orbitController = cameraObject.getComponentByScriptId('orbit_camera');
        if (!orbitController) {
            return;
        }

        const camera = cameraObject.runtimeData;
        camera.position.set(0, 0, orbitController.getOrbitDistance());
        camera.position.applyQuaternion(camera.quaternion);
        camera.position.add(orbitController.originPoint);
    }

    /**
     * Create the module that handles VR hand controller interaction with the model.
     *
     * @private
     * @return {void}
     */
    initVrGamepadControls() {
        this.vrControls = new Model3DVrControls(this.vrGamepads, this.box3d);
    }
}

export default Model3DRenderer;
