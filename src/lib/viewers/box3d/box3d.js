/* global BoxSDK */
import autobind from 'autobind-decorator';
import Base from '../base';
import fullscreen from '../../fullscreen';
import Box3DControls from './box3d-controls';
import Box3DRenderer from './box3d-renderer';
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
import './box3d.scss';

// Milliseconds to wait for model to load before cancelling Preview
const LOAD_TIMEOUT = 50000;

/**
 * Box3D
 * This is the entry point for Box3D Preview Base
 * @class
 */
class Box3D extends Base {

    /**
     * Provides base functionality that ties together submodules that handle things like
     * Rendering webgl, Rendering UI, and handling communication between these
     *
     * @inheritdoc
     * @constructor
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @param {string} [options.token] OAuth2 token used for authorizing API requests
     * @param {string} [options.api] Base URL to use for all api requests
     * @returns {Box3D} the Box3D object instance
     */
    constructor(container, options) {
        super(container, options);

        this.renderer = null;
        this.controls = null;
        this.destroyed = false;

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_BOX3D;

        const sdkOpts = {
            token: options.token,
            apiBase: options.api,
            sharedLink: options.sharedLink
        };

        this.boxSdk = new BoxSDK(sdkOpts);

        this.loadTimeout = LOAD_TIMEOUT;

        this.createSubModules();
        this.attachEventHandlers();
    }

    /**
     * Create any submodules required for previewing this document
     *
     * @returns {void}
     */
    createSubModules() {
        this.controls = new Box3DControls(this.wrapperEl);
        this.renderer = new Box3DRenderer(this.wrapperEl, this.boxSdk);
    }

    /**
     * Attaches event handlers and provides base events for controls and rendering
     *
     * @returns {void}
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
    }

    /**
     * Detaches event handlers
     *
     * @returns {void}
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
     * @returns {void}
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
     * @param {string} assetUrl The asset to load into preview
     * @returns {Promise} A promise object which will be resolved/rejected on load
     */
    load(assetUrl) {
        this.renderer
        .load(this.appendAuthParam(assetUrl), this.options)
        .catch(this.handleError);
        super.load();
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
     * @returns {void}
     */
    @autobind
    handleToggleVr() {
        this.renderer.toggleVr();
    }

    /**
     * Handle scene loaded event
     *
     * @returns {void}
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
     * @returns {void}
     */
    @autobind
    handleShowVrButton() {
        this.controls.showVrButton();
    }

    /**
     * Handle reset event
     *
     * @returns {void}
     */
    @autobind
    handleReset() {
        this.renderer.reset();
    }

    /**
     * Handle error events and emit a message
     *
     * @param {Error} The error that caused this to be triggered. To be emitted.
     * @returns {void}
     */
    @autobind
    handleError(error) {
        this.emit(EVENT_ERROR, error);
    }
}

export default Box3D;
