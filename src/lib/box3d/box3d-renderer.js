/* global Box3D, Box3DResourceLoader, WEBVR, THREE */
import EventEmitter from 'events';
import Cache from '../cache';
import WEBVR from './WebVR';
import './VREffect';
import './VRControls';
import {
    CACHE_KEY_BOX3D,
    EVENT_SHOW_VR_BUTTON,
    EVENT_SCENE_LOADED,
    EVENT_TRIGGER_RENDER,
    EVENT_TRIGGER_RESIZE
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
        this.vrEffect = null;
        this.box3d = null;
        this.boxSdk = boxSdk;
        this.on(EVENT_TRIGGER_RENDER, this.handleOnRender);
        this.on(EVENT_TRIGGER_RESIZE, this.handleOnResize);
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
        if (this.vrEnabled) {
            this.disableVr();
        }
        this.hideBox3d();

        this.box3d.resourceLoader.destroy();

        this.removeListener(EVENT_TRIGGER_RENDER, this.handleOnRender);
        this.removeListener(EVENT_TRIGGER_RESIZE, this.handleOnResize);
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
     * Accessor for the runtime
     * @returns {Object} The Box3DRuntime that belongs to this component
     */
    getBox3D() {
        return this.box3d;
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
        if (!Box3D) {
            return Promise.reject(new Error('Missing Box3D'));
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

        this.box3d = new Box3D.Engine();

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
        this.emit(EVENT_SCENE_LOADED);
        this.enableVrIfPresent();
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
        if (this.vrEnabled) {
            return;
        }

        this.vrEnabled = true;

        this.disableCameraControls();

        const camera = this.getCamera();

        if (!this.vrControls) {
            this.vrControls = new THREE.VRControls(camera.runtimeData);
            this.vrControls.scale = 1;
        }

        this.box3d.on('preUpdate', this.updateVrControls, this);
        const renderView = camera.componentRegistry.getFirstByScriptId('render_view_component');
        renderView.effect = this.vrEffect;
        this.vrEffect.requestPresent();

        const renderer = this.box3d.getRenderer();
        renderer.setAttribute('renderOnDemand', false);
    }

    /**
     * Update the controls for VR when enabled
     * @private
     * @method updateVrControls
     * @returns {void}
     */
    updateVrControls() {
        this.vrControls.update();
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
     * Call the onResize of the engine
     * @returns {void}
     */
    handleOnResize() {
        if (!this.box3d) {
            return;
        }
        this.box3d.onResize();
    }

    /**
     * Disable the VR system (HMD)
     * @returns {void}
     */
    disableVr() {
        if (!this.vrEnabled) {
            return;
        }

        this.vrEnabled = false;

        this.enableCameraControls();

        const renderViewId = 'render_view_component';
        const camera = this.getCamera();
        if (camera) {
            const renderViewComponent = camera.componentRegistry.getFirstByScriptId(renderViewId);
            renderViewComponent.effect = null;
            this.box3d.off('preUpdate', this.updateVrControls, this);
        }
        this.vrEffect.exitPresent();
        const renderer = this.box3d.getRenderer();
        renderer.setAttribute('renderOnDemand', true);
        this.box3d.needsRender = true;
    }

    /**
     * Enable the regular camera controls.
     * @returns {void}
     */
    enableCameraControls(cameraControllerId = 'preview_camera_controller') {
        const camera = this.getCamera();
        const cameraControls = camera.componentRegistry.getFirstByScriptId(cameraControllerId);
        if (cameraControls) {
            cameraControls.enable();
        }
    }

    /**
     * Disable the regular camera controls. Useful when VR device is controlling camera.
     * @returns {void}
     */
    disableCameraControls(cameraControllerId = 'preview_camera_controller') {
        const camera = this.getCamera();
        const cameraControls = camera.componentRegistry.getFirstByScriptId(cameraControllerId);
        if (cameraControls) {
            cameraControls.disable();
        }
    }

    /**
     * Enables VR if present
     * @returns {void}
     */
    enableVrIfPresent() {
        if (WEBVR.isLatestAvailable()) {
            const renderer = this.box3d.getThreeRenderer();
            if (!this.vrEffect) {
                this.vrEffect = new THREE.VREffect(renderer);
                const rendererSize = renderer.getSize();
                this.vrEffect.setSize(rendererSize.width, rendererSize.height);
            }
            this.emit(EVENT_SHOW_VR_BUTTON);
        }
    }
}

export default Box3DRenderer;
