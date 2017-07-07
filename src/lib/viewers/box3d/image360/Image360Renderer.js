/* global Box3D */
import Box3DRenderer from '../Box3DRenderer';
import sceneEntities from './SceneEntities';

/**
 * Image360Renderer
 * This class handles rendering the preview of the 3D model using the Box3D
 * Runtime library.
 */
class Image360Renderer extends Box3DRenderer {
    /** @property {Box3D.Texture2DAsset} - Asset for the skybox texture */
    textureAsset;

    /** @property {Box3D.ImageAsset} - Asset for the image to apply to the texture */
    imageAsset;

    /** @property {Box3D.Components.SkyboxRenderer} - The component for rendering the image as 360 degree (on a skybox) */
    skybox;

    /**
     * Called on preview destroy
     *
     * @return {void}
     */
    destroy() {
        this.cleanupTexture();
        super.destroy();
    }

    /**
     * Cleanup the image and texture for the skybox.
     *
     * @private
     * @return {void}
     */
    cleanupTexture() {
        if (this.imageAsset) {
            this.imageAsset.destroy();
            this.imageAsset = null;
        }
        if (this.textureAsset) {
            this.textureAsset.destroy();
            this.textureAsset = null;
        }
        if (this.skybox) {
            this.getSkyboxComponent().setAttribute('skyboxTexture', null);
            this.skybox = null;
        }
    }

    /**
     * Get the skybox renderer component that exists on the root scene.
     *
     * @public
     * @return {Object} A Box3d component for skybox rendering
     */
    getSkyboxComponent() {
        if (!this.skybox) {
            this.skybox = this.getScene().getComponentByScriptId('skybox_renderer');
        }

        return this.skybox;
    }

    /**
     * Load a box3d json.
     *
     * @inheritdoc
     * @param {string} assetUrl - The url to the box3d json
     * @param {Object} [options] - Options to be applied on loading the scene
     * @return {Promise} a promise that resolves with the newly created runtime
     */
    load(assetUrl, options = {}) {
        const opts = options;
        opts.sceneEntities = opts.sceneEntities || sceneEntities;

        return super
            .load(assetUrl, opts)
            .then(this.loadPanoramaFile.bind(this, assetUrl))
            .then(this.onSceneLoad.bind(this));
    }

    /**
     * Load a box3d representation and initialize the scene.
     *
     * @private
     * @param {string} assetUrl - The representation URL.
     * @return {void}
     */
    loadPanoramaFile(assetUrl) {
        /* istanbul ignore next */
        return this.box3d.addRemoteEntities(assetUrl).then(
            () => {
                this.imageAsset = this.box3d.getAssetByClass(Box3D.ImageAsset);
                this.textureAsset = this.box3d.createTexture2d();
                this.textureAsset.setProperties({
                    imageId: this.imageAsset.id,
                    wrapModeV: 'clampToEdge',
                    wrapModeU: 'clampToEdge'
                });
                return new Promise((resolve) => {
                    this.textureAsset.load(() => {
                        this.skybox = this.getSkyboxComponent();
                        this.skybox.enable();
                        this.skybox.setAttribute('skyboxTexture', this.textureAsset.id);
                        resolve();
                    });
                });
            },
            () => this.onUnsupportedRepresentation()
        );
    }

    /** @inheritdoc */
    enableVr() {
        super.enableVr();
        this.getSkyboxComponent().setAttribute('stereoEnabled', true);
    }

    /** @inheritdoc */
    disableVr() {
        super.disableVr();
        this.getSkyboxComponent().setAttribute('stereoEnabled', false);
    }
}

export default Image360Renderer;
