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
        if (this.skybox) {
            this.skybox.setAttribute('skyboxTexture', null);
        }
        if (this.textureAsset) {
            this.textureAsset.destroy();
        }
        if (this.imageAsset) {
            this.imageAsset.destroy();
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
        const scene = this.box3d.getEntityById('SCENE_ROOT_ID');
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
        const scene = this.box3d.getEntityById('SCENE_ROOT_ID');
        this.skybox = scene.componentRegistry.getFirstByScriptId('skybox_renderer');

        this.imageAsset = this.box3d.createImage();
        this.imageAsset.setProperty('stream', false);

        // FIXME - when we get support for '3d' representations on image files, the logic below
        // should no longer be needed.
        // Figure out the appropriate representation info and then add that info to the asset.
        const extension = fileProperties.extension.toLowerCase();
        let compression = extension === 'png' ? 'zip' : 'jpeg';
        return this.boxSdk.representationLoader.getRepresentationUrl(fileProperties.id, (entry) => {
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
        }, undefined, { headers: { 'x-rep-hints': 'original|jpeg|png' } }).then((url) => {
            this.imageAsset.set('representations', [{
                src: url,
                compression
            }]);

            this.textureAsset = this.box3d.createTexture2d();
            this.textureAsset.setProperties({
                imageId: this.imageAsset.id,
                uMapping: 'clamp',
                vMapping: 'clamp'
            });
            return new Promise((resolve) => {
                this.textureAsset.load(() => {
                    this.skybox.enable();
                    this.skybox.setAttribute('skyboxTexture', this.textureAsset.id);
                    resolve();
                });
            });
        });
    }

    /**
     * @inheritdoc
     */
    enableVr() {
        super.enableVr();
        this.vrEffect.scale = 0;
        this.skybox.setAttribute('stereoEnabled', true);
    }

    /**
     * @inheritdoc
     */
    disableVr() {
        super.disableVr();
        this.skybox.setAttribute('stereoEnabled', false);
    }

    /**
     * @inheritdoc
     */
    enableCameraControls() {
        super.enableCameraControls('orbit_camera_controller');
    }

    /**
     * @inheritdoc
     */
    disableCameraControls() {
        super.disableCameraControls('orbit_camera_controller');
    }
}

export default Image360Renderer;
