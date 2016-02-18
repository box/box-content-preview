/* global VAPI, Box3DResourceLoader */
'use strict';

import Box3DRenderer from '../box3d-renderer';

class Video360Renderer extends Box3DRenderer {

    /**
     * Base class that handles creation of and communication with Box3DRuntime
     * @constructor
     * @param {HTMLElement} containerEl the container element
     * @param {BoxSDK} [boxSdk] Box SDK instance, used for requests to Box
     * @returns {Image360Renderer} Image360Renderer instance
     */
    constructor(containerEl, boxSdk) {
        super();
    }

    /**
     * Enable the VR system (HMD)
     * @returns {void}
     */
    enableVr() {
        if (!this.vrDevice || this.vrEnabled) {
            return;
        }

        super.enableVr();

        const camera = this.getCamera();
        const hmdComponent = camera.getComponentByScriptId('hmd_renderer_script');
        // Disable the regular hmd renderer because we're going to render left and right eyes
        // ourselves using two cameras.
        hmdComponent.disable();

        if (!this.rightEyeScene) {
            const box3d = this.renderer.box3d;
            const scene = box3d.getEntityById('SCENE_ID');
            this.rightEyeScene = scene.clone({id: 'SCENE_ID_RIGHT_EYE'});
            this.rightEyeCamera = this.rightEyeScene.getObjectByType('camera');
        }
        let renderViewComponent = camera.getComponentByScriptId('render_view_component');
        renderViewComponent.setViewport(0, 0, '50%', '100%');
        renderViewComponent = this.rightEyeCamera.getComponentByScriptId('render_view_component');
        renderViewComponent.setViewport('50%', 0, '50%', '100%');
        renderViewComponent.enable();

        let skyboxComponent = this.rightEyeScene.getComponentByScriptId('skybox_renderer');
        skyboxComponent.leftEye = false;
        skyboxComponent.setTexture('VIDEO_TEX_ID');
    }


    /**
     * Disable the VR system (HMD)
     * @returns {void}
     */
    disableVr() {
        if (!this.vrDevice || !this.vrEnabled) {
            return;
        }

        super.disableVr();

        let renderViewComponent = camera.getComponentByScriptId('render_view_component');
        renderViewComponent.setViewport(0, 0, '100%', '100%');
        renderViewComponent = this.rightEyeCamera.getComponentByScriptId('render_view_component');
        renderViewComponent.disable();
    }

    /**
     * @inheritdoc
     */
    enableCameraControls() {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId('orbit_camera_controller');
        cameraControls.enable();
        if (this.rightEyeCamera) {
            const cameraControls =
                this.rightEyeCamera.getComponentByScriptId('orbit_camera_controller');
            if (cameraControls) {
                cameraControls.enable();
            }
        }
    }

    /**
     * @inheritdoc
     */
    disableCameraControls() {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId('orbit_camera_controller');
        cameraControls.disable();
        if (this.rightEyeCamera) {
            const cameraControls =
                this.rightEyeCamera.getComponentByScriptId('orbit_camera_controller');
            if (cameraControls) {
                cameraControls.disable();
            }
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
