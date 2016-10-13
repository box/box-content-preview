/* global Box3D, Box3DResourceLoader, THREE */
import Browser from '../../browser';
import EventEmitter from 'events';
import Cache from '../../cache';
import WEBVR from './WebVR'; // TODO(jholdstock): Move this to /third-party
import './VREffect'; // TODO(jholdstock): Move this to /third-party
import './VRControls'; // TODO(jholdstock): Move this to /third-party
import './VRConfig'; // For Global VR Config setup
import {
    CACHE_KEY_BOX3D,
    EVENT_SHOW_VR_BUTTON,
    EVENT_SCENE_LOADED,
    EVENT_TRIGGER_RENDER
} from './box3d-constants';

const RENDER_VIEW_COMPONENT_ID = 'render_view_component';
const PREVIEW_CAMERA_CONTROLLER_ID = 'preview_camera_controller';

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
     *
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
        this.vrDeviceHasPosition = false;
        this.box3d = null;
        this.boxSdk = boxSdk;
        this.on(EVENT_TRIGGER_RENDER, this.handleOnRender);
    }

    /**
     * Load a box3d json.
     *
     * @param {Object} options Options object, used to initialize the Box3DRuntime
     * and BoxSDK
     * @param {string} [options.token] The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.api] API URL base to make requests to
     * @param {Object|null} [options.file] Information about the current box file we're using.
     * Used to get the parent.id of the box file.
     * @returns {Promise} A promise resulting in the newly created box3d
     */
    load(options = {}) {
        return this.initBox3d(options);
    }

    /**
     * Hide 3d preview and destroy the loader.
     *
     * @returns {void}
     */
    destroy() {
        this.removeListener(EVENT_TRIGGER_RENDER, this.handleOnRender);
        window.removeEventListener('vrdisplaypresentchange', this.onVrPresentChange.bind(this));

        if (!this.box3d) {
            return;
        }

        this.disableVr();
        this.hideBox3d();
        this.box3d.resourceLoader.destroy();
    }

    /**
     * Reset preview state to defaults.
     *
     * @returns {void}
     */
    reset() {
        const camera = this.getCamera();

        // Reset camera settings to default.
        if (camera && !this.vrEnabled) {
            camera.trigger('resetOrbitCameraController');
        }
    }

    /**
     * Get the scene's camera instance.
     *
     * @returns {Box3DEntity} The camera instance
     */
    getCamera() {
        return this.box3d ? this.box3d.getObjectById('CAMERA_ID') : null;
    }

    /**
     * Get the current aspect ratio of the preview area.
     *
     * @private
     * @returns {number} Aspect ratio of the preview area
     */
    getAspect() {
        const width = this.containerEl.clientWidth;
        const height = this.containerEl.clientHeight;
        return width / height;
    }

    /**
     * Get the scene asset.
     *
     * @returns {Box3DEntity} The scene asset
     */
    getScene() {
        return this.box3d ? this.box3d.getAssetById('SCENE_ID') : null;
    }

    /**
     * Accessor for the runtime.
     *
     * @returns {Object} The Box3DRuntime that belongs to this component
     */
    getBox3D() {
        return this.box3d;
    }

    /**
     * Initialize the Box3D engine.
     *
     * @param {Object} options the preview options object
     * @param {string} [options.token] The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.api] API URL base to make requests to
     * @param {Object|null} [options.file] Information about the current box file we're using.
     * Used to get the parent.id of the box file.
     * @returns {Promise} A promise that resolves with the created/cached box3d
     */
    initBox3d(options = {}) {
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

        const resourceLoader = new Box3DResourceLoader(this.boxSdk);

        if (Cache.get(CACHE_KEY_BOX3D)) {
            return this.getBox3DFromCache(resourceLoader);
        }

        return this.createBox3d(resourceLoader, options.sceneEntities, options.inputSettings);
    }

    /**
     * Get the Box3D runtime instance from cache
     *
     * @param {Object} resourceLoader The resource loader used to load assets used by the box3d engine
     * @returns {Promise} A promise that resolves with the Box3D runtime instance
     */
    getBox3DFromCache(resourceLoader) {
        this.box3d = Cache.get(CACHE_KEY_BOX3D);
        // Assign fresh resource loader
        this.box3d.resourceLoader = resourceLoader;
        // Force render and resize events for first render
        this.showBox3d();
        return Promise.resolve(this.box3d);
    }

    /**
     * Create a new Box3D engine.
     *
     * @param {Object} resourceLoader The resource loader used to load assets used by the box3d engine
     * @param {Array} [sceneEntities] The descriptor of the default scene. See ./scene-entities.js
     * @param {Object} [inputSettings] Config for the input controller of the Box3D Engine
     * @returns {Promise} A promise that resolves with the Box3D Engine.
     */
    createBox3d(resourceLoader, sceneEntities, inputSettings = INPUT_SETTINGS) {
        const box3d = new Box3D.Engine();

        return new Promise((resolve, reject) => {
            box3d.initialize({
                container: this.containerEl,
                engineName: 'Default',
                entities: sceneEntities,
                inputSettings,
                resourceLoader
            }, () => {
                const app = box3d.getAssetById('APP_ASSET_ID');
                app.load(() => {
                    this.box3d = box3d;
                    Cache.set(CACHE_KEY_BOX3D, this.box3d);
                    resolve(this.box3d);
                });
            })
            .catch(reject);
        });
    }

    /**
     * Enable VR and reset the scene, on scene load event fired from Box3DRuntime.
     *
     * @returns {void}
     */
    onSceneLoad() {
        this.emit(EVENT_SCENE_LOADED);
        this.initVrIfPresent();
    }

    /**
     * Make the Box3D canvas visible and resume updates.
     *
     * @returns {void}
     */
    showBox3d() {
        if (!this.box3d) {
            return;
        }

        if (!this.box3d.container) {
            this.box3d.container = this.containerEl;
            this.box3d.container.appendChild(this.box3d.canvas);
        }

        // Resume updates and rendering.
        this.box3d.unpause();
        this.resize();
    }

    /**
     * Hide the Box3D canvas and pause the runtime.
     *
     * @returns {void}
     */
    hideBox3d() {
        if (!this.box3d) {
            return;
        }
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
     * Toggle the VR system (HMD).
     *
     * @returns {void}
     */
    toggleVr() {
        if (this.vrEnabled) {
            this.disableVr();
        } else {
            this.enableVr();
        }
    }

    /**
     * Initialize Box3D camera controls for use with VR display.
     *
     * @param {Object} camera The Box3D camera entity to create VR controls for.
     * @returns {void}
     */
    initCameraForVr(camera) {
        if (this.vrControls) {
            this.vrControls.dispose();
        }
        this.vrControls = new THREE.VRControls(camera.runtimeData);
        this.vrControls.scale = 1;
        this.vrControls.standing = true;
        this.vrControls.userHeight = 1;
        this.vrControls.resetPose();
    }

    /**
     * Enable the VR system (HMD).
     *
     * @returns {void}
     */
    enableVr() {
        if (this.vrEnabled) {
            return;
        }

        this.disableCameraControls();

        // Create the controls every time we enter VR mode so that we're always using the current
        // camera.
        const camera = this.getCamera();
        this.initCameraForVr(camera);

        const renderView = camera.componentRegistry.getFirstByScriptId(RENDER_VIEW_COMPONENT_ID);
        renderView.effect = this.vrEffect;
        renderView.setAttribute('enablePreRenderFunctions', false);

        // Start doing updates of the VR controls.
        this.box3d.on('preUpdate', this.updateVrControls, this);

        // Start rendering to the VR device.
        // #TODO(@mbond): Can we remove this setTimeout?
        setTimeout(this.renderVR.bind(this), 100);

        // Render every frame to make sure that we're as responsive as possible.
        const renderer = this.box3d.getRenderer();
        renderer.setAttribute('renderOnDemand', false);
    }

    /**
     * Render a single frame with the VR effect applied
     *
     * @returns {void}
     */
    renderVR() {
        if (this.vrEffect) {
            return;
        }
        // Because of a current bug in Chromium, we need to update the controls before
        // presenting so that device.getPose() is called before device.submitFrame().
        // Otherwise, crashes ensue. We need the setTimeout so that the controls have a
        // chance to receive the vr device list from the browser.
        this.updateVrControls();
        this.vrEffect.requestPresent();
    }

    /**
     * Disable the VR system (HMD).
     *
     * @returns {void}
     */
    disableVr() {
        if (!this.vrEnabled) {
            return;
        }

        this.vrControls.dispose();
        this.vrControls = undefined;

        this.enableCameraControls();
        this.reset();

        const camera = this.getCamera();
        if (camera) {
            const renderViewComponent = camera.componentRegistry.getFirstByScriptId(RENDER_VIEW_COMPONENT_ID);
            renderViewComponent.effect = null;
            renderViewComponent.setAttribute('enablePreRenderFunctions', true);
        }
        this.box3d.off('preUpdate', this.updateVrControls, this);

        this.vrEffect.exitPresent().then(() => {
            const renderer = this.box3d.getRenderer();
            renderer.setAttribute('renderOnDemand', true);
            this.resize();
        });
    }


    /**
     * Update the controls for VR when enabled.
     *
     * @private
     * @returns {void}
     */
    updateVrControls() {
        if (!this.vrControls) {
            return;
        }
        this.vrControls.update();
    }

    /**
     * Trigger an update and render event on the runtime.
     *
     * @returns {void}
     */
    handleOnRender() {
        if (!this.box3d) {
            return;
        }
        this.box3d.trigger('render');
    }

    /**
     * Call the onResize of the engine.
     *
     * @returns {void}
     */
    resize() {
        if (!this.box3d) {
            return;
        }
        this.box3d.trigger('resize');
    }

    /**
     * Enable the regular camera controls.
     *
     * @returns {void}
     */
    enableCameraControls(cameraControllerId = PREVIEW_CAMERA_CONTROLLER_ID) {
        const camera = this.getCamera();
        const cameraControls = camera.componentRegistry.getFirstByScriptId(cameraControllerId);
        if (cameraControls) {
            cameraControls.enable();
        }
    }

    /**
     * Disable the regular camera controls. Useful when VR device is controlling camera.
     *
     * @returns {void}
     */
    disableCameraControls(cameraControllerId = PREVIEW_CAMERA_CONTROLLER_ID) {
        const camera = this.getCamera();
        const cameraControls = camera.componentRegistry.getFirstByScriptId(cameraControllerId);
        if (cameraControls) {
            cameraControls.disable();
        }
    }

    /**
     * Callback for vrdisplaypresentchange event. On mobile, this is how we know the back button
     * was pressed in VR mode so we can disable the VR controls and rendering effect.
     *
     * @return {void}
     */
    onVrPresentChange() {
        // We only want to call disable when we're on mobile.
        if (Browser.isMobile() && this.vrEnabled) {
            this.disableVr();
        }
        this.vrEnabled = !this.vrEnabled;
    }

    /**
     * Enables VR if present.
     *
     * @returns {void}
     */
    initVrIfPresent() {
        if (!WEBVR.isLatestAvailable() || Box3D.isTablet()) {
            return;
        }

        navigator.getVRDisplays().then((devices) => {
            // Only setup and allow VR if devices present
            if (!devices.length || !this.getBox3D()) {
                return;
            }

            this.vrDeviceHasPosition = devices.some((device) => device.capabilities.hasPosition);

            // Create the VR Effect object that handles rendering left and right views.
            const threeRenderer = this.box3d.getThreeRenderer();
            if (!this.vrEffect) {
                this.vrEffect = new THREE.VREffect(threeRenderer, this.box3d.getRenderer());
                const rendererSize = threeRenderer.getSize();
                this.vrEffect.setSize(rendererSize.width, rendererSize.height);
            }

            if (!this.vrInitialized) {
                window.addEventListener('vrdisplaypresentchange', this.onVrPresentChange.bind(this));
                this.vrInitialized = true;
            }

            this.emit(EVENT_SHOW_VR_BUTTON);
        });
    }
}

export default Box3DRenderer;
