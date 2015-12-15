/* global VAPI, Box3DResourceLoader */
'use strict';

import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import sceneEntities from './scene-entities';
import Cache from '../cache';
import {EVENT_SHOW_VR_BUTTON} from './image360-constants';

const CACHE_KEY_BOX3D = 'box3d';

const INPUT_SETTINGS = {
    vrEvents: {
        enable: true,
        position: false
    }
};

/**
 * Image360Renderer
 * This class handles rendering the preview of the 3D model using the Box3D
 * Runtime library.
 * @class
 */
@autobind
class Image360Renderer extends EventEmitter {
    /**
     * [constructor]
     * @param {HTMLElement} containerEl the container element
     * @param {BoxSDK} [boxSdk] Box SDK instance, used for requests to Box
     * @returns {Image360Renderer} Image360Renderer instance
     */
    constructor(containerEl, boxSdk) {
        super();
        this.containerEl = containerEl;
        this.vrEnabled = false;
        this.boxSdk = boxSdk;
        this.textureAsset;
    }

    /**
     * Called on preview destroy
     * @returns {void}
     */
    destroy() {
        if (!this.box3d) {
            return;
        }

        this.cleanupTexture();

        this.hideBox3d();

        this.box3d.resourceLoader.destroy();
        this.box3d.resourceLoader = null;
        this.box3d = null;
    }

    /**
     * Destroy the texture asset created from the Box file and unallocate any GPU memory
     * consumed by it.
     * @private
     * @method cleanupTexture
     * @returns {void}
     */
    cleanupTexture() {
        if (this.textureAsset) {
            this.textureAsset.destroy();
            this.textureAsset = undefined;
        }
    }

    /**
     * Load a box3d json
     * @param  {string} jsonUrl The url to the box3d json
     * @param  {object} options Options object
     * @returns {void}
     */
    load(jsonUrl, options) {
        return this.initBox3d(options)
            .then(this.loadPanoramaFile.bind(this, options.file));
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
            this.showBox3d();
            return Promise.resolve(this.box3d);
        }

        this.box3d = new VAPI.Engine();

        return new Promise((resolve, reject) => {
            this.box3d.initialize({
                container: this.containerEl,
                engineName: 'Default',
                entities: sceneEntities,
                inputSettings: INPUT_SETTINGS,
                resourceLoader
            }, () => {
                let app = this.box3d.assetRegistry.getAssetById('APP_ASSET_ID');
                app.load(() => {
                    Cache.set('box3d', this.box3d);
                    resolve(this.box3d);
                });
            }.bind(this));
        });
    }

    /**
     * Parse out the proper components to assemble a threejs mesh
     * @param {object} fileProperties The Box3D file properties
     * @returns {void}
     */
    loadPanoramaFile(fileProperties) {
        let scene;
        let skybox;
        scene = this.box3d.getEntityById('SCENE_ID');
        skybox = scene.getComponentByScriptId('skybox_renderer');
        skybox.setSkyboxTexture(null);

        this.textureAsset = this.box3d.assetRegistry.createAsset({
            type: 'texture2D',
            properties: {
                ignoreStream: true,
                generateMipmaps: false,
                filtering: 'Linear',
                uMapping: 'Clamp',
                vMapping: 'Clamp',
                fileId: fileProperties.id,
                filename: fileProperties.name,
                originalImage: fileProperties.extension === 'jpg' ||
                    fileProperties.fileExtension === 'png' ? true : false
            }
        });
        return new Promise((resolve, reject) => {
            this.textureAsset.load((texAsset) => {
                skybox.setSkyboxTexture(this.textureAsset.id);
                resolve();
            });
        });
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

export default Image360Renderer;
