/* global Box3D, THREE */
import autobind from 'autobind-decorator';
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
    QUALITY_LEVEL_FULL,
    RENDER_MODE_LIT,
    RENDER_MODE_UNLIT,
    RENDER_MODE_SHAPE,
    RENDER_MODE_NORMALS,
    RENDER_MODE_UV
} from './model3DConstants';
import {
    EVENT_SCENE_LOADED
} from '../box3DConstants';
import Browser from '../../../Browser';

const ORIGIN_VECTOR = { x: 0, y: 0, z: 0 };
const FLOOR_VECTOR = { x: 0, y: -1, z: 0 };
const IDENTITY_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };

const PREVIEW_CAMERA_ORBIT_DISTANCE_FACTOR = 1.5;
const PREVIEW_CAMERA_POSITION = {
    x: -0.559,
    y: 0.197,
    z: 0.712
};
const PREVIEW_CAMERA_QUATERNION = {
    x: -0.101,
    y: -0.325,
    z: -0.035,
    w: 0.940
};

const OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR = 30; // 20 FPS
const OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE = 66.6; // 15 FPS
const OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR_VR = 20.0; // 50 FPS
const OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE_VR = 66.6; // 15 FPS
const DEFAULT_MODEL_SIZE = 1;

/**
 * Model3DRenderer
 * This class handles rendering the preview of the 3D model using the Box3D
 * Runtime library.
 * @class
 */
class Model3DRenderer extends Box3DRenderer {
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

        this.instance = null;
        this.grid = null;
        this.axisDisplay = null;
        this.isRotating = false;
        this.modelSize = DEFAULT_MODEL_SIZE;
        this.modelAlignmentPosition = ORIGIN_VECTOR;
        this.modelAlignmentVector = FLOOR_VECTOR;
        this.dynamicOptimizerEnabled = true;
        this.defaultCameraPosition = PREVIEW_CAMERA_POSITION;
        this.defaultCameraQuaternion = PREVIEW_CAMERA_QUATERNION;

        // A mapping of preview render mode names to Box3D render mode enum values.
        this.renderModeValues = {
            [RENDER_MODE_LIT]: Box3D.RenderMode.Lit,
            [RENDER_MODE_UNLIT]: Box3D.RenderMode.Unlit,
            [RENDER_MODE_NORMALS]: Box3D.RenderMode.Normals,
            [RENDER_MODE_SHAPE]: Box3D.RenderMode.Shape,
            [RENDER_MODE_UV]: Box3D.RenderMode.UVOverlay
        };
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
        }

        return super.load(assetUrl, opts)
            .then(this.loadBox3dFile.bind(this, assetUrl));
    }

    /**
     * Handle the canvas being clicked.
     *
     * @private
     * @param {Event} event - The click event.
     * @return {void}
     */
    @autobind
    handleCanvasClick(event) {
        this.emit(EVENT_CANVAS_CLICK, event);
    }

    /**
     * Load a box3d representation and initialize the scene.
     *
     * @private
     * @param {string} fileUrl - The representation URL.
     * @param {string} assetPath - The asset path needed to access file
     * @return {void}
     */
    loadBox3dFile(assetUrl) {
        this.box3d.canvas.addEventListener('click', this.handleCanvasClick);

        // Set MatCap texture for the 'Shape' render mode
        const renderModes = this.box3d.getApplication().getComponentByScriptId('render_modes');
        renderModes.setAttribute('shapeTexture', 'MAT_CAP_TEX');

        return this.box3d.addRemoteEntities(assetUrl)
            .then(() => this.setupScene(), () => this.onUnsupportedRepresentation());
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
            return;
        }

        this.createPrefabInstances();
        this.addHelpersToScene();
        scene.when('load', () => this.onSceneLoad());
    }

    /**
     * Create instances of prefabs and add them to the scene.
     *
     * @private
     * @return {void}
     */
    createPrefabInstances() {
        const prefabs = this.box3d.getAssetsByType('prefab');
        if (prefabs.length === 0) {
            return;
        }

        // Create a single parent for all instances.
        const parent = this.box3d.createNode();
        prefabs.forEach((prefab) => parent.addChild(prefab.createInstance()));
        this.instance = parent;
        this.getScene().addChild(parent);
        this.adjustModelForScene(parent);

        this.instance = parent;
    }

    /**
     * Create an instance of the specified prefab and add it to the scene.
     * @param {object} prefab - The prefab entity to instance.
     * @param {object} scene - The scene asset to add the instance to.
     * @return {void}
     */
    adjustModelForScene(instance) {
        // Scale the instance to 100 units in size.
        instance.scaleToSize(this.modelSize);

        // Center the instance.
        instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);

        // Add components to the instance.
        instance.addComponent('preview_axis_rotation', {}, `axis_rotation_${instance.id}`);
        instance.addComponent('animation', {}, `animation_${instance.id}`);
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

        // Reset the transforms of the instances under the root.
        this.instance.getChildren().forEach((instance) => {
            instance.setPosition(ORIGIN_VECTOR.x, ORIGIN_VECTOR.y, ORIGIN_VECTOR.z);
            instance.setQuaternion(IDENTITY_QUATERNION.x, IDENTITY_QUATERNION.y, IDENTITY_QUATERNION.z, IDENTITY_QUATERNION.w);
        });

        this.instance.computeBounds();

        // Scale the instance to the defined size.
        this.instance.scaleToSize(this.modelSize);

        // Align the instance.
        this.instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);
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

        this.instance.computeBounds();

        const bounds = this.instance.getBounds();
        this.instance.runtimeData.updateMatrixWorld();
        bounds.min.applyMatrix4(this.instance.runtimeData.matrixWorld);
        bounds.max.applyMatrix4(this.instance.runtimeData.matrixWorld);

        const maxDimension = new THREE.Vector3();
        maxDimension.subVectors(bounds.max, bounds.min);

        const center = this.instance.getCenter();
        center.applyMatrix4(this.instance.runtimeData.matrixWorld);

        // Set the origin point (so that we always point at the center of the model when the camera reloads)
        orbitController.originPoint.copy(center);
        orbitController.reset();
        const distance = PREVIEW_CAMERA_ORBIT_DISTANCE_FACTOR * Math.max(Math.max(maxDimension.x, maxDimension.y), maxDimension.z);
        orbitController.setOrbitDistance(distance);
    }

    /** @inheritdoc */
    onSceneLoad() {
        // Reset the skeleton visualization.
        this.resetSkeletons();

        this.emit(EVENT_SCENE_LOADED);

        // Should wait until all textures are fully loaded before trying to measure performance.
        // Once they're loaded, start the dynamic optimizer.
        const animations = this.box3d.getEntitiesByType('animation');
        const images = this.box3d.getEntitiesByType('image');
        const videos = this.box3d.getEntitiesByType('video');
        const assets = animations.concat(images, videos).filter((asset) => asset.isLoading());
        const assetPromises = assets.map((asset) => new Promise((resolve) => {
            asset.when('load', resolve);
        }));

        Promise.all(assetPromises).then(() => {
            if (!this.box3d) {
                return;
            }
            this.startOptimizer();

            if (animations.length > 0) {
                this.setAnimationAsset(animations[0]);
            }

            videos.forEach((video) => video.play());
        });

        this.resize();
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
                    component.onUpdate(0);
                    this.instance.scaleToSize(this.modelSize);
                    this.instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);
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
        component.stop();
    }

    /**
     * Start the component that measures performance and dynamically scales material and rendering
     * quality to try to achieve a minimum framerate.
     *
     * @private
     * @return {void}
     */
    startOptimizer() {
        this.dynamicOptimizer = this.box3d.getApplication().getComponentByScriptId('dynamic_optimizer');

        if (!this.dynamicOptimizer) {
            return;
        }

        this.createRegularQualityChangeLevels();
        this.createVrQualityChangeLevels();

        /* eslint-disable no-unused-expressions */
        this.dynamicOptimizerEnabled ? this.dynamicOptimizer.enable() : this.dynamicOptimizer.disable();
        /* eslint-enable no-unused-expressions */

        this.dynamicOptimizer.setQualityChangeLevels(this.regularQualityChangeLevels);
        const threshold = Browser.isMobile() ? OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE : OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR;

        this.dynamicOptimizer.setFrameTimeThreshold(threshold);
    }

    /**
     * Handles unsupported representation errors.
     *
     * @private
     * @return {void}
     */
    onUnsupportedRepresentation() {
        this.emit('error', new Error(__('error_format')));
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
     * Set the rendering quality being used. Called by UI event handlers.
     *
     * @private
     * @param {string} level - Level name
     */
    setQualityLevel(level) {
        if (!this.box3d) {
            return;
        }

        switch (level) {
            case QUALITY_LEVEL_FULL:
                this.dynamicOptimizerEnabled = false;
                if (this.dynamicOptimizer) {
                    this.dynamicOptimizer.disable();
                }
                break;

            default:
                this.dynamicOptimizerEnabled = true;
                if (this.dynamicOptimizer) {
                    this.dynamicOptimizer.enable();
                }
                break;
        }
    }

    /**
     * Setup listeners for the axis rotation events, to properly align a model over time.
     *
     * @param {Object} position {x, y, z} The - position to align the model to.
     * @param {Object} alignment {x, y, z} The - alignment for setting rotation of the model.
     * @return {void}
     */
    listenToRotateComplete(position, alignment) {
        this.isRotating = true;

        const postUpdate = (finalize) => {
            if (!this.instance) {
                return;
            }
            // If this is the final alignment, make sure that it puts the model where the settings
            // indicate it should be. This is necessary if a call to setModelAlignment is made during
            // the rotation, for example.
            if (finalize) {
                this.instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);
            } else {
                this.instance.alignToPosition(position, alignment);
            }
        };

        // Start listening to post update, to centre the object
        this.box3d.on('postUpdate', postUpdate);

        // Once transition complete, start updating and allow for another rotation
        this.instance.once('axis_transition_complete', () => {
            postUpdate(true);
            this.box3d.off('postUpdate', postUpdate);
            this.isRotating = false;
        });
    }

    /**
     * Rotates the loaded model on the provided axis.
     *
     * @public
     * @param {Object} axis - The rotation axis.
     * @return {void}
     */
    rotateOnAxis(axis) {
        if (!this.instance || !this.box3d || this.isRotating) {
            return;
        }

        this.box3d.trigger('rotate_on_axis', axis, true);

        // Calculate centre of model in world space so that we can rotate smoothly about it.
        const alignPosition = this.instance.getCenter();
        if (this.instance.runtimeData) {
            alignPosition.applyMatrix4(this.instance.runtimeData.matrixWorld);
        }

        this.listenToRotateComplete(alignPosition, ORIGIN_VECTOR);
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

        // Set up the rotation listener before triggering "set_axes". The order is important because
        // when useTransition is false, the "axis_transition_complete" event is fired immediately.
        this.listenToRotateComplete(this.modelAlignmentPosition, this.modelAlignmentVector);

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

        if (this.dynamicOptimizer) {
            this.dynamicOptimizer.setQualityChangeLevels(this.vrQualityChangeLevels);

            const threshold = Browser.isMobile() ? OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE_VR : OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR_VR;
            this.dynamicOptimizer.setFrameTimeThreshold(threshold);
        }

        // Scale the instance for VR.
        const display = this.box3d.getVrDisplay();
        this.vrDeviceHasPosition = display ? display.capabilities.hasPosition : undefined;
        if (this.vrDeviceHasPosition) {
            this.grid.visible = true;
        } else {
            // Enable position-less camera controls
            this.box3d.on('update', this.updateModel3dVrControls, this);
        }
    }

    /** @inheritdoc */
    onDisableVr() {
        if (this.dynamicOptimizer) {
            this.dynamicOptimizer.setQualityChangeLevels(this.regularQualityChangeLevels);

            const threshold = Browser.isMobile() ? OPTIMIZE_FRAMETIME_THRESHOLD_MOBILE : OPTIMIZE_FRAMETIME_THRESHOLD_REGULAR;
            this.dynamicOptimizer.setFrameTimeThreshold(threshold);
        }

        if (!this.vrDeviceHasPosition) {
            // Disable position-less camera controls
            this.box3d.off('update', this.updateModel3dVrControls, this);
        }

        super.onDisableVr();
    }

    /**
     * Update the controls for VR when enabled.
     *
     * @private
     * @return {void}
     */
    updateModel3dVrControls() {
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

    /**
     * Set up quality change levels for the dynamic optimizer.
     *
     * @private
     * @return {void}
     */
    createRegularQualityChangeLevels() {
        this.regularQualityChangeLevels = [
            new this.dynamicOptimizer.QualityChangeLevel('application', 'Renderer', 'devicePixelRatio', 0.5),
            new this.dynamicOptimizer.QualityChangeLevel('application', 'Renderer', 'devicePixelRatio', 0.75),
            new this.dynamicOptimizer.QualityChangeLevel('application', 'Renderer', 'devicePixelRatio', 1.0)
        ];
    }

    /**
     * Set up quality change levels for the dynamic optimizer when VR is enabled.
     *
     * @private
     * @return {void}
     */
    createVrQualityChangeLevels() {
        this.vrQualityChangeLevels = [
            new this.dynamicOptimizer.QualityChangeLevel('material', null, 'aoMap', null),
            // TODO - Removing light environments means that we also need to bump up ambient lighting. We'll need
            // to add the ability to set multiple params to the dynamic optimizer to make this work well.
            new this.dynamicOptimizer.QualityChangeLevel('material', null, 'envMapIrradiance', null),
            new this.dynamicOptimizer.QualityChangeLevel('light', null, 'color', { r: 1, g: 1, b: 1 }),
            new this.dynamicOptimizer.QualityChangeLevel('material', null, 'normalMap', null),
            new this.dynamicOptimizer.QualityChangeLevel('material', null, 'envMapRadiance', null),
            new this.dynamicOptimizer.QualityChangeLevel('material', null, 'glossMap', null),
            new this.dynamicOptimizer.QualityChangeLevel('material', null, 'envMapGlossVariance', false),
            new this.dynamicOptimizer.QualityChangeLevel('material', null, 'envMapRadianceHalfGloss', null)
        ];
    }
}

export default Model3DRenderer;
