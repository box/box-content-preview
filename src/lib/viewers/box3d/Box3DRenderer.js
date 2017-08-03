/* global Box3D */
/* eslint no-param-reassign:0 */
import EventEmitter from 'events';
import {
    EVENT_SHOW_VR_BUTTON,
    EVENT_SCENE_LOADED,
    EVENT_WEBGL_CONTEXT_RESTORED,
    EVENT_WEBGL_CONTEXT_LOST
} from './box3DConstants';
import { MODEL3D_STATIC_ASSETS_VERSION } from '../../constants';

const PREVIEW_CAMERA_CONTROLLER_ID = 'orbit_camera';
const OCULUS_TOUCH_LEFT = 'oculusTouchLeft';
const OCULUS_TOUCH_RIGHT = 'oculusTouchRight';
const HTC_VIVE = 'viveController';

/**
 * Append shared link headers to an XHR Object
 * @param {XMLHttpRequest} xhr - The XMLHttpRequest object to attach the header to.
 * @param {string} sharedLink - The Box Content API shared link header to append to the XMLHttpRequest.
 * @param {string} [sharedLinkPassword] - The password for the Box Content API shared link header.
 * @return {void}
 */
function appendSharedLinkHeaders(xhr, sharedLink, sharedLinkPassword) {
    let sharePasswordParam = '';
    if (sharedLinkPassword) {
        const sharePassEncoded = encodeURI(sharedLinkPassword);
        sharePasswordParam = `&shared_link_password=${sharePassEncoded}`;
    }
    xhr.setRequestHeader('boxapi', `shared_link=${encodeURI(sharedLink)}${sharePasswordParam}`);
}

class Box3DRenderer extends EventEmitter {
    /** @property {HTMLElement} - Parent container element */
    containerEl;

    /** @property {boolean} - Flag for checking if VR mode is enabled */
    vrEnabled = false;

    /** @property {Box3D.NodeObject[]} - List of controller objects in the 3D scene */
    vrGamepads = [];

    /** @property {Box3D} - Box3D engine instance */
    box3d;

    /** @property {BoxSDK} - BoxSDK instance. Used for API calls to Box Metadata */
    boxSdk;

    /** @property {Object} - Default X, Y, Z position for the scene camera in 3D space */
    savedCameraPosition;

    /** @property {Object} - Default X, Y, Z, W quaternion for the scene camera in 3D space */
    savedCameraQuaternion;

    /** @property {Object} - Mapping of promises that each resolve when it's controller model file is loaded */
    vrGamepadLoadPromises = {};

    /** @property {Promise} - Promise that resolves IFF a common model file is loaded for left AND right controllers */
    vrCommonLoadPromise;

    /** @property {string} - Base URL for all static assets this file uses to be loaded from */
    staticBaseURI;

    /**
     * Base class that handles creation of and communication with Box3DRuntime
     *
     * @constructor
     * @param {HTMLElement} containerEl - the container element
     * @param {BoxSDK} [boxSdk] - Box SDK instance, used for requests to Box
     * @return {Image360Renderer} Image360Renderer instance
     */
    constructor(containerEl, boxSdk) {
        super();

        this.containerEl = containerEl;
        this.boxSdk = boxSdk;

        this.handleContextLost = this.handleContextLost.bind(this);
        this.handleContextRestored = this.handleContextRestored.bind(this);
    }

    /**
     * Load a box3d json.
     *
     * @param {Object} assetUrl - Url template.
     * @param {Object} options - Options object, used to initialize the Box3DRuntime
     * and BoxSDK
     * @param {string} [options.token] - The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.apiHost] - API URL base to make requests to
     * @param {Object|null} [options.file] - Information about the current box file we're using.
     * Used to get the parent.id of the box file.
     * @return {Promise} A promise resulting in the newly created box3d
     */
    load(assetUrl, options = {}) {
        this.staticBaseURI = options && options.location ? options.location.staticBaseURI : '';
        return this.initBox3d(options);
    }

    /**
     * Hide 3d preview and destroy the loader.
     *
     * @return {void}
     */
    destroy() {
        if (!this.box3d) {
            return;
        }

        if (this.box3d.canvas) {
            this.box3d.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
            this.box3d.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
        }

        this.disableVr();

        this.box3d.destroy();
        this.box3d = null;
    }

    /**
     * Reset preview state to defaults.
     *
     * @return {void}
     */
    reset() {
        this.resetView();
    }

    /**
     * Reset the camera settings to defaults.
     *
     * @return {void}
     */
    resetView() {
        const camera = this.getCamera();

        // Reset camera settings to default.
        if (camera) {
            camera.setPosition(this.savedCameraPosition.x, this.savedCameraPosition.y, this.savedCameraPosition.z);
            camera.setQuaternion(
                this.savedCameraQuaternion.x,
                this.savedCameraQuaternion.y,
                this.savedCameraQuaternion.z,
                this.savedCameraQuaternion.w
            );
        }
    }

    /**
     * Get the scene's camera instance.
     *
     * @return {Box3DEntity} The camera instance
     */
    getCamera() {
        return this.box3d ? this.box3d.getObjectByClass(Box3D.CameraObject) : null;
    }

    /**
     * Get the scene object.
     *
     * @return {SceneObject} The scene object
     */
    getScene() {
        return this.box3d ? this.box3d.getObjectByClass(Box3D.SceneObject) : null;
    }

    /**
     * Accessor for the runtime.
     *
     * @return {Object} The Box3DRuntime that belongs to this component
     */
    getBox3D() {
        return this.box3d;
    }

    /**
     * Configure the provided XHR object with auth token and shared link headers.
     * Used exclusively by the Box3DRuntime.
     *
     * @param {Object} headerConfig - Configuration parameters to be applied to the created XMLHttpRequest.
     * @param {string} path - The URL to the resource to load. See Box3D.XhrResourceLoader().
     * @param {Object} params - Addition parameters provided by the Box3D Runtime. See Box3D.XhrResourceLoader().
     * @return {Promise} A promise that resolves in the newly created and configured XMLHttpRequest object.
     */
    configureXHR(headerConfig, path, params = {}) {
        const xhr = new XMLHttpRequest();

        xhr.open('GET', path);

        if (!params.isExternal) {
            xhr.setRequestHeader('Authorization', `Bearer ${headerConfig.token}`);

            if (headerConfig.sharedLink) {
                appendSharedLinkHeaders(xhr, headerConfig.sharedLink, headerConfig.sharedLinkPassword);
            }
        }

        return Promise.resolve(xhr);
    }

    /**
     * Load Box3D entities from a JSON file specified with the provided path.
     * @param {string} url - A path to a JSON file containing Box3D entity descriptions.
     * @return {Promise} - A promise that resolves on completion of the load.
     */
    getEntitiesFromUrl(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open('GET', url);

            /**
             * Callback for xhr completion.
             * @return {void}
            */
            const complete = () => {
                resolve(JSON.parse(xhr.responseText));
            };

            xhr.addEventListener('load', complete);
            xhr.addEventListener('error', reject);

            xhr.send();
        });
    }

    /**
     * Initialize the Box3D engine.
     *
     * @param {Object} options - the preview options object
     * @param {string} [options.token] - The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.apiHost] - API URL base to make requests to
     * @param {Object|null} [options.file] - Information about the current box file we're using.
     * Used to get the parent.id of the box file.
     * @param {Object|string} [options.box3dApplication] - Path to a json file published from Box3D Studio (or the json itself).
     * @return {Promise} A promise that resolves with the created box3d
     */
    initBox3d(options = {}) {
        // Initialize global modules.
        if (!Box3D) {
            return Promise.reject(new Error('Missing Box3D'));
        }

        if (!options.file || !options.file.file_version) {
            return Promise.reject(new Error('Missing file version'));
        }

        const resourceLoader = new Box3D.XhrResourceLoader(this.configureXHR.bind(this, options));
        const json = options && options.box3dApplication ? options.box3dApplication : {};
        let getApplication = Promise.resolve([]);
        if (typeof json === 'object') {
            getApplication = Promise.resolve(json);
        } else if (typeof json === 'string') {
            getApplication = this.getEntitiesFromUrl(json);
        }

        return getApplication.then((applicationEntities) =>
            this.createBox3d(resourceLoader, options.sceneEntities, applicationEntities.entities, `${options.apiHost}`)
        );
    }

    /**
     * Create a new Box3D engine.
     *
     * @param {Object} resourceLoader - The resource loader used to load assets used by the box3d engine
     * @param {Array} [sceneEntities] - The descriptor of the default scene. See ./scene-entities.js
     * @param {Array} [applicationEntities] - Array of entities published from Box3D Studio project.
     * @param {string} [apiBase] - Optional base path for Box API calls.
     * @return {Promise} A promise that resolves with the Box3D Engine.
     */
    createBox3d(resourceLoader, sceneEntities, applicationEntities, apiBase) {
        const box3d = new Box3D.Engine({
            container: this.containerEl,
            engineName: 'Default',
            resourceLoader,
            apiBase
        });
        if (box3d.canvas) {
            box3d.canvas.addEventListener('webglcontextlost', this.handleContextLost);
            box3d.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
        }

        return new Promise((resolve) => {
            if (applicationEntities) {
                box3d.addEntities(applicationEntities);
            }
            let app = box3d.getAssetByClass(Box3D.ApplicationAsset);
            box3d.addEntities(sceneEntities);
            if (!app) {
                app = box3d.getAssetByClass(Box3D.ApplicationAsset);
            }
            app.load();
            this.box3d = box3d;
            resolve(this.box3d);
        });
    }

    /**
     * Catch loss of WebGL context and prevent browser default behavior
     * of displaying an error message. This could happen for various reasons
     * including the browser trying to recover from a driver error to another
     * application requesting a context.
     *
     * @param {Event} event The event for the context loss.
     * @return {void}
     */
    handleContextLost(event) {
        event.preventDefault();
        this.emit(EVENT_WEBGL_CONTEXT_LOST);
    }

    /**
     * When the WebGL context has been restored by the browser, reload the preview.
     *
     * @return {void}
     */
    handleContextRestored() {
        this.emit(EVENT_WEBGL_CONTEXT_RESTORED);
    }

    /**
     * Enable VR and reset the scene, on scene load event fired from Box3DRuntime.
     *
     * @return {void}
     */
    onSceneLoad() {
        const camera = this.getCamera();
        if (camera) {
            this.savedCameraPosition = camera.getPosition();
            this.savedCameraQuaternion = camera.getQuaternion();
        }
        // Reset the scene.
        this.reset();
        this.emit(EVENT_SCENE_LOADED);
        this.initVr();
    }

    /**
     * Toggle the VR system (HMD).
     *
     * @return {void}
     */
    toggleVr() {
        if (this.vrEnabled) {
            this.disableVr();
        } else {
            this.enableVr();
        }
    }

    /**
     * Handle returning behaviour to normal after leaving VR.
     *
     * @return {void}
     */
    onDisableVr() {
        this.enableCameraControls();
        this.box3d.trigger('resize');
        const renderer = this.box3d.getRenderer();
        renderer.setAttribute('renderOnDemand', true);
        this.hideVrGamepads();
        const display = this.box3d.getVrDisplay();
        this.vrEnabled = display && display.isPresenting;
        this.resetView();
    }

    /**
     * Handle turning on VR.
     *
     * @return {void}
     */
    onEnableVr() {
        this.disableCameraControls();
        // Render every frame to make sure that we're as responsive as possible.
        const renderer = this.box3d.getRenderer();
        renderer.setAttribute('renderOnDemand', false);
        this.showVrGamepads();
        const display = this.box3d.getVrDisplay();
        this.vrEnabled = display && display.isPresenting;
    }

    /**
     * Enable the VR system (HMD).
     *
     * @return {void}
     */
    enableVr() {
        if (this.vrEnabled) {
            return;
        }

        this.box3d.trigger('enableVrRendering');
    }

    /**
     * Disable the VR system (HMD).
     *
     * @return {void}
     */
    disableVr() {
        if (!this.vrEnabled) {
            return;
        }

        this.box3d.trigger('disableVrRendering');
    }

    /**
     * Call the onResize of the engine.
     *
     * @return {void}
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
     * @param {string} cameraControllerId - Camera to enable
     * @return {void}
     */
    enableCameraControls(cameraControllerId = PREVIEW_CAMERA_CONTROLLER_ID) {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId(cameraControllerId);
        if (cameraControls) {
            cameraControls.enable();
        }
    }

    /**
     * Disable the regular camera controls. Useful when VR device is controlling camera.
     *
     * @param {string} cameraControllerId - Camera to disable
     * @return {void}
     */
    disableCameraControls(cameraControllerId = PREVIEW_CAMERA_CONTROLLER_ID) {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId(cameraControllerId);
        if (cameraControls) {
            cameraControls.disable();
        }
    }

    /**
     * Enables VR if present.
     *
     * @return {void}
     */
    initVr() {
        if (Box3D.isTablet()) {
            return;
        }

        const app = this.box3d.getApplication();
        const vrPresenter = app.getComponentByScriptId('vr_presenter');
        if (!vrPresenter) {
            return;
        }
        vrPresenter.whenDisplaysAvailable((displays) => {
            if (displays.length) {
                this.emit(EVENT_SHOW_VR_BUTTON);
                this.box3d.listenTo(this.box3d, 'vrRenderingDisabled', this.onDisableVr.bind(this));
                this.box3d.listenTo(this.box3d, 'vrRenderingEnabled', this.onEnableVr.bind(this));

                this.createVrGamepads();
            }
        });
    }

    /**
     * Create two Box3D objects that represent left and right VR hand controllers.
     * If appropriate controllers are detected, models will be loaded and rendered into the scene.
     * @return {void}
     */
    createVrGamepads() {
        if (this.vrGamepads.length) {
            return;
        }

        this.vrGamepads = [Box3D.Handedness.Left, Box3D.Handedness.Right].map((handedness) =>
            this.createVrGamepad(handedness)
        );
    }

    /**
     * Create and return a Box3D object that tracks with the VR hand controller and renders the appropriate model.
     * @param {Box3D.Handedness} handedness The preferred hand that this object will represent.
     * @return {Box3D.NodeObject} The object that represents the controller.
     */
    createVrGamepad(handedness) {
        const controller = this.box3d.createNode();

        /**
         * Gamepad model load handler.
         *
         * @param {Object} entities - Loaded entities
         * @return {void}
         */
        const onGamepadModelLoad = (entities) => {
            const prefab = entities.find((e) => {
                return e.type === 'prefab';
            });
            const prefabAsset = this.box3d.getAssetById(prefab.id);
            controller.addChild(prefabAsset.createInstance());
            if (this.vrEnabled) {
                this.showVrGamepads();
            } else {
                this.hideVrGamepads();
            }
        };

        /**
         * Gamepad found handler.
         *
         * @param {Object} gamepad - Gamepad object
         * @return {void}
         */
        const onGamepadFound = (gamepad) => {
            let controllerName = null;
            let commonEntities = null;
            if (gamepad.id.indexOf('Oculus') > -1) {
                commonEntities = 'oculusTouchCommon';
                switch (gamepad.hand) {
                    case 'left':
                        controllerName = OCULUS_TOUCH_LEFT;
                        break;
                    default:
                        controllerName = OCULUS_TOUCH_RIGHT;
                        break;
                }
            } else if (gamepad.id.indexOf('OpenVR') > -1) {
                controllerName = HTC_VIVE;
            }
            // If there are common entities for left-right controllers, load them first.
            if (!this.vrCommonLoadPromise) {
                if (commonEntities) {
                    this.vrCommonLoadPromise = this.box3d.addRemoteEntities(
                        `${this
                            .staticBaseURI}third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/WebVR/${commonEntities}/entities.json`,
                        { isExternal: true }
                    );
                } else {
                    this.vrCommonLoadPromise = Promise.resolve();
                }
            }
            if (!this.vrGamepadLoadPromises[controllerName]) {
                this.vrCommonLoadPromise.then(() => {
                    this.vrGamepadLoadPromises[controllerName] = this.box3d.addRemoteEntities(
                        `${this
                            .staticBaseURI}third-party/model3d/${MODEL3D_STATIC_ASSETS_VERSION}/WebVR/${controllerName}/entities.json`,
                        { isExternal: true }
                    );
                    this.vrGamepadLoadPromises[controllerName].then(onGamepadModelLoad);
                });
            } else {
                this.vrGamepadLoadPromises[controllerName].then(onGamepadModelLoad);
            }
        };

        const handController = controller.addComponent('motion_gamepad_device', { handPreference: handedness });
        controller.addComponent('intersection_checker', { objectTypeFilter: ['mesh'] });
        this.getScene().addChild(controller);
        handController.whenGamepadFound(onGamepadFound);

        return controller;
    }

    /**
     * Mark the VR hand controllers and being visible.
     * @return {void}
     */
    showVrGamepads() {
        this.vrGamepads.forEach((pad) => pad.setProperty('visible', true));
    }

    /**
     * Mark the VR hand controllers and being invisible.
     * @return {void}
     */
    hideVrGamepads() {
        this.vrGamepads.forEach((pad) => pad.setProperty('visible', false));
    }
}

export default Box3DRenderer;
