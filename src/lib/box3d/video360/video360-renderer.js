/* global Box3D, Box3DResourceLoader */
import Box3DRenderer from '../box3d-renderer';

class Video360Renderer extends Box3DRenderer {

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
            this.rightEyeScene = scene.clone({ id: 'SCENE_ID_RIGHT_EYE' });
            this.rightEyeCamera = this.rightEyeScene.getObjectByType('camera');
        }
        const renderViewId = 'render_view_component';
        let renderViewComponent = camera.getComponentByScriptId(renderViewId);
        renderViewComponent.setViewport(0, 0, '50%', '100%');
        renderViewComponent = this.rightEyeCamera.getComponentByScriptId(renderViewComponent);
        renderViewComponent.setViewport('50%', 0, '50%', '100%');
        renderViewComponent.enable();

        const skyboxComponent = this.rightEyeScene.getComponentByScriptId('skybox_renderer');
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
        const renderViewId = 'render_view_component';
        const camera = this.getCamera();
        let renderViewComponent = camera.getComponentByScriptId(renderViewId);
        renderViewComponent.setViewport(0, 0, '100%', '100%');
        renderViewComponent = this.rightEyeCamera.getComponentByScriptId(renderViewId);
        renderViewComponent.disable();
    }

    /**
     * @inheritdoc
     */
    enableCameraControls() {
        const camControllerId = 'orbit_camera_controller';
        const camera = this.getCamera();
        let cameraControls = camera.getComponentByScriptId(camControllerId);
        cameraControls.enable();
        if (this.rightEyeCamera) {
            cameraControls = this.rightEyeCamera.getComponentByScriptId(camControllerId);
            if (cameraControls) {
                cameraControls.enable();
            }
        }
    }

    /**
     * @inheritdoc
     */
    disableCameraControls() {
        const camControllerId = 'orbit_camera_controller';
        const camera = this.getCamera();
        let cameraControls = camera.getComponentByScriptId(camControllerId);
        cameraControls.disable();
        if (this.rightEyeCamera) {
            cameraControls = this.rightEyeCamera.getComponentByScriptId(camControllerId);
            if (cameraControls) {
                cameraControls.disable();
            }
        }
    }
}

export default Video360Renderer;
