/* global BoxSDK */
import autobind from 'autobind-decorator';
import fullscreen from '../../../Fullscreen';
import DashViewer from '../../media/DashViewer';
import Video360Controls from './Video360Controls';
import Video360Renderer from './Video360Renderer';
import sceneEntities from './SceneEntities';
import { EVENT_TOGGLE_VR, EVENT_SHOW_VR_BUTTON } from '../box3DConstants';
import { ICON_FILE_MEDIA } from '../../../icons/icons';
import JS from '../box3DAssets';
import './Video360.scss';

const CSS_CLASS_VIDEO_360 = 'bp-video-360';
const VIDEO_ID = 'VIDEO_ID';
const VIDEO_TEXTURE_PROPS = {
    imageId: VIDEO_ID,
    minFilter: 'linear',
    magFilter: 'linear',
    wrapModeV: 'clampToEdge',
    wrapModeU: 'clampToEdge'
};

class Video360Viewer extends DashViewer {
    /** @property {Video360Renderer} - Instance of the Video360Renderer */
    renderer;

    /** @property {Video360Controls} - Instance of the Video360Controls */
    controls;

    /** @property {Box3D.Texture2DAsset} - Asset for the skybox texture */
    textureAsset;

    /** @property {Box3D.VideoAsset} - Asset for the video to apply to the texture */
    videoAsset;

    /** @property {Box3D.Components.SkyboxRenderer} - The component for rendering the video as 360 degree (on a skybox) */
    skybox;

    /** @inheritdoc */
    setup() {
        this.fileLoadingIcon = ICON_FILE_MEDIA;

        // Call super() to set up common layout
        super.setup();

        this.destroyed = false;

        // Hide video element
        this.mediaEl.style.display = 'none';
        // Instead of keeping aspect ratio of video, we want full sized canvas to render to
        this.mediaContainerEl.style.width = '100%';
        this.mediaContainerEl.style.height = '100%';
        this.wrapperEl.classList.add(CSS_CLASS_VIDEO_360);
    }

    /**
     * Adds event listeners to the canvas element.
     * Makes changes to the media controls.
     *
     * @override
     * @return {void}
     */
    addEventListenersForMediaElement() {
        super.addEventListenersForMediaElement();

        this.wrapperEl.addEventListener('mousemove', this.mousemoveHandler);
        if (this.hasTouch) {
            this.wrapperEl.addEventListener('touchstart', this.pointerHandler);
        }
    }

    /** @inheritdoc */
    destroy() {
        super.destroy();

        if (this.skybox) {
            this.skybox.setAttribute('skyboxTexture', null);
            this.skybox = null;
        }

        if (this.textureAsset) {
            this.textureAsset.destroy();
            this.textureAsset = null;
        }

        if (this.videoAsset) {
            this.videoAsset.destroy();
            this.videoAsset = null;
        }

        if (this.controls) {
            this.destroyControls();
            this.controls = null;
        }

        if (this.renderer) {
            // Remove event listeners from box3d, if any on it
            this.renderer.getBox3D().off('mouseDown', this.onCanvasMouseDown);
            this.renderer.getBox3D().off('mouseUp', this.onCanvasMouseUp);

            this.renderer.removeListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
            this.renderer.destroy();
            this.renderer = null;
        }

        this.wrapperEl.removeEventListener('mousemove', this.mousemoveHandler);
        this.wrapperEl.removeEventListener('touchstart', this.pointerHandler);
    }

    /**
     * Returns video 360 player assets.
     *
     * @override
     * @return {void}
     */
    getJSAssets() {
        return super.getJSAssets().concat(JS);
    }

    /**
     * Once video data is ready, we can create a new renderer and start rendering.
     *
     * @inheritdoc
     */
    @autobind
    loadeddataHandler() {
        const { token, apiHost } = this.options;
        this.renderer = new Video360Renderer(this.mediaContainerEl, new BoxSDK({ token, apiBase: apiHost }));
        this.renderer.on(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
        this.renderer.staticBaseURI = this.options.location.staticBaseURI;
        this.options.sceneEntities = sceneEntities;
        this.renderer.initBox3d(this.options).then(this.create360Environment).then(() => {
            // calling super.loadeddataHandler() will ready video playback
            super.loadeddataHandler();
            this.createControls();
            this.renderer.initVr();
        });
    }

    /**
     * Create controls for 360 video.
     *
     * @private
     * @return {void}
     */
    createControls() {
        this.controls = new Video360Controls(this.mediaContainerEl);
        this.controls.on(EVENT_TOGGLE_VR, this.handleToggleVr);
    }

    /**
     * Destroy controls for 360 video.
     *
     * @private
     * @return {void}
     */
    destroyControls() {
        this.controls.removeListener(EVENT_TOGGLE_VR, this.handleToggleVr);
        this.controls.destroy();
    }

    /**
     * @inheritdoc
     */
    @autobind
    resize() {
        super.resize();
        if (this.renderer) {
            this.renderer.resize();
        }
    }

    /**
     * Create the environment that will render the 360 video
     * using the Box3D runtime.
     *
     * @private
     * @return {void}
     */
    @autobind
    create360Environment() {
        this.skybox = this.renderer.getScene().getComponentByScriptId('skybox_renderer');

        this.videoAsset = this.renderer.getBox3D().createVideo(
            {
                loop: false,
                generateMipmaps: false,
                querySelector: `.${this.mediaContainerEl.className} video`,
                autoPlay: false,
                muted: false
            },
            VIDEO_ID
        );

        // Texture props references the ID of the video texture created above, "VIDEO_ID"
        this.textureAsset = this.renderer.getBox3D().createTexture2d(VIDEO_TEXTURE_PROPS, 'VIDEO_TEX_ID');

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
     * Handles toggle VR event
     *
     * @return {void}
     */
    @autobind
    handleToggleVr() {
        this.renderer.toggleVr();

        if (!this.renderer.vrEnabled) {
            // On switching to VR mode begin playing video
            if (this.mediaEl.paused) {
                this.mediaEl.play();
            }

            this.skybox.setAttribute('stereoEnabled', true);
        } else {
            this.skybox.setAttribute('stereoEnabled', false);
        }
    }

    /**
     * Handle show VR button event
     *
     * @return {void}
     */
    @autobind
    handleShowVrButton() {
        this.controls.showVrButton();
    }

    /**
     * Handle mouseDown on the canvas, for playing video
     *
     * @return {void}
     */
    @autobind
    onCanvasMouseDown() {
        this.renderer.getBox3D().once('mouseUp', this.onCanvasMouseUp);
    }

    /**
     * Handle mouseUp on the canvas, for toggling play on video
     *
     * @return {void}
     */
    @autobind
    onCanvasMouseUp() {
        const input = this.renderer.getInputController();
        // Make sure the mouse hasn't moved (within mouse/touch buffer drag allowance)
        if (!input.getPreviousMouseDragState() && !input.getPreviousTouchDragState()) {
            this.togglePlay();
        }
    }
}

export default Video360Viewer;
