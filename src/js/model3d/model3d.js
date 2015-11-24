/* eslint no-console:0 */
'use strict';

import '../../css/model3d/model3d.css';
import autobind from 'autobind-decorator';
import Base from '../base';
import Model3dControls from './model3d-controls';
import Model3dSettings from './model3d-settings';
import Model3dRenderer from './model3d-renderer';
import {EVENT_ENABLE_VR, EVENT_DISABLE_VR, EVENT_LOAD, EVENT_MISSING_ASSET, EVENT_RESET,
	EVENT_ROTATE_ON_AXIS, EVENT_SET_RENDER_MODE, EVENT_SCENE_LOADED, EVENT_SHOW_VR_BUTTON,
	EVENT_TOGGLE_FULLSCREEN, EVENT_ENTER_FULLSCREEN, EVENT_EXIT_FULLSCREEN} from './model3d-constants';
import 'file?name=boxsdk-0.0.2.js!../../third-party/model3d/boxsdk-0.0.2.js';
import 'file?name=box3d-resource-loader-0.0.3.js!../../third-party/model3d/box3d-resource-loader-0.0.3.js';
import 'file?name=box3d-runtime-0.7.8.js!../../third-party/model3d/box3d-runtime-0.7.8.js';

let Promise = global.Promise;
let document = global.document;
let Box = global.Box || {};

const CSS_CLASS_MODEL3D = 'box-preview-model3d';
const MODEL3D_LOAD_TIMEOUT_IN_MILLIS = 100000;
const MISSING_MAX = 4;

/**
 * Model3d
 * This is the entry point for the model3d preview.
 * @class
 */
@autobind
class Model3d extends Base {
	/**
	 * [constructor]
	 * @param {string|HTMLElement} container node
	 * @param {object} [options] some options
	 * @returns {Model3d} the Model3d object instance
	 */
	constructor(container, options) {
		super(container, options);

		this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
		this.wrapperEl.className = CSS_CLASS_MODEL3D;

		this.controls = new Model3dControls(this.wrapperEl);
		this.settings = new Model3dSettings(this.wrapperEl);
		this.renderer = new Model3dRenderer(this.wrapperEl);

		this.attachEventHandlers();
		this.instances = [];
		this.assets = [];
	}

	/**
	 * Attaches event handlers
	 * @returns {void}
	 */
	attachEventHandlers() {
		this.controls.on(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
		this.controls.on(EVENT_ENABLE_VR, this.handleEnableVr);
		this.controls.on(EVENT_DISABLE_VR, this.handleDisableVr);
		this.controls.on(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
		this.controls.on(EVENT_RESET, this.handleReset);
		this.renderer.on(EVENT_MISSING_ASSET, this.handleMissingAsset);
		this.renderer.on(EVENT_SCENE_LOADED, this.handleSceneLoaded);
		this.renderer.on(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
		this.settings.on(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
		this.on(EVENT_ENTER_FULLSCREEN, this.handleEnterFullscreen);
		this.on(EVENT_EXIT_FULLSCREEN, this.handleExitFullscreen);
	}

	/**
	 * Detaches event handlers
	 * @returns {void}
	 */
	detachEventHandlers() {
		this.controls.removeListener(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
		this.controls.removeListener(EVENT_ENABLE_VR, this.handleEnableVr);
		this.controls.removeListener(EVENT_DISABLE_VR, this.handleDisableVr);
		this.controls.removeListener(EVENT_SET_RENDER_MODE, this.handleSetRenderMode);
		this.controls.removeListener(EVENT_RESET, this.handleReset);
		this.renderer.removeListener(EVENT_MISSING_ASSET, this.handleMissingAsset);
		this.renderer.removeListener(EVENT_SCENE_LOADED, this.handleSceneLoaded);
		this.renderer.removeListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
		this.settings.removeListener(EVENT_ROTATE_ON_AXIS, this.handleRotateOnAxis);
		this.removeListener(EVENT_ENTER_FULLSCREEN, this.handleEnterFullscreen);
		this.removeListener(EVENT_EXIT_FULLSCREEN, this.handleExitFullscreen);
	}

	/**
	 * Loads a model 3d.
	 * @param {String} model3dJsonUrl The model3d to load
	 * @returns {Promise} A promise object which will be resolved/rejected on load
	 */
	load(model3dJsonUrl) {
		// Temp hack
		return new Promise((resolve, reject) => {
			this.renderer
				.load(model3dJsonUrl, this.options)
				.then(() => {
					this.emit(EVENT_LOAD);
					this.loaded = true;
					resolve(this);
				})
				.catch((err) => {
					console.error(err.message);
					console.error(err);
					reject(err);
				});

			setTimeout(() => {
				if (!this.loaded) {
					reject();
				}
			}, MODEL3D_LOAD_TIMEOUT_IN_MILLIS);
		});
	}

	/**
	 * Called on preview destroy
	 * @returns {void}
	 */
	destroy() {
		super.destroy();

		// @FIXME
		// if (this.missingAssets) {
		// 	this.missingAssets.length = 0;
		// }
		//
		// this.detachEventHandlers();
		//
		// this.controls.destroy();
		// this.settings.destroy();
		// this.renderer.destroy();
	}

	handleEnterFullscreen() {
		this.renderer.enterFullscreen();
	}

	handleExitFullscreen() {
		this.renderer.exitFullscreen();
	}

	/**
	 * Handles enable VR event
	 * @returns {void}
	 */
	handleEnableVr() {
		this.renderer.enableVr();
	}

	/**
	 * Handles disable VR event
	 * @returns {void}
	 */
	handleDisableVr() {
		this.renderer.disableVr();
	}

	/**
	 * Build up the list of missing assets
	 * @param {Object} data The error response for missing assets, contains the name and path of the asset
	 * @returns {void}
	 */
	handleMissingAsset(data) {
		this.missingAssets = this.missingAssets || [];

		//only store MISSING_MAX missing assets
		if (Object.keys(this.missingAssets).length >= MISSING_MAX) {
			return;
		}

		//storing in a dictionary due to progressive texture loading using the same name for different resolutions
		let key = data.fileName || data.assetName;
		this.missingAssets[key] = this.missingAssets[key] || data;
	}

	/**
	 * Handle reset event
	 * @returns {void}
	 */
	handleReset() {
		this.render.reset();
	}

	/**
	 * Handle model rotation event
	 * @param  {Object}  axis An object describing the axis to rotate on
	 * @returns {void}
	 */
	handleRotateOnAxis(axis) {
		this.renderer.rotateOnAxis(axis);
	}

	/**
	 * Handle scene loaded event
	 * @returns {void}
	 */
	handleSceneLoaded() {
		this.notifyAssetsMissing();

		// @TODO: Set forward/up axis
		// this.renderer.setAixRotation(axisUp, axisForward, false);
	}

	/**
	 * Handle show VR button event
	 * @returns {void}
	 */
	handleShowVrButton() {
		this.controls.showVrButton();
	}

	/**
	 *  Handle set render mode event
	 * @param  {string} mode The selected render mode string
	 * @returns {void}
	 */
	handleSetRenderMode(mode) {
		this.renderer.setRenderMode(mode);
	}
}

Box.Preview = Box.Preview || {};
Box.Preview.Model3d = Model3d;
global.Box = Box;
export default Model3d;
