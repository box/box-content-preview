/* global Box3D, THREE */
/* eslint no-param-reassign:0 */
import EventEmitter from 'events';
import {
    EVENT_SHOW_VR_BUTTON,
    EVENT_SCENE_LOADED,
    EVENT_TRIGGER_RENDER
} from './box3d-constants';

const PREVIEW_CAMERA_CONTROLLER_ID = 'orbit_camera_controller';
const PREVIEW_CAMERA_POSITION = { x: 0, y: 0, z: 0 };
const PREVIEW_CAMERA_QUATERNION = { x: 0, y: 0, z: 0, w: 1 };

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
        // Instances and assets created, that are not scene default entities, are
        // tracked for cleanup during recycling of box3d runtime
        this.assets = [];
        this.vrEnabled = false;
        this.box3d = null;
        this.boxSdk = boxSdk;
        this.on(EVENT_TRIGGER_RENDER, this.handleOnRender);
        this.defaultCameraPosition = PREVIEW_CAMERA_POSITION;
        this.defaultCameraQuaternion = PREVIEW_CAMERA_QUATERNION;
    }

    /**
     * Load a box3d json.
     *
     * @param {Object} options - Options object, used to initialize the Box3DRuntime
     * and BoxSDK
     * @param {string} [options.token] - The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.api] - API URL base to make requests to
     * @param {Object|null} [options.file] - Information about the current box file we're using.
     * Used to get the parent.id of the box file.
     * @return {Promise} A promise resulting in the newly created box3d
     */
    load(assetUrl, options = {}) {
        return this.initBox3d(options);
    }

    /**
     * Hide 3d preview and destroy the loader.
     *
     * @return {void}
     */
    destroy() {
        this.removeListener(EVENT_TRIGGER_RENDER, this.handleOnRender);

        if (!this.box3d) {
            return;
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
        const camera = this.getCamera();

        // Reset camera settings to default.
        if (camera) {
            camera.setPosition(this.defaultCameraPosition.x, this.defaultCameraPosition.y, this.defaultCameraPosition.z);
            camera.setQuaternion(this.defaultCameraQuaternion.x, this.defaultCameraQuaternion.y, this.defaultCameraQuaternion.z, this.defaultCameraQuaternion.w);
            camera.trigger('resetOrbitCameraController');
        }
    }

    /**
     * Get the scene's camera instance.
     *
     * @return {Box3DEntity} The camera instance
     */
    getCamera() {
        return this.box3d ? this.box3d.getObjectById('CAMERA_ID') : null;
    }

    /**
     * Get the current aspect ratio of the preview area.
     *
     * @private
     * @return {number} Aspect ratio of the preview area
     */
    getAspect() {
        const width = this.containerEl.clientWidth;
        const height = this.containerEl.clientHeight;
        return width / height;
    }

    /**
     * Get the scene object.
     *
     * @return {SceneObject} The scene object
     */
    getScene() {
        return this.box3d ? this.box3d.getEntityById('SCENE_ID') : null;
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
     * Initialize the Box3D engine.
     *
     * @param {Object} options - the preview options object
     * @param {string} [options.token] - The OAuth2 Token used for authentication of asset requests
     * @param {string} [options.api] - API URL base to make requests to
     * @param {Object|null} [options.file] - Information about the current box file we're using.
     * Used to get the parent.id of the box file.
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

        return this.createBox3d(resourceLoader, options.sceneEntities);
    }

    /**
     * Create a new Box3D engine.
     *
     * @param {Object} resourceLoader - The resource loader used to load assets used by the box3d engine
     * @param {Array} [sceneEntities] - The descriptor of the default scene. See ./scene-entities.js
     * @param {Object} [inputSettings] - Config for the input controller of the Box3D Engine
     * @return {Promise} A promise that resolves with the Box3D Engine.
     */
    createBox3d(resourceLoader, sceneEntities) {
        const box3d = new Box3D.Engine({
            container: this.containerEl,
            engineName: 'Default',
            resourceLoader
        });
        return new Promise((resolve) => {
            box3d.addEntities(sceneEntities);
            const app = box3d.getAssetById('APP_ASSET_ID');
            app.load();
            this.box3d = box3d;
            resolve(this.box3d);
        });
    }

    /**
     * Enable VR and reset the scene, on scene load event fired from Box3DRuntime.
     *
     * @return {void}
     */
    onSceneLoad() {
        // Reset the camera.
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
     */
    onDisableVr() {
        this.enableCameraControls();
        this.reset();
        this.box3d.trigger('resize');
        const renderer = this.box3d.getRenderer();
        renderer.setAttribute('renderOnDemand', true);

        const display = this.box3d.getVrDisplay();
        this.vrEnabled = display && display.isPresenting;
    }

    /**
     * Handle turning on VR.
     */
    onEnableVr() {
        this.disableCameraControls();
        // Render every frame to make sure that we're as responsive as possible.
        const renderer = this.box3d.getRenderer();
        renderer.setAttribute('renderOnDemand', false);
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
     * Trigger an update and render event on the runtime.
     *
     * @return {void}
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
        const vrPresenter = app.getComponentByScriptId('vr_presenter_component');
        vrPresenter.whenDisplaysAvailable((displays) => {
            if (displays.length) {
                this.emit(EVENT_SHOW_VR_BUTTON);
                this.box3d.listenTo(this.box3d, 'vrRenderingDisabled', this.onDisableVr.bind(this));
                this.box3d.listenTo(this.box3d, 'vrRenderingEnabled', this.onEnableVr.bind(this));
            }
        });
    }
}

export default Box3DRenderer;
