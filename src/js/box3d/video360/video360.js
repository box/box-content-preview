'use strict';

import '../../../css/video360/video360.css';
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
    load(mediaUrl) {
        super.load(mediaUrl);
        this.mediaEl.addEventListener('loadedmetadata', this.create360VideoUI.bind(this));
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
        this.detachEventHandlers();
        this.controls.destroy();
        this.renderer.destroy();
    }

    /**
     * Create UI specific to 360 degree video.
     * @method create360VideoUI
     * @private
     * @returns {void}
     */
    create360VideoUI() {
        this.renderer = new Video360Renderer(this.mediaContainerEl, this.boxSdk);
        this.optionsObj.sceneEntities = sceneEntities;
        this.renderer.initBox3d(this.optionsObj).then(this.create360Environment.bind(this));
        this.controls = new Video360Controls(this.mediaContainerEl);
        this.attachEventHandlers();
    }

    /**
    * @inheritdoc
     */
    attachEventHandlers() {
        if (this.controls) {
            this.controls.on(EVENT_ENABLE_VR, this.handleEnableVr);
            this.controls.on(EVENT_DISABLE_VR, this.handleDisableVr);
            this.controls.on(EVENT_SWITCH_2D, this.switchTo2dViewer);
        }
        if (this.renderer) {
            this.renderer.on(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
        }

    }

    /**
     * @inheritdoc
     */
    detachEventHandlers() {
        if (this.controls) {
            this.controls.removeListener(EVENT_ENABLE_VR, this.handleEnableVr);
            this.controls.removeListener(EVENT_DISABLE_VR, this.handleDisableVr);
            this.controls.removeListener(EVENT_SWITCH_2D, this.switchTo2dViewer);
        }

        if (this.renderer) {
            this.renderer.removeListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
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
                layout: window.VAPI.BaseTextureAsset.LAYOUT.STEREO_2D_OVER_UNDER,
                ignoreStream: true,
                generateMipmaps: false,
                filtering: 'Linear',
                uMapping: 'Clamp',
                vMapping: 'Clamp',
                querySelector: '.' + this.mediaContainerEl.className + ' video'
            }
        });
        return new Promise((resolve, reject) => {
            this.textureAsset.load((texAsset) => {
                skybox.setSkyboxTexture(this.textureAsset.id);
                this.renderer.enableVrIfPresent();
                resolve();
            });
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
