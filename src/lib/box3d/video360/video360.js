/* global BoxSDK */
import './video360.scss';
import autobind from 'autobind-decorator';
import Dash from '../../media/dash';
import Video360Controls from './video360-controls';
import Video360Renderer from './video360-renderer';
import sceneEntities from './scene-entities';

import {
    EVENT_ENABLE_VR,
    EVENT_DISABLE_VR,
    EVENT_SHOW_VR_BUTTON
} from '../box3d-constants';
import {
    EVENT_RELOAD,
    EVENT_SWITCH_2D
} from './video360-constants';

/**
 * Video360
 * This is the entry point for the video360 preview.
 * @class
 */
@autobind
class Video360 extends Dash {
    /**
     * Ties together all 360 video rendering and controls
     * @constructor
     * @param {string|HTMLElement} container node
     * @param {object} [options] Options to be passed to Dash. See Dash constructor
     * @returns {Video360} the Video360 object instance
     */
    constructor(container, options) {
        super(container, options);

        this.renderer = null;
        this.controls = null;
        this.destroyed = false;

        this.mediaEl.style.display = 'none';
        this.mediaContainerEl.style.width = '100%';
        this.mediaContainerEl.style.height = '100%';

        const sdkOpts = { token: options.token, apiBase: options.api };
        this.boxSdk = new BoxSDK(sdkOpts);
        this.optionsObj = options;
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
        const box3d = this.renderer.box3d;
        const scene = box3d.getEntityById('SCENE_ID');
        const skybox = scene.getComponentByScriptId('skybox_renderer');
        skybox.setSkyboxTexture(null);
        this.textureAsset.destroy();
        this.destroyControls();
        if (this.renderer) {
            this.renderer.removeListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
            this.renderer.destroy();
        }
    }

    /**
    * @inheritdoc
     */
    loadedmetadataHandler() {
        this.renderer = new Video360Renderer(this.mediaContainerEl, this.boxSdk);
        this.renderer.on(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
        this.optionsObj.sceneEntities = sceneEntities;
        this.renderer.initBox3d(this.optionsObj)
            .then(this.create360Environment)
            .then(() => {
                super.loadedmetadataHandler();
                this.renderer.enableVrIfPresent();
                this.createControls();
            });
    }

    /**
     * Create controls for 360 video.
     * @method createControls
     * @private
     * @returns {void}
     */
    createControls() {
        this.controls = new Video360Controls(this.mediaContainerEl);
        this.controls.on(EVENT_ENABLE_VR, this.handleEnableVr);
        this.controls.on(EVENT_DISABLE_VR, this.handleDisableVr);
        this.controls.on(EVENT_SWITCH_2D, this.switchTo2dViewer);
    }

    /**
     * Destroy controls for 360 video.
     * @method destroyControls
     * @private
     * @returns {void}
     */
    destroyControls() {
        if (this.controls) {
            this.controls.removeListener(EVENT_ENABLE_VR, this.handleEnableVr);
            this.controls.removeListener(EVENT_DISABLE_VR, this.handleDisableVr);
            this.controls.removeListener(EVENT_SWITCH_2D, this.switchTo2dViewer);
            this.controls.destroy();
        }
    }

    /**
     * Create the environment that will render the 360 video
     * using the Box3D runtime.
     * @method create360Environment
     * @private
     * @returns {void}
     */
    create360Environment() {
        const box3d = this.renderer.box3d;
        const scene = box3d.getEntityById('SCENE_ID');
        const skybox = scene.getComponentByScriptId('skybox_renderer');
        skybox.setSkyboxTexture(null);

        this.textureAsset = box3d.assetRegistry.createAsset({
            id: 'VIDEO_TEX_ID',
            type: 'textureVideo',
            properties: {
                // layout: window.Box3D.BaseTextureAsset.LAYOUT.STEREO_2D_OVER_UNDER,
                ignoreStream: true,
                generateMipmaps: false,
                filtering: 'Linear',
                uMapping: 'Clamp',
                vMapping: 'Clamp',
                querySelector: `.${this.mediaContainerEl.className} video`
            }
        });
        return new Promise((resolve, reject) => {
            this.textureAsset.load(() => {
                skybox.setSkyboxTexture(this.textureAsset.id);
                skybox.enable();
                resolve();
            })
            .catch(reject);
        });
    }

    /**
     * Switches back to 2D viewer
     * @returns {void}
     */
    @autobind
    switchTo2dViewer() {
        Box.Preview.enableViewers('Dash');
        Box.Preview.enableViewers('MP4');
        this.emit(EVENT_RELOAD);
    }

    /**
     * Handles enable VR event
     * @returns {void}
     */
    @autobind
    handleEnableVr() {
        this.vrDevice = this.renderer.vrDevice;
        this.renderer.enableVr();
    }

    /**
     * Handles disable VR event
     * @returns {void}
     */
    @autobind
    handleDisableVr() {
        this.renderer.disableVr();
    }

    /**
     * Handle show VR button event
     * @returns {void}
     */
    @autobind
    handleShowVrButton() {
        this.controls.showVrButton();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Video360 = Video360;
global.Box = Box;
export default Video360;
