/* global Box3D, THREE */
import autobind from 'autobind-decorator';
import Box3DRenderer from '../box3d-renderer';
import sceneEntities from './scene-entities';
import {
    EVENT_CLOSE_UI,
    EVENT_SET_RENDER_MODE,
    EVENT_MISSING_ASSET,
    CAMERA_PROJECTION_PERSPECTIVE,
    CAMERA_PROJECTION_ORTHOGRAPHIC,
    GRID_SIZE,
    GRID_SECTIONS,
    GRID_COLOR
} from './model3d-constants';

const ORIGIN_VECTOR = { x: 0, y: 0, z: 0 };
const FLOOR_VECTOR = { x: 0, y: -1, z: 0 };

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
        this.modelSize = 1.0;
    }

    /**
     * Called on preview destroy
     * @inheritdoc
     * @returns {void}
     */
    destroy() {
        this.unregisterMissingEvents(this.box3d.resourceLoader);

        this.box3d.canvas.removeEventListener('click', this.handleCanvasClick);

        this.cleanupScene();
        this.unloadAssets([
            'HDR_ENV_MAP_CUBE_0',
            'HDR_ENV_MAP_CUBE_1',
            'HDR_ENV_MAP_CUBE_2',
            'HDR_ENV_MAP_0',
            'HDR_ENV_MAP_1',
            'HDR_ENV_MAP_2'
        ]);

        super.destroy();
    }

    /**
     * Load a box3d json
     * @inheritdoc
     * @param  {string} jsonUrl The url to the box3d json
     * @returns {Promise} a promise that resolves with the newly created runtime
     */
    load(jsonUrl, options = {}) {
        // #TODO @jholdstock: set this to not reassign param
        /*eslint-disable*/
        options.sceneEntities = sceneEntities(options.location.staticBaseURI);
        /*eslint-enable*/

        return this.initBox3d(options)
            .then(this.loadBox3dFile.bind(this, jsonUrl));
    }

    /**
     * Listen to the resource loader event system for missing assets
     * @param {Object} eventBus The event bus that belongs to a system that loads Box3D Assets
     * @returns {void}
     */
    registerMissingEvents(eventBus) {
        eventBus.on(EVENT_MISSING_ASSET, this.handleMissingAsset.bind(this));
    }

    /**
     * Kill all event listeners for missing assets and clean up missing asset list
     * @param {Object} eventBus The event bus that belongs to a system that loads Box3D Assets
     * @returns {void}
     */
    unregisterMissingEvents(eventBus) {
        if (eventBus) {
            eventBus.removeAllListeners();
        }
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
     * Handle missing asset event
     * @param {Object} data Missing asset information
     * @returns {void}
     */
    handleMissingAsset(data) {
        this.emit(EVENT_MISSING_ASSET, data);
    }

    /**
     * Parse out the proper components to assemble a threejs mesh
     * @param {string} fileUrl The Box3D file URL
     * @returns {void}
     */
    loadBox3dFile(fileUrl) {
        const loader = new Box3D.JSONLoader(this.box3d);

        this.registerMissingEvents(this.box3d.resourceLoader);
        this.box3d.canvas.addEventListener('click', this.handleCanvasClick);

        // Set MatCap texture for the 'Shape' render mode
        const renderModes = this.box3d.getApplication().componentRegistry.getFirstByScriptId('render_modes');
        renderModes.setAttribute('shapeTexture', 'MAT_CAP_TEX');

        return new Promise((resolve, reject) => {
            loader
                .loadFromUrl(fileUrl, { withCredentials: false })
                .then(this.createPrefabInstances.bind(this), this.onUnsupportedRepresentation.bind(this))
                .then(resolve)
                .catch(reject);
        });
    }

    /**
    * Create instances of a prefabs and add them to the scene
    * @param {object} entities A list of entities
    * @returns {void}
    */
    createPrefabInstances(entities) {
        let prefabEntity;

        if (!this.box3d) {
            return;
        }

        // Find the prefab in the newly imported entities
        entities.forEach((entityDesc) => {
            if (entityDesc.type === 'prefab') {
                prefabEntity = entityDesc;
            }
        });

        // Traverse the scene and add IBL to every referenced material
        this.addIblToMaterials();

        if (prefabEntity) {
            const prefabAsset = this.box3d.assetRegistry.getAssetById(prefabEntity.id);
            this.addInstanceToScene(prefabAsset, this.getScene(), this.attachSceneLoadHandler.bind(this));
        } else {
            this.attachSceneLoadHandler(this.getScene());
        }

        // Add grid and axis helpers to the scene.
        this.addHelpersToScene();

        // make sure we add ALL assets to the asset list to destroy
        entities.forEach((entity) => {
            if (entity.id === entity.parentAssetId) {
                const asset = this.box3d.assetRegistry.getAssetById(entity.id);
                this.assets.push(asset);
            }
        });
    }

    /**
    * Traverse the given scene and set the IBL parameters on all referenced
    * materials found
    * @returns {void}
    */
    addIblToMaterials() {
        const materials = this.box3d.assetRegistry.Materials.assets;

        Object.keys(materials).forEach((id) => {
            const mat = materials[id];
            if (mat) {
                mat.setProperty('useSceneLights', false);
                mat.setProperty('useEnvironmentMap', true);
                mat.setProperty('environmentMapProjection', 'cubeMap');
                mat.setProperty('environmentMapCube_0', 'HDR_ENV_MAP_CUBE_0');
                mat.setProperty('environmentMapCube_1', 'HDR_ENV_MAP_CUBE_1');
                mat.setProperty('environmentMapCube_2', 'HDR_ENV_MAP_CUBE_2');
            }
        });
    }

    /**
    * Create an instance of prefab and add it to the scene.
    * @param {object} prefab The prefab entity to instance.
    * @param {object} scene The scene asset to add the instance to.
    * @param {Function} callback Called on instance load
    * @returns {void}
    */
    addInstanceToScene(prefab, scene, callback) {
        // Create an instance of the prefab asset.
        const instance = scene.createInstance(prefab);

        if (instance) {
            // Add the instance to the global list, to be removed later
            this.instances.push(instance);

            // Scale the instance to 100 units in size.
            instance.scaleToSize(this.modelSize);

            // Center the instance.
            instance.alignToPosition(ORIGIN_VECTOR, ORIGIN_VECTOR);

            if (callback) {
                callback(scene);
            }

            // Attach PreviewAxisRotation component to the instance
            instance.componentRegistry.add('preview_axis_rotation', {}, `axis_rotation_${instance.id}`);

            // Add the instance to the scene.
            scene.addChild(instance);

            this.instance = instance;
        }
    }

    /**
     * Request from the engine, the up and forward axes
     * @returns {Promise} Resolves with the up and forward axes
     */
    getAxes() {
        return new Promise((resolve) => {
            this.box3d.trigger('get_axes', resolve);
        });
    }

    /**
     * The event that finalizes the model being loaded and broadcasts that the preview is loaded
     * @param {Box3DEntity} entity The entity to listen for the load event, on
     * @returns {void}
     */
    attachSceneLoadHandler(entity) {
        entity.once('load', this.onSceneLoad.bind(this));
    }

    /**
     * @inheritdoc
     */
    onSceneLoad() {
        // Reset the camera
        this.reset();
        // Unload the intermediate HDR maps that are no longer needed.
        this.unloadAssets(['HDR_ENV_MAP_0', 'HDR_ENV_MAP_1', 'HDR_ENV_MAP_2']);
        super.onSceneLoad();
        this.resize();
    }

    /**
     * Handles unsupported representation errors
     * @param {Error} error with reason for unsupported representation
     * @returns {void}
     */
    onUnsupportedRepresentation() {
        this.emit('error', new Error(__('error_out_of_date_3d_format')));
    }

    /**
     * Add the grid to the scene for rendering
     * @method addHelpersToScene
     * @private
     * @returns {void}
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
     * Remove the grid and axis helpers from the scene and cleanup
     * their resources
     * @method cleanupHelpers
     * @private
     * @returns {void}
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
     * Show, hide or toggle the 'helpers' in the scene. These include the grid display
     * and axis markings.
     * @private
     * @param {Boolean} show True or false to show or hide. If not specified, the helpers will be toggled.
     * @returns {void}
     */
    toggleHelpers(show) {
        let enable = false;
        if (show !== undefined) {
            enable = !!show;
        } else {
            // If we're toggling, just check state of one helper. This will ensure
            // that the states are always in sync and reduces code length.
            enable = !this.grid.visible;
        }
        this.axisDisplay.visible = enable;
        this.grid.visible = enable;
        this.box3d.needsRender = true;
    }

    /**
     * Remove instances specific to this preview from the scene.
     * @returns {void}
     */
    cleanupScene() {
        this.cleanupHelpers();

        this.instances.forEach((instance) => {
            instance.destroy();
        });

        this.assets.forEach((asset) => {
            asset.destroy();
        });

        this.instance = null;
        this.instances.length = 0;
        this.assets.length = 0;
    }

    /**
     * Unload asset data.
     * @param {Array} assetsArray Array of assets or assetIds.
     * @returns {void}
     */
    unloadAssets(assetsArray) {
        if (!this.box3d) {
            return;
        }
        assetsArray.forEach((assetId) => {
            if (!assetId) {
                return;
            }
            if (assetId instanceof Box3D.Box3DEntity) {
                assetId.unload();
            } else {
                const asset = this.box3d.getEntityById(assetId);
                if (asset) {
                    asset.unload();
                }
            }
        });
    }

    /**
     * Sets the render mode
     * @param {string} mode The mode identifier
     * @returns {void}
     */
    setRenderMode(mode) {
        if (this.box3d) {
            Box3D.globalEvents.trigger(EVENT_SET_RENDER_MODE, mode);
        }
    }

    /**
     * Sets the projection type for the camera
     * @param {string} projection The projection identifier
     * @returns {void}
     */
    setCameraProjection(projection) {
        if (this.box3d) {
            const camera = this.getCamera();

            if (camera) {
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
                    // no default
                }
                camera.trigger('resetOrbitCameraController');
            }
        }
    }

    /**
     * Rotates the loaded model on the provided axis
     * @param  {Object}  axis The axis
     * @returns {void}
     */
    rotateOnAxis(axis) {
        if (this.instance && this.box3d && !this.isRotating) {
            this.isRotating = true;
            const postUpdate = () => {
                this.instance.alignToPosition(ORIGIN_VECTOR, ORIGIN_VECTOR);
            };

            // Kick off rotation
            this.box3d.trigger('rotate_on_axis', axis, true);
            // Start listening to post update, to centre the object
            this.box3d.on('postUpdate', postUpdate);
            // Once transition complete, start updating and allow for another rotation
            this.instance.once('axis_transition_complete', () => {
                postUpdate();
                this.box3d.off('postUpdate', postUpdate);
                this.isRotating = false;
            });
        }
    }

    /**
     * Given a set of up and forward axis keys, rotate the model
     * @param {string} upAxis The axis key for the models up vector
     * @param {string} forwardAxis The axis key for the models forward facing vector
     * @param {bool} useTransition Whether or not to smoothly rotate
     * @returns {void}
     */
    setAxisRotation(upAxis, forwardAxis, useTransition) {
        if (!this.instance) {
            return;
        }
        this.box3d.trigger('set_axes', upAxis, forwardAxis, useTransition);
        // Save these values back to forward and up, for metadata save
        this.axisUp = upAxis;
        this.axisForward = forwardAxis;
        this.instance.alignToPosition(ORIGIN_VECTOR, ORIGIN_VECTOR);
    }

    /**
     * @inheritdoc
     */
    enableVr() {
        if (this.vrEnabled) {
            return;
        }
        super.enableVr();
        // Scale the instance for VR
        this.modelSize = 1.5;
        this.instance.scaleToSize(this.modelSize);
        if (this.vrDeviceHasPosition) {
            this.instance.alignToPosition(ORIGIN_VECTOR, FLOOR_VECTOR);
            this.box3d.on('mouseScroll', this.onVrZoom, this);
        } else {
            // Enable position-less camera controls
            this.box3d.on('update', this.updateModel3dVrControls, this);
            this.instance.alignToPosition(ORIGIN_VECTOR, ORIGIN_VECTOR);
        }
    }

    /**
     * @inheritdoc
     */
    disableVr() {
        if (!this.vrEnabled) {
            return;
        }

        this.modelSize = 1.0;
        if (this.instance) {
            this.instance.scaleToSize(this.modelSize);
            this.instance.alignToPosition(ORIGIN_VECTOR, ORIGIN_VECTOR);
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
     * Grow and shrink the model in VR using mouse scrolling
     * @param  {float} delta Amount of scrolling
     * @return {void}
     */
    onVrZoom(delta) {
        this.modelSize += delta * 0.05;
        this.instance.scaleToSize(this.modelSize);
        this.instance.alignToPosition(ORIGIN_VECTOR, FLOOR_VECTOR);
    }

    /**
     * Update the controls for VR when enabled
     * @private
     * @method updateVrControls
     * @returns {void}
     */
    updateModel3dVrControls() {
        const camera = this.getCamera().runtimeData;
        camera.position.set(0, 0, 1.0);
        camera.position.applyQuaternion(camera.quaternion);
    }
}

export default Model3dRenderer;
