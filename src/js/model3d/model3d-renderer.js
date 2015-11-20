/* global VAPI, Box3DResourceLoader */
'use strict';

import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import sceneEntities from './scene-entities';
import Cache from '../cache';
import {EVENT_MISSING_ASSET, EVENT_SCENE_LOADED, EVENT_SET_RENDER_MODE, EVENT_SHOW_VR_BUTTON} from './model3d-constants';

const CACHE_KEY_BOX3D = 'box3d';

const INPUT_SETTINGS = {
	mouseEvents: {
		scroll: true,
		scroll_preventDefault: true
	},
	vrEvents: {
		enable: true,
		position: false
	}
};

/**
 * Model3dRenderer
 * This class handles rendering the preview of the 3D model using the Box3D
 * Runtime library.
 * @class
 */
@autobind
class Model3dRenderer extends EventEmitter {
	/**
	 * [constructor]
	 * @param {HTMLElement} containerEl the container element
	 * @param {BoxSDK} [boxSdk] Box SDK instance, used for requests to Box
	 * @returns {Model3dRenderer} Model3dRenderer instance
	 */
	constructor(containerEl, boxSdk) {
		super();
		this.containerEl = containerEl;
		this.instances = [];
		this.assets = [];
		this.vrEnabled = false;
		this.boxSdk = boxSdk;
	}

	/**
	 * Called on preview destroy
	 * @returns {void}
	 */
	destroy() {
		if (!this.box3d) {
			return;
		}

		this.hideBox3d();

		this.reset();

		this.unregisterMissingEvents(this.box3d.resourceLoader.eventBus);

		this.cleanupScene();
		this.cleanupIblMaps();

		this.box3d.resourceLoader.destroy();
		this.box3d.resourceLoader = null;
		this.box3d = null;
	}

	/**
	 * Load a box3d json
	 * @param  {string} jsonUrl The url to the box3d json
	 * @param  {object} options Options object
	 * @returns {void}
	 */
	load(jsonUrl, options) {
		return this.initBox3d(options)
			.then(this.loadBox3dFile.bind(this,jsonUrl));
	}

	/**
	 * Reset preview state to defaults.
	 * @returns {void}
	 */
	reset() {
		let camera = this.getCamera();

		// Reset camera settings to default.
		if (camera) {
			camera.trigger('resetOrbitCameraController');
		}
	}

	/**
	 * Listen to the resource loader event system for missing assets
	 * @param {Object} eventBus The event bus that belongs to a system that loads Box3D Assets
	 * @returns {void}
	 */
	registerMissingEvents(eventBus) {
		eventBus.on('missingAsset::texture2D', this.handleMissingAsset);
		eventBus.on('missingAsset::textureCube', this.handleMissingAsset);
		eventBus.on('missingAsset::animation', this.handleMissingAsset);
		eventBus.on('missingAsset::geometry', this.handleMissingAsset);
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
	 * Handle missing asset event
	 * @param {Object} data Missing asset information
	 * @returns {void}
	 */
	handleMissingAsset(data) {
		this.emit(EVENT_MISSING_ASSET, data);
	}


	/**
	 * Get the scene's camera instance.
	 * @returns {Box3DEntity} The camera instance
	 */
	getCamera() {
		let scene = this.getScene();
		return scene ? scene.getChildById('CAMERA_ID') : null;
	}

	/**
	 * Get the scene asset.
	 * @returns {Box3DEntity} The scene asset
	 */
	getScene() {
		return this.box3d ? this.box3d.assetRegistry.getAssetById('SCENE_ID') : null;
	}

	/**
	 * Initialize the Box3D engine.
	 * @param {object} options the preview options object
	 * @returns {void} nothing
	 */
	initBox3d(options) {
		let resourceLoader,
		opts = {};

		// Initialize global modules.
		if (!VAPI) {
			return Promise.reject(new Error('Missing VAPI'));
		}

		if (!Box3DResourceLoader) {
			return Promise.reject(new Error('Missing Box3DResourceLoader'));
		}

		if (!options.file || !options.file.file_version) {
			return Promise.reject(new Error('Missing file version'));
		}

		opts.token = options.token;
		opts.apiBase = options.api;
		opts.parentId = options.file.parent.id;
		opts.boxSdk = this.boxSdk;
		resourceLoader = new Box3DResourceLoader(options.file.id, options.file.file_version.id, opts);

		//if the event bus is available from the Resource loader, listen for missing asset notification
		if (resourceLoader.eventBus) {
			this.registerMissingEvents(resourceLoader.eventBus);
		}

		return this.createBox3d(resourceLoader, options);
	}

	/**
	 * Create a new Box3D engine.
	 * @param {object} resourceLoader The resource loader instance that should be used
	 * @param {object} options The preview options object
	 * @returns {void}
	 */
	createBox3d(resourceLoader, options) {
		this.box3d = Cache.get(CACHE_KEY_BOX3D);

		if (this.box3d) {
			this.box3d.resourceLoader = resourceLoader;
			return Promise.resolve(this.box3d);
		}

		this.box3d = new VAPI.Engine({
			engineName: 'Default',
			container: this.containerEl
		});

		return new Promise((resolve, reject) => {
			this.box3d.initialize({
				entities: new VAPI.EntityCollection(sceneEntities(options.location.baseURI)),
				inputSettings: INPUT_SETTINGS,
				resourceLoader
			}, () => {
				let app = this.box3d.assetRegistry.getAssetById('APP_ASSET_ID');
				app.load(() => {
					Cache.set('box3d', this.box3d);
					resolve(this.box3d);
				});
			});
		});
	}

	/**
	 * Parse out the proper components to assemble a threejs mesh
	 * @param {string} fileUrl The Box3D file URL
	 * @returns {void}
	 */
	loadBox3dFile(fileUrl) {
		let loader = new VAPI.JSONLoader(this.box3d, fileUrl);

		return new Promise((resolve, reject) => {
			loader
				.load({ withCredentials: false })
				.then(this.createPrefabInstances, this.onUnsupportedRepresentation)
				.then(resolve)
				.catch(reject);
		});
	}

	/**
	* Create instances of a prefabs and add them to the scene
	* @param {object} collection A collection of entities
	* @returns {void}
	*/
	createPrefabInstances(collection) {
		if (!this.box3d) {
			return;
		}

		let prefabEntity = collection.where({ type: 'prefab' }, true);

		// Traverse the scene and add IBL to every referenced material
		this.addIblToMaterials();

		if (prefabEntity) {
			let prefabAsset = this.box3d.assetRegistry.getAssetById(prefabEntity.id);
			this.addInstanceToScene(prefabAsset, this.getScene(), this.setupSceneLoadedEvent);
		} else {
			this.setupSceneLoadedEvent(this.getScene());
		}

		// make sure we add ALL assets to the asset list to destroy
		collection.each((entity) => {
			if (entity.isAsset()) {
				let asset = this.box3d.assetRegistry.getAssetById(entity.id);
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
		let materials = this.box3d.assetRegistry.Materials.assets;

		for (let i in materials) {
			if (materials.hasOwnProperty(i)) {
				let mat = materials[i];
				mat.setProperty('useSceneLights', false);
				mat.setProperty('useEnvironmentMap', true);
				mat.setProperty('diffuseEnvironmentMap2D', 'HDR_DIFF_ENV_MAP');
				mat.setProperty('specularEnvironmentMap2D', 'HDR_SPEC_ENV_MAP');
			}
		}
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
		let instance = scene.createInstance(prefab);

		if (instance) {
			// Add the instance to the global list, to be removed later
			this.instances.push(instance);

			// Scale the instance to 100 units in size.
			instance.scaleToSize(100);

			// Center the instance.
			instance.alignToPosition({x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0});

			if (callback) {
				callback(instance);
			}

			//attach PreviewAxisRotation component to the instance
			instance.addComponent('preview_axis_rotation', {}, 'axis_rotation_' + instance.id);

			instance.on('axis_transition_complete', () => {
				instance.alignToPosition({x: 0, y: 0, z: 0}, {x: 0, y: 0, z: 0});
			});

			// Add the instance to the scene.
			scene.addChild(instance);
		}
	}

	/**
	 * Enables VR if present
	 * @returns {void}
	 */
	enableVrIfPresent() {
		// Get the vrDevice to pass to the fullscreen API
		this.input = this.box3d.getApplication().getComponentByScriptId('input_controller_component');
		if (this.input) {
			this.input.whenVrDeviceAvailable((device) => {
				this.vrDevice = device;
				this.emit(EVENT_SHOW_VR_BUTTON);
			});
		}
	}

	/**
	 * REquest from the engine, the up and forward axes
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
	setupSceneLoadedEvent (entity) {
		entity.once('load', () => {
			this.reset();
			this.enableVrIfPresent();
			this.emit(EVENT_SCENE_LOADED);
		});
	}

	/**
	 * Remove instances specific to this preview from the scene.
	 * @returns {void}
	 */
	cleanupScene() {
		this.instances.forEach(function removeInstance(instance) {
			instance.destroy();
		});

		this.assets.forEach(function detroyPrefabAsset(asset) {
			asset.destroy();
		});

		this.instances.length = 0;
		this.assets.length = 0;
	}

	/**
	 * Unload HDR texture data until the next preview starts.
	 * @returns {void}
	 */
	cleanupIblMaps() {
		if (!this.box3d) {
			return;
		}

		let map = this.box3d.getEntityById('HDR_SPEC_ENV_MAP');
		if (map) {
			map.unload();
		}

		map = this.box3d.getEntityById('HDR_DIFF_ENV_MAP');
		if (map) {
			map.unload();
		}
	}

	/**
	 * Hide the Box3D canvas and pause the runtime.
	 * @returns {void}
	 */
	hideBox3d() {
		// Trigger a render to remove any artifacts.
		this.box3d.trigger('update');
		this.box3d.trigger('render');

		if (this.box3d.container) {
			if (this.box3d.canvas) {
				this.box3d.container.removeChild(this.box3d.canvas);
			}
			this.box3d.container = null;
		}

		// Prevent background updates and rendering.
		this.box3d.pause();
	}

	/**
	 * Make the Box3D canvas visible and resume updates.
	 * @returns {void}
	 */
	showBox3d() {
		if (this.box3d) {
			if (!this.box3d.container) {
				this.box3d.container = this.containerEl;
				this.box3d.container.appendChild(this.box3d.canvas);
			}

			// Resume updates and rendering.
			this.box3d.unpause();
		}
	}

	/**
	 * Sets the render mode
	 * @param {string} mode The mode identifier
	 * @returns {void}
	 */
	setRenderMode(mode) {
		if (this.box3d) {
			VAPI.globalEvents.trigger(EVENT_SET_RENDER_MODE, mode);
		}
	}

	/**
	 * Rotates the loaded model on the provided axis
	 * @param  {Object}  axis The axis
	 * @returns {void}
	 */
	rotateOnAxis(axis) {
		if (this.box3d) {
			this.box3d.trigger('rotate_on_axis', axis, true);
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

		this.box3d.trigger('set_axes', upAxis, forwardAxis, useTransition);
		//save these values back to forward and up, for metadata save
		this.axisUp = upAxis;
		this.axisForward = forwardAxis;
	}

	/**
	 * Handles entering fullscreen mode
	 * @returns {void}
	 */
	enterFullscreen() {
		// Nothing for now
	}

	/**
	 * Handles exiting fullscreen mode
	 * @returns {void}
	 */
	exitFullscreen() {
		this.disableVr();
	}

	/**
	 * Enable the VR system (HMD)
	 * @returns {void}
	 */
	enableVr() {
		if (!this.vrDevice || this.vrEnabled) {
			return;
		}

		this.vrEnabled = true;

		let camera = this.getCamera();

		let hmdComponent = camera.getComponentByScriptId('hmd_renderer_script');
		hmdComponent.enable();

		let vrControlsComponent = camera.getComponentByScriptId('preview_vr_controls');
		vrControlsComponent.enable();

		this.box3d.getBaseRenderer().setAttribute('clearAlpha', 1.0);
		this.box3d.getBaseRenderer().setAttribute('clearColor', 0x000000);
	}

	/**
	 * Disable the VR system (HMD)
	 * @returns {void}
	 */
	disableVr() {
		if (!this.vrDevice || !this.vrEnabled) {
			return;
		}

		this.vrEnabled = false;

		let camera = this.getCamera();

		let hmdComponent = camera.getComponentByScriptId('hmd_renderer_script');
		hmdComponent.disable();

		let vrControlsComponent = camera.getComponentByScriptId('preview_vr_controls');
		vrControlsComponent.disable();

		this.box3d.getBaseRenderer().setAttribute('clearAlpha', 0.0);
	}
}

export default Model3dRenderer;
