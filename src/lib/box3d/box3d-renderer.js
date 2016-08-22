/* global Box3D, Box3DResourceLoader, WEBVR, THREE */
import Browser from '../browser';
import EventEmitter from 'events';
import Cache from '../cache';
import WEBVR from './WebVR';
import './VREffect';
import './VRControls';
import {
    CACHE_KEY_BOX3D,
    EVENT_SHOW_VR_BUTTON,
    EVENT_SCENE_LOADED,
    EVENT_TRIGGER_RENDER
} from './box3d-constants';

const WebVRConfig = window.WebVRConfig = {
    // Forces availability of VR mode, even for non-mobile devices.
    FORCE_ENABLE_VR: false,

    // Complementary filter coefficient. 0 for accelerometer, 1 for gyro.
    K_FILTER: 0.98,

    // How far into the future to predict during fast motion (in seconds).
    PREDICTION_TIME_S: 0.040,

    // Flag to disable touch panner. In case you have your own touch controls.
    TOUCH_PANNER_DISABLED: false,

    // Flag to disabled the UI in VR Mode.
    CARDBOARD_UI_DISABLED: false, // Default: false

    // Flag to disable the instructions to rotate your device.
    ROTATE_INSTRUCTIONS_DISABLED: false, // Default: false.

    // Enable yaw panning only, disabling roll and pitch. This can be useful
    // for panoramas with nothing interesting above or below.
    YAW_ONLY: false,

    // To disable keyboard and mouse controls, if you want to use your own
    // implementation.
    MOUSE_KEYBOARD_CONTROLS_DISABLED: true,

    // Prevent the polyfill from initializing immediately. Requires the app
    // to call InitializeWebVRPolyfill() before it can be used.
    DEFER_INITIALIZATION: false,

    // Enable the deprecated version of the API (navigator.getVRDevices).
    ENABLE_DEPRECATED_API: false,

    // Scales the recommended buffer size reported by WebVR, which can improve
    // performance.
    // UPDATE(2016-05-03): Setting this to 0.5 by default since 1.0 does not
    // perform well on many mobile devices.
    BUFFER_SCALE: 0.5,

    // Allow VRDisplay.submitFrame to change gl bindings, which is more
    // efficient if the application code will re-bind its resources on the
    // next frame anyway. This has been seen to cause rendering glitches with
    // THREE.js.
    // Dirty bindings include: gl.FRAMEBUFFER_BINDING, gl.CURRENT_PROGRAM,
    // gl.ARRAY_BUFFER_BINDING, gl.ELEMENT_ARRAY_BUFFER_BINDING,
    // and gl.TEXTURE_BINDING_2D for texture unit 0.
    DIRTY_SUBMIT_FRAME_BINDINGS: false
};

// Trickin' ESlint into thinking this global is being used here.
WebVRConfig.FORCE_ENABLE_VR = false;

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

        window.removeEventListener('vrdisplaypresentchange', this.onVrPresentChange.bind(this));

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

        const resourceLoader = new Box3DResourceLoader(this.boxSdk);

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
        this.initVrIfPresent();
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
     * Toggle the VR system (HMD)
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
     * Enable the VR system (HMD)
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
        this.vrControls = new THREE.VRControls(camera.runtimeData);
        this.vrControls.scale = 1;
        this.vrControls.standing = true;
        this.vrControls.userHeight = 1;
        window.vrControls = this.vrControls;

        const renderView = camera.componentRegistry.getFirstByScriptId('render_view_component');
        renderView.effect = this.vrEffect;

        // Start doing updates of the VR controls.
        this.box3d.on('preUpdate', this.updateVrControls, this);

        // Start rendering to the VR device.
        setTimeout(() => {
            // Because of a current bug in Chromium, we need to update the controls before
            // presenting so that device.getPose() is called before device.submitFrame().
            // Otherwise, crashes ensue. We need the setTimeout so that the controls have a
            // chance to receive the vr device list from the browser.
            this.vrControls.update();
            this.vrEffect.requestPresent();
        }, 100);

        // Render every frame to make sure that we're as responsive as possible.
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
    resize() {
        if (!this.box3d) {
            return;
        }
        this.box3d.trigger('resize');
    }

    /**
     * Disable the VR system (HMD)
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

        const renderViewId = 'render_view_component';
        const camera = this.getCamera();
        if (camera) {
            const renderViewComponent = camera.componentRegistry.getFirstByScriptId(renderViewId);
            renderViewComponent.effect = null;
        }
        this.box3d.off('preUpdate', this.updateVrControls, this);

        this.vrEffect.exitPresent().then(() => {
            const renderer = this.box3d.getRenderer();
            renderer.setAttribute('renderOnDemand', true);
            this.box3d.needsRender = true;
        });
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
     * Callback for vrdisplaypresentchange event. On mobile, this is how we know the back button
     * was pressed in VR mode so we can disable the VR controls and rendering effect.
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
     * Enables VR if present
     * @returns {void}
     */
    initVrIfPresent() {
        if (WEBVR.isLatestAvailable()) {
            navigator.getVRDisplays().then((devices) => {
                this.vrDeviceHasPosition = devices.some((device) => device.capabilities.hasPosition);

                // Only enable the VR button if we found a device that we can use.
                if (devices.length) {
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
                }
            });
        }
    }
}

export default Box3DRenderer;
