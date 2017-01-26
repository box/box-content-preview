/* global BoxSDK */
import autobind from 'autobind-decorator';
import Base from '../base';
import fullscreen from '../../fullscreen';
import Box3DControls from './box3d-controls';
import Box3DRenderer from './box3d-renderer';
import Browser from '../../browser';
import { get } from '../../util';
import {
    CSS_CLASS_BOX3D,
    EVENT_ERROR,
    EVENT_LOAD,
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_SHOW_VR_BUTTON,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_TOGGLE_VR
} from './box3d-constants';
import JS from './box3d-assets';
import './box3d.scss';

// Milliseconds to wait for model to load before cancelling Preview
const LOAD_TIMEOUT = 50000;

const CLASS_VR_ENABLED = 'vr-enabled';

/**
 * Box3D
 * This is the entry point for Box3D Preview Base
 * @class
 */
class Box3D extends Base {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
        super.setup();

        this.renderer = null;
        this.controls = null;
        this.destroyed = false;

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_BOX3D;

        this.loadTimeout = LOAD_TIMEOUT;

        this.createSubModules();
        this.attachEventHandlers();
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
        }

        // For addition/removal of VR class when display stops presenting
        window.addEventListener('vrdisplaypresentchange', this.onVrPresentChange);
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
        }

        window.removeEventListener('vrdisplaypresentchange', this.onVrPresentChange);
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
     * Called on preview destroy and detach communication from sub modules
     *
     * @return {void}
     */
    destroy() {
        super.destroy();

        this.detachEventHandlers();

        if (this.controls) {
            this.controls.destroy();
        }
        if (this.renderer) {
            this.renderer.destroy();
        }

        this.destroyed = true;
    }

    /**
     * Loads a 3D Scene
     *
     * @return {void}
     */
    load() {
        this.setup();

        const { representation, token, api, sharedLink } = this.options;
        const { data, status } = representation;
        const { content } = data;
        const { url_template: template } = content;

        Promise.all(this.loadAssets(JS), status.getPromise()).then(() => {
            this.boxSdk = new BoxSDK({
                token,
                sharedLink,
                apiBase: api
            });
            this.renderer
                .load(this.createContentUrl(template, 'entities.json'), this.options)
                .catch(this.handleError);
        });
        super.load();
    }

    /**
     * Prefetches a 3D Scene
     *
     * @returns {void}
     */
    prefetch() {
        const { url_template: template } = this.options.representation.data.content;
        this.prefetchAssets(JS);
        get(this.createContentUrl(template, 'entities.json'), this.appendAuthHeader(), 'any');
    }

    /**
     * @inheritdoc
     */
    @autobind
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl);
    }

    /**
     * Handles toggle VR event
     *
     * @return {void}
     */
    @autobind
    handleToggleVr() {
        this.renderer.toggleVr();
    }

    /**
     * Add/remove the vr-enabled class when vr events occur
     * @return {void}
     */
    @autobind
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
    @autobind
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
    @autobind
    handleShowVrButton() {
        this.controls.showVrButton();
    }

    /**
     * Handle reset event
     *
     * @return {void}
     */
    @autobind
    handleReset() {
        this.renderer.reset();
    }

    /**
     * Handle error events and emit a message
     *
     * @param {Error} The - error that caused this to be triggered. To be emitted.
     * @return {void}
     */
    @autobind
    handleError(error) {
        this.emit(EVENT_ERROR, error);
    }
}

export default Box3D;
