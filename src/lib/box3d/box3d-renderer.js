/* global VAPI, Box3DResourceLoader */
import EventEmitter from 'events';
import Cache from '../cache';
import {
    CACHE_KEY_BOX3D,
    EVENT_SHOW_VR_BUTTON,
    EVENT_SCENE_LOADED,
    EVENT_TRIGGER_RENDER
} from './box3d-constants';

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

class Box3DRenderer extends EventEmitter {

    /**
     * Base class that handles creation of and communication with Box3DRuntime
     * @constructor
     * @param {HTMLElement} containerEl the container element
     * @param {BoxSDK} [boxSdk] Box SDK instance, used for requests to Box
     * @returns {Image360Renderer} Image360Renderer instance
     */
    constructor(containerEl, boxSdk) {
        super();

        this.containerEl = containerEl;
        // Instances and assets created, that are not scene default entities, are
        // tracked for cleanup during recycling of box3d runtime
        this.instances = [];
        this.assets = [];
        this.vrEnabled = false;
        this.vrDevice = null;
        this.boxSdk = boxSdk;
        this.on(EVENT_TRIGGER_RENDER, this.handleOnRender);
    }

    /**
     * Load a box3d json
     * @param {object} options Options object, used to initialize the Box3DRuntime
     * and BoxSDK
     * @param {string} [options.token] The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.api] API URL base to make requests to
     * @param {object|null} [options.file] Information about the current box file we're using.
     * Used to get the parent.id of the box file.
     * @returns {Promise} A promise resulting in the newly created box3d
     */
    load(options) {
        return this.initBox3d(options);
    }

    /**
     * Hide 3d preview and destroy the loader
     * @returns {void}
     */
    destroy() {
        if (!this.box3d) {
            return;
        }

        this.hideBox3d();

        this.box3d.resourceLoader.destroy();

        this.removeListener(EVENT_TRIGGER_RENDER, this.handleOnRender);
    }

    /**
     * Reset preview state to defaults.
     * @returns {void}
     */
    reset() {
        const camera = this.getCamera();

        // Reset camera settings to default.
        if (camera) {
            camera.trigger('resetOrbitCameraController');
        }
    }

    /**
     * Get the scene's camera instance.
     * @returns {Box3DEntity} The camera instance
     */
    getCamera() {
        const scene = this.getScene();
        return scene ? scene.getChildById('CAMERA_ID') : null;
    }

    /**
     * Get the current aspect ratio of the preview area.
     * @private
     * @returns {float} Aspect ratio of the preview area
     */
    getAspect() {
        const width = this.containerEl.clientWidth;
        const height = this.containerEl.clientHeight;
        return width / height;
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
     * @param {string} [options.token] The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.api] API URL base to make requests to
     * @param {object|null} [options.file] Information about the current box file we're using.
     * Used to get the parent.id of the box file.
     * @returns {Promise} A promise that resolves with the created/cached box3d
     */
    initBox3d(options) {
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

        const opts = {
            token: options.token,
            apiBase: options.api,
            parentId: options.file.parent ? options.file.parent.id : null,
            boxSdk: this.boxSdk
        };

        const resourceLoader = new Box3DResourceLoader(options.file.id, options.file.file_version.id, opts);


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
                entities: options.sceneEntities,
                inputSettings: options.inputSettings || INPUT_SETTINGS,
                resourceLoader
            }, () => {
                const app = this.box3d.assetRegistry.getAssetById('APP_ASSET_ID');
                app.load(() => {
                    Cache.set(CACHE_KEY_BOX3D, this.box3d);
                    resolve(this.box3d);
                });
            })
            .catch(reject);
        });
    }


    /**
     * Enable VR and reset the scene, on scene load event fired from Box3DRuntime
     * @returns {[type]} [description]
     */
    onSceneLoad() {
        this.enableVrIfPresent();
        this.emit(EVENT_SCENE_LOADED);
    }

    /**
     * Hide the Box3D canvas and pause the runtime.
     * @returns {void}
     */
    hideBox3d() {
        // Trigger a render to remove any artifacts.
        this.box3d.trigger('update');
        this.handleOnRender();

        if (this.box3d.container && this.box3d.container.querySelector('canvas')) {
            this.box3d.container.removeChild(this.box3d.canvas);
        }
        this.box3d.container = null;


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
            this.box3d.trigger('resize');
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

        this.disableCameraControls();

        const camera = this.getCamera();

        const hmdComponent = camera.getComponentByScriptId('hmd_renderer_script');
        hmdComponent.enable();

        const vrControlsComponent = camera.getComponentByScriptId('preview_vr_controls');
        vrControlsComponent.enable();

        this.box3d.getRenderer().setAttribute('clearAlpha', 1.0);
        this.box3d.getRenderer().setAttribute('clearColor', 0x000000);
    }

    /**
     * Trigger an update and render event on the runtime
     * @returns {void}
     */
    handleOnRender() {
        if (!this.box3d) {
            return;
        }
        this.box3d.trigger('render');
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

        this.enableCameraControls();

        const camera = this.getCamera();

        const hmdComponent = camera.getComponentByScriptId('hmd_renderer_script');
        hmdComponent.disable();

        const vrControlsComponent = camera.getComponentByScriptId('preview_vr_controls');
        vrControlsComponent.disable();

        this.box3d.getRenderer().setAttribute('clearAlpha', 0.0);
    }

    /**
     * Enable the regular camera controls.
     * @returns {void}
     */
    enableCameraControls() {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId('preview_camera_controller');
        if (cameraControls) {
            cameraControls.enable();
        }
    }

    /**
     * Disable the regular camera controls. Useful when VR device is controlling camera.
     * @returns {void}
     */
    disableCameraControls() {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId('preview_camera_controller');
        if (cameraControls) {
            cameraControls.disable();
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
}

export default Box3DRenderer;
