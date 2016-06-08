import Box3DRenderer from '../box3d-renderer';
import autobind from 'autobind-decorator';
import sceneEntities from './scene-entities';

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
class Image360Renderer extends Box3DRenderer {
    /**
     * Handles creating and caching a Box3DRuntime, and creating a scene made for
     * previewing 360 images
     * @constructor
     * @inheritdoc
     * @returns {Image360Renderer} Image360Renderer instance
     */
    constructor(containerEl, boxSdk) {
        super(containerEl, boxSdk);

        this.textureAsset = null;
    }

    /**
     * Called on preview destroy
     * @returns {void}
     */
    destroy() {
        this.cleanupTexture();
        this.disableVr();
        if (this.rightEyeScene) {
            this.rightEyeScene.destroy();
            this.rightEyeCamera = undefined;
            this.rightEyeScene = undefined;
        }
        super.destroy();
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
        const scene = this.box3d.getEntityById('SCENE_ID');
        const skyboxComponent = scene.componentRegistry.getFirstByScriptId('skybox_renderer');
        skyboxComponent.setAttribute('skyboxTexture', null);
    }

    /**
     * Load a box3d json
     * @inheritdoc
     * @param  {string} jsonUrl The url to the box3d json
     * @returns {Promise} a promise that resolves with the newly created runtime
     */
    load(jsonUrl, options = {}) {
        /*eslint-disable*/
        options.sceneEntities = sceneEntities;
        options.inputSettings = INPUT_SETTINGS;
        /*eslint-enable*/

        return this.initBox3d(options)
            .then(this.loadPanoramaFile.bind(this, options.file))
            .then(this.onSceneLoad.bind(this));
    }

    /**
     * Parse out the proper components to assemble a threejs mesh
     * @param {object} fileProperties The Box3D file properties
     * @returns {void}
     */
    loadPanoramaFile(fileProperties) {
        const scene = this.box3d.getEntityById('SCENE_ID');
        const skybox = scene.componentRegistry.getFirstByScriptId('skybox_renderer');

        this.imageAsset = this.box3d.assetRegistry.createAsset({
            type: 'image',
            properties: {
                // layout: 'stereo2dOverUnder'
            },
            representations: []
        });

        // FIXME - when we get support for '3d' representations on image files, the logic below
        // should no longer be needed.
        // Figure out the appropriate representation info and then add that info to the asset.
        const extension = fileProperties.extension.toLowerCase();
        let compression = extension === 'png' ? 'zip' : 'jpeg';
        this.boxSdk.representationLoader.getRepresentationUrl(fileProperties.id, (entry) => {
            const grabOriginal = (extension === 'jpg' || extension === 'jpeg'
                || extension === 'png');
            if (grabOriginal && entry.representation === 'original') {
                return true;
            } else if (!grabOriginal && entry.properties.dimensions === '2048x2048') {
                if (entry.representation === 'jpg') {
                    compression = 'jpeg';
                } else if (entry.representation === 'png') {
                    compression = 'zip';
                }
                return true;
            }
            return false;
        }).then((url) => {
            this.imageAsset.set('representations', [{
                src: url,
                compression
            }]);

            this.textureAsset = this.box3d.assetRegistry.createAsset({
                type: 'texture2D',
                properties: {
                    // layout: 'stereo2dOverUnder',
                    imageId: this.imageAsset.id,
                    minFilter: 'linear',
                    magFilter: 'linear',
                    uMapping: 'clamp',
                    vMapping: 'clamp'
                }
            });
            return new Promise((resolve) => {
                this.textureAsset.load(() => {
                    skybox.enable();
                    skybox.setAttribute('skyboxTexture', this.textureAsset.id);
                    resolve();
                });
            });
        });
    }

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
        if (camera) {
            let renderViewComponent = camera.componentRegistry.getFirstByScriptId(renderViewId);
            renderViewComponent.setViewport('0', '0', '100%', '100%');
            renderViewComponent = this.rightEyeCamera.componentRegistry.getFirstByScriptId(renderViewId);
            renderViewComponent.disable();
        }
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

export default Image360Renderer;
