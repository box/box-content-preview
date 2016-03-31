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
        const camera = this.getCamera();
        if (!this.rightEyeScene) {
            const box3d = this.box3d;
            const scene = box3d.getEntityById('SCENE_ID');
            this.rightEyeScene = scene.clone({ id: 'SCENE_ID_RIGHT_EYE' });
            this.rightEyeCamera = this.rightEyeScene.getObjectByType('camera');
            this.rightEyeScene.load();
        }
        super.enableVr();

        // Disable the regular hmd renderer because we're going to render left and right eyes
        // ourselves using two cameras.
        let hmdComponent = camera.componentRegistry.getFirstByScriptId('hmd_renderer_script');
        hmdComponent.disable();
        hmdComponent = this.rightEyeCamera.componentRegistry.getFirstByScriptId('hmd_renderer_script');
        hmdComponent.disable();

        const vrControlsComponent = this.rightEyeCamera.componentRegistry.getFirstByScriptId('preview_vr_controls');
        vrControlsComponent.enable();

        const renderViewId = 'render_view_component';
        let renderViewComponent = camera.componentRegistry.getFirstByScriptId(renderViewId);
        renderViewComponent.setViewport('0', '0', '50%', '100%');
        renderViewComponent = this.rightEyeCamera.componentRegistry.getFirstByScriptId(renderViewId);
        renderViewComponent.setViewport('50%', '0', '50%', '100%');
        renderViewComponent.enable();

        const skyboxComponent = this.rightEyeScene.componentRegistry.getFirstByScriptId('skybox_renderer');
        this.rightEyeScene.when('load', () => {
            skyboxComponent.enable();
            skyboxComponent.setAttribute('leftEye', false);
        });
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
        let renderViewComponent = camera.componentRegistry.getFirstByScriptId(renderViewId);
        renderViewComponent.setViewport('0', '0', '100%', '100%');
        renderViewComponent = this.rightEyeCamera.componentRegistry.getFirstByScriptId(renderViewId);
        renderViewComponent.disable();
    }

    /**
     * @inheritdoc
     */
    enableCameraControls() {
        const camControllerId = 'orbit_camera_controller';
        const camera = this.getCamera();
        let cameraControls = camera.componentRegistry.getFirstByScriptId(camControllerId);
        cameraControls.enable();
        if (this.rightEyeCamera) {
            cameraControls = this.rightEyeCamera.componentRegistry.getFirstByScriptId(camControllerId);
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
        let cameraControls = camera.componentRegistry.getFirstByScriptId(camControllerId);
        cameraControls.disable();
        if (this.rightEyeCamera) {
            cameraControls = this.rightEyeCamera.componentRegistry.getFirstByScriptId(camControllerId);
            if (cameraControls) {
                cameraControls.disable();
            }
        }
    }
}

export default Video360Renderer;
