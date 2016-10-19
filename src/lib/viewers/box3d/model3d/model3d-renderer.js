/* global Box3D, THREE */
import autobind from 'autobind-decorator';
import Box3DRenderer from '../box3d-renderer';
import sceneEntities from './scene-entities';
import {
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    EVENT_CLOSE_UI,
    EVENT_SET_RENDER_MODE,
    EVENT_SET_WIREFRAMES_VISIBLE,
    GRID_SIZE,
    GRID_SECTIONS,
    GRID_COLOR,
    QUALITY_LEVEL_FULL
} from './model3d-constants';
import Browser from '../../../browser';

const ORIGIN_VECTOR = { x: 0, y: 0, z: 0 };
const FLOOR_VECTOR = { x: 0, y: -1, z: 0 };

const OPTIMIZE_FRAMETIME_THESHOLD_REGULAR = 50; // 20 FPS
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
     * @param {HTMLElement} containerEl the container element
     * @param {BoxSDK} [boxSdk] Box SDK instance, used for requests to Box
     * @returns {Model3dRenderer} Model3dRenderer instance
     */
    constructor(containerEl, boxSdk) {
        super(containerEl, boxSdk);

        this.axisUp = null;
        this.axisForward = null;
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
    }

    /** @inheritdoc */
    destroy() {
        this.box3d.canvas.removeEventListener('click', this.handleCanvasClick);

        this.cleanupScene();

        [
            'HDR_ENV_MAP_CUBE_0',
            'HDR_ENV_MAP_CUBE_1',
            'HDR_ENV_MAP_CUBE_2',
            'HDR_ENV_MAP_0',
            'HDR_ENV_MAP_1',
            'HDR_ENV_MAP_2'
        ].forEach((assetId) => {
            const asset = this.box3d.getEntityById(assetId);
            if (asset) {
                asset.unload();
            }
        });

        super.destroy();
    }

    /** @inheritdoc */
    load(jsonUrl, options = {}) {
        // #TODO @jholdstock: set this to not reassign param
        /*eslint-disable*/
        options.sceneEntities = sceneEntities(options.location.staticBaseURI);
        /*eslint-enable*/

        return this.initBox3d(options)
            .then(() => this.loadBox3dFile(jsonUrl));
    }

    /**
     * Handle the canvas being selected
     * @returns {void}
     */
    @autobind
    handleCanvasClick() {
        this.emit(EVENT_CLOSE_UI);
    }

    /**
     * Load a box3d representation and initialize the scene.
     * @method loadBox3dFile
     * @private
     * @param {string} fileUrl The representation URL.
     * @returns {void}
     */
    loadBox3dFile(fileUrl) {
        const loader = new Box3D.JSONLoader(this.box3d);

        this.box3d.canvas.addEventListener('click', this.handleCanvasClick);

        // Set MatCap texture for the 'Shape' render mode
        const renderModes = this.box3d.getApplication().componentRegistry
            .getFirstByScriptId('render_modes');

        renderModes.setAttribute('shapeTexture', 'MAT_CAP_TEX');

        return loader.loadFromUrl(fileUrl, { withCredentials: false })
            .then((entities) => {
                const scene = this.getScene();

                if (this.box3d && scene) {
                    this.addIblToMaterials();
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
     * Create instances of prefabs and add them to the scene.
     * @method createPrefabInstances
     * @private
     * @returns {void}
     */
    createPrefabInstances() {
        const prefabs =
            this.box3d.getAssets((asset) => asset.type === 'prefab' && asset.id !== 'SCENE_ID');
        if (prefabs.length === 0) {
            return true;
        }

        // Only instance a single prefab for now.
        return this.addInstanceToScene(prefabs[0], this.getScene());
    }

    /**
     * Traverse the given scene and set the IBL parameters on all referenced materials found.
     * @method addIblToMaterials
     * @private
     * @returns {void}
     */
    addIblToMaterials() {
        this.box3d.getAssetsByType('material').forEach((mat) => {
            mat.setProperty('envMapIrradiance', 'HDR_ENV_MAP_CUBE_2');
            mat.setProperty('envMapRadiance', 'HDR_ENV_MAP_CUBE_0');
            mat.setProperty('envMapRadianceHalfGloss', 'HDR_ENV_MAP_CUBE_1');
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
     * Create an instance of the specified prefab and add it to the scene.
     * @param {object} prefab The prefab entity to instance.
     * @param {object} scene The scene asset to add the instance to.
     * @returns {Boolean} Whether or not the instance was added to the scene.
     */
    addInstanceToScene(prefab, scene) {
        // Create an instance of the prefab asset.
        const instance = scene.createInstance(prefab);
        if (!instance) {
            return false;
        }

        // Scale the instance to 100 units in size.
        instance.scaleToSize(this.modelSize);

        // Center the instance.
        instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);

        // Attach PreviewAxisRotation component to the instance.
        instance.componentRegistry.add('preview_axis_rotation', {}, `axis_rotation_${instance.id}`);

        // Add the instance to the scene.
        scene.getRootObject().addChild(instance);

        this.instance = instance;

        return true;
    }

    /**
     * Request from the engine, the up and forward axes.
     * @method getAxes
     * @public
     * @returns {Promise} Resolves with the up and forward axes.
     */
    getAxes() {
        return new Promise((resolve) => {
            this.box3d.trigger('get_axes', resolve);
        });
    }

    /** @inheritdoc */
    onSceneLoad() {
        // Reset the camera.
        this.reset();

        // Unload the intermediate HDR maps that are no longer needed.
        super.onSceneLoad();

        // Should wait until all textures are fully loaded before trying to measure performance.
        // Once they're loaded, start the dynamic optimizer.
        const images = this.box3d.getEntitiesByType('image');
        const videos = this.box3d.getEntitiesByType('video');
        const media = images.concat(videos).filter((asset) => asset.isLoading());
        const mediaPromises = media.map((asset) => new Promise((resolve) => {
            asset.when('load', resolve);
        }));

        Promise.all(mediaPromises).then(() => {
            this.startOptimizer();
            videos.forEach((video) => video.play());
        });

        this.resize();
    }

    /**
     * Start the component that measures performance and dynamically scales material and rendering
     * quality to try to achieve a minimum framerate.
     * @method startOptimizer
     * @private
     * @returns {void}
     */
    startOptimizer() {
        this.dynamicOptimizer = this.box3d.getApplication().componentRegistry
          .getFirstByScriptId('dynamic_optimizer');

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
     * @returns {void}
     */
    onUnsupportedRepresentation() {
        this.emit('error', new Error(__('error_format')));
    }

    /**
     * Add the helpers (e.g., grid and axes) to the scene.
     * @method addHelpersToScene
     * @private
     * @returns {void}
     */
    addHelpersToScene() {
        const scene = this.getScene().getRootObject().runtimeData;
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
     * @returns {void}
     */
    cleanupHelpers() {
        const scene = this.getScene().getRootObject().runtimeData;
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
     * @param {boolean} show True or false to show or hide. If not specified, the helpers will be
     * toggled.
     * @returns {void}
     */
    toggleHelpers(show) {
        const enable = show !== undefined ? show : !this.grid.visible;
        this.axisDisplay.visible = enable;
        this.grid.visible = enable;
        this.box3d.needsRender = true;
    }

    /**
     * Remove instances specific to this preview from the scene.
     * @method cleanupScene
     * @private
     * @returns {void}
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
    }

    /**
     * Sets the render mode.
     * @method setRenderMode
     * @public
     * @param {string} mode The render mode.
     * @returns {void}
     */
    setRenderMode(mode) {
        if (this.box3d) {
            Box3D.globalEvents.trigger(EVENT_SET_RENDER_MODE, mode);
        }
    }

    /**
     * Sets the projection type for the camera.
     * @method setCameraProjection
     * @public
     * @param {string} projection The projection mode.
     * @returns {void}
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
     * @param {string} level Level name
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
     * @param {Object} position {x, y, z} The position to align the model to.
     * @param {Object} alignment {x, y, z} The alignment for setting rotation of the model.
     * @returns {void}
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
     * @param {Object} axis The rotation axis.
     * @returns {void}
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
     * @param {string} upAxis The axis key for the models up vector.
     * @param {string} forwardAxis The axis key for the models forward facing vector.
     * @param {bool} useTransition Whether or not to smoothly rotate.
     * @returns {void}
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

        // Save these values back to forward and up, for metadata save.
        this.axisUp = upAxis;
        this.axisForward = forwardAxis;
    }

    /**
     * Set the visibility of wireframes.
     * @method setWireframesVisible
     * @private
     * @param {Boolean} visible Indicates whether or not wireframes are visible.
     * @returns {void}
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

        if (!this.instance) {
            return;
        }

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

        if (this.vrDeviceHasPosition) {
            this.instance.alignToPosition(this.modelVrAlignmentPosition, this.modelVrAlignmentVector);
            this.box3d.on('mouseScroll', this.onVrZoom, this);
        } else {
            // Enable position-less camera controls
            this.box3d.on('update', this.updateModel3dVrControls, this);
            this.instance.alignToPosition(this.modelAlignmentPosition, this.modelAlignmentVector);
        }
    }

    /** @inheritdoc */
    disableVr() {
        if (!this.vrEnabled) {
            return;
        }

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

        if (this.vrDeviceHasPosition) {
            this.box3d.off('mouseScroll', this.onVrZoom, this);
        } else {
            // Disable position-less camera controls
            this.box3d.off('update', this.updateModel3dVrControls, this);
        }

        super.disableVr();
    }

    /**
     * Grow and shrink the model in VR using mouse scrolling.
     * @method onVrZoom
     * @private
     * @param {float} delta Amount of scrolling.
     * @returns {void}
     */
    onVrZoom(delta) {
        this.modelVrSize += delta * 0.05;

        if (this.instance) {
            this.instance.scaleToSize(this.modelVrSize);
            this.instance.alignToPosition(this.modelVrAlignmentPosition, this.modelVrAlignmentVector);
        }
    }

    /**
     * Update the controls for VR when enabled.
     * @method updateVrControls
     * @private
     * @returns {void}
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
     * @returns {void}
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
     * @returns {void}
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
