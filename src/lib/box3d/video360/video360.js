/* global BoxSDK */
import './video360.scss';
import autobind from 'autobind-decorator';
import fullscreen from '../../fullscreen';
import Dash from '../../media/dash';
import Video360Controls from './video360-controls';
import Video360Renderer from './video360-renderer';
import sceneEntities from './scene-entities';

import {
    EVENT_ENABLE_VR,
    EVENT_DISABLE_VR,
    EVENT_SHOW_VR_BUTTON
} from '../box3d-constants';

const CSS_CLASS_VIDEO_360 = 'box-preview-video-360';

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
        // dash specific class
        this.wrapperEl.classList.add(CSS_CLASS_VIDEO_360);

        const sdkOpts = { token: options.token, apiBase: options.api };
        this.boxSdk = new BoxSDK(sdkOpts);
        this.optionsObj = options;
    }

    /**
     * @inheritdoc
     */
    destroy() {
        super.destroy();
        if (this.skybox) {
            this.skybox.setAttribute('skyboxTexture', null);
        }

        if (this.textureAsset) {
            this.textureAsset.destroy();
        }

        if (this.videoAsset) {
            this.videoAsset.destroy();
        }

        this.destroyControls();
        if (this.renderer) {
            // Remove event listeners from box3d, if any on it
            this.renderer.getBox3D().off('mouseDown', this.onCanvasMouseDown);
            this.renderer.getBox3D().off('mouseUp', this.onCanvasMouseUp);

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
                this.createControls();
                this.renderer.enableVrIfPresent();
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
            this.controls.destroy();
        }
    }

    resize() {
        super.resize();
        if (this.renderer) {
            this.renderer.resize();
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
        const scene = this.renderer.getBox3D().getEntityById('SCENE_ID');
        this.skybox = scene.componentRegistry.getFirstByScriptId('skybox_renderer');

        this.videoAsset = this.renderer.getBox3D().assetRegistry.createAsset({
            id: 'VIDEO_ID',
            type: 'video',
            properties: {
                // layout: 'stereo2dOverUnder',
                loop: false,
                generateMipmaps: false,
                querySelector: `.${this.mediaContainerEl.className} video`,
                autoPlay: false
            }
        });

        this.textureAsset = this.renderer.getBox3D().assetRegistry.createAsset({
            id: 'VIDEO_TEX_ID',
            type: 'texture2D',
            properties: {
                imageId: 'VIDEO_ID',
                minFilter: 'linear',
                magFilter: 'linear',
                uMapping: 'clamp',
                vMapping: 'clamp'
            }
        });
        return new Promise((resolve) => {
            this.textureAsset.load(() => {
                this.skybox.setAttribute('skyboxTexture', this.textureAsset.id);
                this.skybox.enable();
                this.renderer.getBox3D().on('mouseDown', this.onCanvasMouseDown);
                resolve();
            });
        });
    }

    /**
     * @inheritdoc
     */
    @autobind
    toggleFullscreen() {
        fullscreen.toggle(this.wrapperEl);
    }

    /**
     * Handles enable VR event
     * @returns {void}
     */
    @autobind
    handleEnableVr() {
        this.renderer.enableVr();
        this.skybox.setAttribute('stereoEnabled', true);
    }

    /**
     * Handles disable VR event
     * @returns {void}
     */
    @autobind
    handleDisableVr() {
        this.renderer.disableVr();
        this.skybox.setAttribute('stereoEnabled', false);
    }

    /**
     * Handle show VR button event
     * @returns {void}
     */
    @autobind
    handleShowVrButton() {
        this.controls.showVrButton();
    }

    /**
     * Handle mouseDown on the canvas, for playing video
     * @returns {void}
     */
    @autobind
    onCanvasMouseDown() {
        this.renderer.getBox3D().once('mouseUp', this.onCanvasMouseUp);
    }

    /**
     * Handle mouseUp on the canvas, for playing video
     * @returns {void}
     */
    @autobind
    onCanvasMouseUp() {
        const input = this.renderer.getInputController();
        // Make sure the mouse hasn't moved (within mouse/touch buffer drag allowance)
        if (!input.getPreviousMouseDragState() &&
            !input.getPreviousTouchDragState()) {
            this.togglePlay();
        }
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Video360 = Video360;
global.Box = Box;
export default Video360;
