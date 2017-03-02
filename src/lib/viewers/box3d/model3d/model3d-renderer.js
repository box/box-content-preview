/* global Box3D, THREE */
import autobind from 'autobind-decorator';
import Box3DRenderer from '../box3d-renderer';
import sceneEntities from './scene-entities';
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
    GRID_COLOR,
    QUALITY_LEVEL_FULL,
    RENDER_MODE_LIT,
    RENDER_MODE_UNLIT,
    RENDER_MODE_SHAPE,
    RENDER_MODE_NORMALS,
    RENDER_MODE_UV
} from './model3d-constants';
import Browser from '../../../Browser';

const ORIGIN_VECTOR = { x: 0, y: 0, z: 0 };
const FLOOR_VECTOR = { x: 0, y: -1, z: 0 };

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

const OPTIMIZE_FRAMETIME_THESHOLD_REGULAR = 30; // 20 FPS
const OPTIMIZE_FRAMETIME_THESHOLD_MOBILE = 66.6; // 15 FPS
const OPTIMIZE_FRAMETIME_THESHOLD_REGULAR_VR = 20.0; // 50 FPS
const OPTIMIZE_FRAMETIME_THESHOLD_MOBILE_VR = 66.6; // 15 FPS
const DEFAULT_MODEL_SIZE = 1;
const DEFAULT_MODEL_VR_SIZE = 1.5;

/**
 * Model3dRenderer
 * This class handles rendering the preview of the 3D model using the Box3D
 * Runtime library.
 * @class
 */
class Model3dRenderer extends Box3DRenderer {
    /**
     * Creates a 3D runtime and loads in a 3D model for rendering
     * @constructor
     * @inheritdoc
     * @param {HTMLElement} containerEl - the container element
     * @param {BoxSDK} [boxSdk] - Box SDK instance, used for requests to Box
     * @return {Model3dRenderer} Model3dRenderer instance
     */
    constructor(containerEl, boxSdk) {
        super(containerEl, boxSdk);

        this.instance = null;
        this.grid = null;
        this.axisDisplay = null;
        this.isRotating = false;
        this.modelSize = DEFAULT_MODEL_SIZE;
        this.modelVrSize = DEFAULT_MODEL_VR_SIZE;
        this.modelAlignmentPosition = ORIGIN_VECTOR;
        this.modelAlignmentVector = ORIGIN_VECTOR;
        this.modelVrAlignmentPosition = ORIGIN_VECTOR;
        this.modelVrAlignmentVector = FLOOR_VECTOR;
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
        this.box3d.canvas.removeEventListener('click', this.handleCanvasClick);

        this.cleanupScene();

        super.destroy();
    }

    /** @inheritdoc */
    load(assetUrl, options = {}) {
        // #TODO @jholdstock: set this to not reassign param
        const { location } = options;
        /*eslint-disable*/
        options.sceneEntities = sceneEntities(location.staticBaseURI);
        /*eslint-enable*/

        return this.initBox3d(options)
            .then(() => this.loadBox3dFile(assetUrl));
    }

    /**
     * Handle the canvas being clicked.
     * @method handleCanvasClick
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
     * @method loadBox3dFile
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
            .then((entities) => {
                const scene = this.getScene();

                if (this.box3d && scene) {
                    this.optimizeMaterials();
                    this.createPrefabInstances();
                    this.addHelpersToScene();
                    scene.when('load', () => this.onSceneLoad());

                    // make sure we add ALL assets to the asset list to destroy
                    entities.forEach((entity) => {
                        if (entity.id === entity.parentAssetId) {
                            const asset = this.box3d.getAssetById(entity.id);
                            this.assets.push(asset);
                        }
                    });
                }
            }, () => this.onUnsupportedRepresentation());
    }

    /**
     * Go through all materials and look for ways to turn off features to optimize perfomance.
     * @method optimizeMaterials
     * @private
     * @return {void}
     */
    optimizeMaterials() {
        this.box3d.getAssetsByType('material').forEach((mat) => {
            if (mat.getProperty('roughness') <= 0.01 && !mat.getProperty('glossMap')) {
                mat.setProperty('envMapGlossVariance', false);
            }
            if (mat.getProperty('roughness') >= 0.99) {
                mat.setProperty('envMapGlossVariance', false);
                mat.enableFeature('specular', false);
            }
            // Normal maps don't work nicely on mobile right now.
            if (Browser.isMobile()) {
                mat.enableFeature('normals', false);
            }
        });
    }

    /**
     * Create instances of prefabs and add them to the scene.
     * @method createPrefabInstances
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
        this.getScene().addChild(parent);
        this.adjustModelForScene(parent);
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

        this.instance = instance;
    }

    /**
     * Request from the engine, the up and forward axes.
     * @method getAxes
     * @public
     * @return {Promise} Resolves with the up and forward axes.
     */
    getAxes() {
        return new Promise((resolve) => {
            this.box3d.trigger('get_axes', resolve);
        });
    }

    /** @inheritdoc */
    onSceneLoad() {
        // Reset the skeleton visualization.
        this.resetSkeletons();

        // Unload the intermediate HDR maps that are no longer needed.
        super.onSceneLoad();

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
     * @method setAnimationAsset
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
     * @method setAnimationClip
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
     * @method toggleAnimation
     * @public
     * @param {boolean} play - Whether to play or pause the animation.
     * @return {void}
     */
    toggleAnimation(play) {
        if (!this.instance) {
            return;
        }

        const component = this.instance.getComponentByScriptId('animation');
        const animation = component.asset;
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
     * @method stopAnimation
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
     * @method startOptimizer
     * @private
     * @return {void}
     */
    startOptimizer() {
        this.dynamicOptimizer = this.box3d.getApplication().getComponentByScriptId('dynamic_optimizer');

        if (this.dynamicOptimizer) {
            this.createRegularQualityChangeLevels();
            this.createVrQualityChangeLevels();

            if (this.dynamicOptimizerEnabled) {
                this.dynamicOptimizer.enable();
            } else {
                this.dynamicOptimizer.disable();
            }

            this.dynamicOptimizer.setQualityChangeLevels(this.regularQualityChangeLevels);

            if (Browser.isMobile()) {
                this.dynamicOptimizer.setFrameTimeThreshold(OPTIMIZE_FRAMETIME_THESHOLD_MOBILE);
            } else {
                this.dynamicOptimizer.setFrameTimeThreshold(OPTIMIZE_FRAMETIME_THESHOLD_REGULAR);
            }
        }
    }

    /**
     * Handles unsupported representation errors.
     * @method onUnsupportedRepresentation
     * @private
     * @return {void}
     */
    onUnsupportedRepresentation() {
        this.emit('error', new Error(__('error_format')));
    }

    /**
     * Add the helpers (e.g., grid and axes) to the scene.
     * @method addHelpersToScene
     * @private
     * @return {void}
     */
    addHelpersToScene() {
        const scene = this.getScene().runtimeData;
        this.grid = new THREE.GridHelper(GRID_SIZE, GRID_SECTIONS, GRID_COLOR, GRID_COLOR);
        this.grid.material.transparent = true;
        this.grid.material.blending = THREE.MultiplyBlending;
        scene.add(this.grid);
        this.grid.visible = false;

        this.axisDisplay = new THREE.AxisHelper(0.5);
        scene.add(this.axisDisplay);
        this.axisDisplay.visible = false;
    }

    /**
     * Remove the helpers (e.g., grid and axis) from the scene and cleanup their resources.
     * @method cleanupHelpers
     * @private
     * @return {void}
     */
    cleanupHelpers() {
        const scene = this.getScene().runtimeData;
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
     * @private
     * @param {boolean} show - True or false to show or hide. If not specified, the helpers will be
     * toggled.
     * @return {void}
     */
    toggleHelpers(show) {
        const enable = show !== undefined ? show : !this.grid.visible;
        this.axisDisplay.visible = enable;
        if (!this.vrEnabled || !this.vrDeviceHasPosition) {
            this.grid.visible = enable;
        }
        this.box3d.needsRender = true;
    }

    /**
     * Remove instances specific to this preview from the scene.
     * @method cleanupScene
     * @private
     * @return {void}
     */
    cleanupScene() {
        this.cleanupHelpers();

        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
        }

        this.assets.forEach((asset) => {
            asset.destroy();
        });

        this.assets.length = 0;

        this.resetSkeletons();
    }

    /**
     * Reset the skeleton visualization, for example, if the scene changes.
     * @method resetSkeletons
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
     * @method setRenderMode
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
     * @method setCameraProjection
     * @public
     * @param {string} projection - The projection mode.
     * @return {void}
     */
    setCameraProjection(projection) {
        const camera = this.getCamera();
        if (!camera) {
            return;
        }

        const aspect = this.getAspect();

        switch (projection) {
            case CAMERA_PROJECTION_ORTHOGRAPHIC:
                camera.setProperties({
                    top: 0.5,
                    bottom: -0.5,
                    left: -0.5 * aspect,
                    right: 0.5 * aspect,
                    cameraType: 'orthographic'
                });
                break;

            case CAMERA_PROJECTION_PERSPECTIVE:
                camera.setProperties({
                    aspect: this.getAspect(),
                    cameraType: 'perspective'
                });
                break;

            default:
                break;
        }

        if (!this.vrEnabled) {
            camera.trigger('resetOrbitCameraController');
        }
    }

    /**
     * Set the rendering quality being used. Called by UI event handlers.
     * @method setQualityLevel
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
     * @method listenToRotateComplete
     * @param {Object} position {x, y, z} The - position to align the model to.
     * @param {Object} alignment {x, y, z} The - alignment for setting rotation of the model.
     * @return {void}
     */
    listenToRotateComplete(position, alignment) {
        this.isRotating = true;

        const postUpdate = () => {
            if (this.instance) {
                this.instance.alignToPosition(position, alignment);
            }
        };

        // Start listening to post update, to centre the object
        this.box3d.on('postUpdate', postUpdate);

        // Once transition complete, start updating and allow for another rotation
        this.instance.once('axis_transition_complete', () => {
            postUpdate();
            this.box3d.off('postUpdate', postUpdate);
            this.isRotating = false;
        });
    }

    /**
     * Rotates the loaded model on the provided axis.
     * @method rotateOnAxis
     * @public
     * @param {Object} axis - The rotation axis.
     * @return {void}
     */
    rotateOnAxis(axis) {
        if (this.instance && this.box3d && !this.isRotating) {
            this.box3d.trigger('rotate_on_axis', axis, true);
            this.listenToRotateComplete(this.modelAlignmentPosition, this.modelAlignmentVector);
        }
    }

    /**
     * Given a set of up and forward axis keys, rotate the model.
     * @method setAxisRotation
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
        const alignPosition = this.vrEnabled ? this.modelVrAlignmentPosition : this.modelAlignmentPosition;
        const alignVector = this.vrEnabled ? this.modelVrAlignmentVector : this.modelAlignmentVector;
        this.listenToRotateComplete(alignPosition, alignVector);

        // Modify the axes.
        this.box3d.trigger('set_axes', upAxis, forwardAxis, useTransition);
    }

    /**
     * Set the visibility of skeletons.
     * @method setSkeletonsVisible
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
     * @method setWireframesVisible
     * @private
     * @param {boolean} visible - Indicates whether or not wireframes are visible.
     * @return {void}
     */
    setWireframesVisible(visible) {
        if (this.box3d) {
            Box3D.globalEvents.trigger(EVENT_SET_WIREFRAMES_VISIBLE, visible);
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
            if (Browser.isMobile()) {
                this.dynamicOptimizer.setFrameTimeThreshold(OPTIMIZE_FRAMETIME_THESHOLD_MOBILE_VR);
            } else {
                this.dynamicOptimizer.setFrameTimeThreshold(OPTIMIZE_FRAMETIME_THESHOLD_REGULAR_VR);
            }
        }

        // Scale the instance for VR.
        this.instance.scaleToSize(this.modelVrSize);
        const display = this.box3d.getVrDisplay();
        this.vrDeviceHasPosition = display.capabilities.hasPosition;
        if (this.vrDeviceHasPosition) {
            this.instance.alignToPosition(this.modelVrAlignmentPosition, this.modelVrAlignmentVector);
            this.grid.visible = true;
        } else {
            // Enable position-less camera controls
            this.box3d.on('update', this.updateModel3dVrControls, this);
            this.instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);
        }
    }

    /** @inheritdoc */
    onDisableVr() {
        if (this.dynamicOptimizer) {
            this.dynamicOptimizer.setQualityChangeLevels(this.regularQualityChangeLevels);
            if (Browser.isMobile()) {
                this.dynamicOptimizer.setFrameTimeThreshold(OPTIMIZE_FRAMETIME_THESHOLD_REGULAR);
            } else {
                this.dynamicOptimizer.setFrameTimeThreshold(OPTIMIZE_FRAMETIME_THESHOLD_MOBILE);
            }
        }

        if (this.instance) {
            this.instance.scaleToSize(this.modelSize);
            this.instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);
        }

        if (!this.vrDeviceHasPosition) {
            // Disable position-less camera controls
            this.box3d.off('update', this.updateModel3dVrControls, this);
            this.grid.visible = false;
        }

        super.onDisableVr();
    }

    /**
     * Update the controls for VR when enabled.
     * @method updateVrControls
     * @private
     * @return {void}
     */
    updateModel3dVrControls() {
        const camera = this.getCamera().runtimeData;
        camera.position.set(0, 0, 1.0);
        camera.position.applyQuaternion(camera.quaternion);
    }

    /**
     * Set up quality change levels for the dynamic optimizer.
     * @method createRegularQualityChangeLevels
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
     * @method createVrQualityChangeLevels
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

export default Model3dRenderer;
