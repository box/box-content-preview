import autobind from 'autobind-decorator';
import BaseViewer from '../BaseViewer';
import fullscreen from '../../Fullscreen';
import Box3DControls from './Box3DControls';
import Box3DRenderer from './Box3DRenderer';
import Browser from '../../Browser';
import Notification from '../../Notification';
import { get } from '../../util';
import {
    CSS_CLASS_BOX3D,
    EVENT_ERROR,
    EVENT_LOAD,
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_SHOW_VR_BUTTON,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_TOGGLE_VR,
    EVENT_WEBGL_CONTEXT_RESTORED,
    EVENT_WEBGL_CONTEXT_LOST
} from './box3DConstants';
import JS from './box3DAssets';
import './Box3D.scss';
import { ICON_FILE_OBJ } from '../../icons/icons';

// Milliseconds to wait for model to load before cancelling Preview
const LOAD_TIMEOUT = 50000;

const CLASS_VR_ENABLED = 'vr-enabled';

/**
 * Box3DViewer
 * This is the entry point for Box3D Preview Base
 * @class
 */
@autobind
class Box3DViewer extends BaseViewer {
    /** @property {Box3DRenderer} - Box3DRenderer instance. Renders the 3D scene */
    renderer;

    /** @property {HTMLElement} - Parent element for nesting the 3D scene and notifications in */
    wrapperEl;

    /** @property {Notification} - Used to notify users of WebGL context issues */
    contextNotification;

    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = this.fileLoadingIcon || ICON_FILE_OBJ;

        // Call super() to set up common layout
        super.setup();

        this.renderer = null;

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_BOX3D;
        this.contextNotification = new Notification(this.wrapperEl);

        this.loadTimeout = LOAD_TIMEOUT;
    }

    /**
     * Create any submodules required for previewing this document
     *
     * @return {void}
     */
    createSubModules() {
        this.controls = new Box3DControls(this.wrapperEl);
        this.renderer = new Box3DRenderer(this.wrapperEl, this.boxSdk);
    }

    /**
     * Attaches event handlers and provides base events for controls and rendering
     *
     * @return {void}
     */
    attachEventHandlers() {
        if (this.controls) {
            this.controls.on(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
            this.controls.on(EVENT_TOGGLE_VR, this.handleToggleVr);
            this.controls.on(EVENT_RESET, this.handleReset);
        }

        if (this.renderer) {
            this.renderer.on(EVENT_SCENE_LOADED, this.handleSceneLoaded);
            this.renderer.on(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
            this.renderer.on(EVENT_ERROR, this.handleError);
            this.renderer.on(EVENT_WEBGL_CONTEXT_RESTORED, this.handleContextRestored);
            this.renderer.on(EVENT_WEBGL_CONTEXT_LOST, this.handleContextLost);
        }

        // For addition/removal of VR class when display stops presenting
        window.addEventListener('vrdisplaypresentchange', this.onVrPresentChange);
        window.addEventListener('vrdisplayactivate', this.handleEnableVr);
        window.addEventListener('vrdisplaydeactivate', this.handleDisableVr);
    }

    /**
     * Detaches event handlers
     *
     * @return {void}
     */
    detachEventHandlers() {
        if (this.controls) {
            this.controls.removeListener(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
            this.controls.removeListener(EVENT_TOGGLE_VR, this.handleToggleVr);
            this.controls.removeListener(EVENT_RESET, this.handleReset);
        }

        if (this.renderer) {
            this.renderer.removeListener(EVENT_SCENE_LOADED, this.handleSceneLoaded);
            this.renderer.removeListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
            this.renderer.removeListener(EVENT_ERROR, this.handleError);
            this.renderer.removeListener(EVENT_WEBGL_CONTEXT_RESTORED, this.handleContextRestored);
            this.renderer.removeListener(EVENT_WEBGL_CONTEXT_LOST, this.handleContextLost);
        }

        window.removeEventListener('vrdisplaypresentchange', this.onVrPresentChange);
        window.removeEventListener('vrdisplayactivate', this.handleEnableVr);
        window.removeEventListener('vrdisplaydeactivate', this.handleDisableVr);
    }

    /**
     * @inheritdoc
     */
    resize() {
        super.resize();
        if (this.renderer) {
            this.renderer.resize();
        }
    }

    /**
     * Called on preview destroy and detach communication from sub modules
     *
     * @return {void}
     */
    destroy() {
        super.destroy();

        this.detachEventHandlers();
        this.destroySubModules();

        this.destroyed = true;
    }

    /**
     * Destroy any submodules required for previewing this document
     *
     * @return {void}
     */
    destroySubModules() {
        if (this.controls) {
            this.controls.destroy();
        }
        if (this.renderer) {
            this.renderer.destroy();
        }
    }

    /**
     * Loads a 3D Scene
     *
     * @return {Promise} to load assets and representation
     */
    load() {
        this.setup();
        super.load();
        return Promise.all([this.loadAssets(JS), this.getRepStatus().getPromise()])
            .then(this.postLoad)
            .catch(this.handleAssetError);
    }

    /**
     * Finishes loading a 3D scene
     *
     * @return {void}
     */
    postLoad() {
        /* global BoxSDK */
        const { representation, token, apiHost, sharedLink } = this.options;
        const template = representation.content.url_template;
        this.boxSdk = new BoxSDK({
            token,
            sharedLink,
            apiBase: apiHost
        });
        this.createSubModules();
        this.attachEventHandlers();
        this.renderer.load(this.createContentUrl(template, 'entities.json'), this.options).catch(this.handleError);
    }

    /**
     * Prefetches assets for a 3D scene.
     *
     * @param {boolean} [options.assets] - Whether or not to prefetch static assets
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ assets = true, content = true }) {
        if (assets) {
            this.prefetchAssets(JS);
        }

        const representation = this.options.representation;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            get(this.createContentUrl(template, 'entities.json'), this.appendAuthHeader(), 'any');
        }
    }

    /**
     * @inheritdoc
     */
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl);
    }

    /**
     * Handle the loss of the WebGL context by cleaning up the controls and renderer.
     *
     * @return {void}
     */
    handleContextLost() {
        this.contextNotification.show('WebGL Context Lost');
        this.destroySubModules();
    }

    /**
     * Handle the restoration of the WebGL context by reloading the preview.
     *
     * @return {void}
     */
    handleContextRestored() {
        this.detachEventHandlers();
        this.contextNotification.show('WebGL Context Restored');
        this.emit('progressstart');
        this.previewUI.showLoadingIndicator();
        this.postLoad();
    }

    /**
     * Handles toggle VR event
     *
     * @return {void}
     */
    handleToggleVr() {
        this.renderer.toggleVr();
    }

    /**
     * Handles enabling VR
     *
     * @return {void}
     */
    handleEnableVr() {
        this.renderer.enableVr();
    }

    /**
     * Handles disabling VR
     *
     * @return {void}
     */
    handleDisableVr() {
        this.renderer.disableVr();
    }

    /**
     * Add/remove the vr-enabled class when vr events occur
     * @return {void}
     */
    onVrPresentChange() {
        // event.display should be defined but isn't when using the webvr-polyfill
        // so we'll hack this for now.
        const vrDevice = this.renderer.box3d.getVrDisplay();

        // On desktop, we won't be removing the action bar in VR mode.
        if (!Browser.isMobile()) {
            return;
        }

        if (vrDevice && vrDevice.isPresenting) {
            this.wrapperEl.classList.add(CLASS_VR_ENABLED);
        } else {
            this.wrapperEl.classList.remove(CLASS_VR_ENABLED);
        }

        if (this.controls) {
            this.controls.vrEnabled = vrDevice && vrDevice.isPresenting;
        }
    }

    /**
     * Handle scene loaded event
     *
     * @return {void}
     */
    handleSceneLoaded() {
        if (this.controls) {
            this.controls.addUi();
        }
        this.emit(EVENT_LOAD);
        this.loaded = true;
    }

    /**
     * Handle show VR button event
     *
     * @return {void}
     */
    handleShowVrButton() {
        this.controls.showVrButton();
    }

    /**
     * Handle reset event
     *
     * @return {void}
     */
    handleReset() {
        if (this.renderer) {
            this.renderer.reset();
        }
    }

    /**
     * Handle error events and emit a message
     *
     * @param {Error} error - The error that caused this to be triggered. To be emitted.
     * @return {void}
     */
    handleError(error) {
        this.emit(EVENT_ERROR, error);
    }
}

export default Box3DViewer;
