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
        const skybox = scene.getComponentByScriptId('skybox_renderer');
        skybox.setSkyboxTexture(null);

        this.textureAsset = this.box3d.assetRegistry.createAsset({
            type: 'texture2D',
            properties: {
                ignoreStream: true,
                generateMipmaps: false,
                minFilter: 'linear',
                magFilter: 'linear',
                uMapping: 'clamp',
                vMapping: 'clamp',
                fileId: fileProperties.id,
                filename: fileProperties.name,
                representation: (fileProperties.extension === 'jpg' || fileProperties.fileExtension === 'png') ? 'original' : undefined
            }
        });
        return new Promise((resolve) => {
            this.textureAsset.load(() => {
                skybox.enable();
                skybox.setSkyboxTexture(this.textureAsset.id);
                resolve();
            });
        });
    }

    /**
     * @inheritdoc
     */
    enableCameraControls() {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId('orbit_camera_controller');
        cameraControls.enable();
    }

    /**
     * @inheritdoc
     */
    disableCameraControls() {
        const camera = this.getCamera();
        const cameraControls = camera.getComponentByScriptId('orbit_camera_controller');
        cameraControls.disable();
    }
}

export default Image360Renderer;
