'use strict';

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
     * [constructor]
     * @param {HTMLElement} containerEl the container element
     * @param {BoxSDK} [boxSdk] Box SDK instance, used for requests to Box
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
     * @param  {string} jsonUrl The url to the box3d json
     * @param  {object} options Options object
     * @returns {void}
     */
    load(jsonUrl, options = {}) {
        options.sceneEntities = sceneEntities;
        options.inputSettings = INPUT_SETTINGS;

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
        let scene;
        let skybox;
        scene = this.box3d.getEntityById('SCENE_ID');
        skybox = scene.getComponentByScriptId('skybox_renderer');
        skybox.setSkyboxTexture(null);

        this.textureAsset = this.box3d.assetRegistry.createAsset({
            type: 'texture2D',
            properties: {
                ignoreStream: true,
                generateMipmaps: false,
                filtering: 'Linear',
                uMapping: 'Clamp',
                vMapping: 'Clamp',
                fileId: fileProperties.id,
                filename: fileProperties.name,
                originalImage: fileProperties.extension === 'jpg' ||
                    fileProperties.fileExtension === 'png' ? true : false
            }
        });
        return new Promise((resolve, reject) => {
            this.textureAsset.load((texAsset) => {
                skybox.setSkyboxTexture(this.textureAsset.id);
                resolve();
            });
        });
    }


}

export default Image360Renderer;
