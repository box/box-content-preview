/* global BoxSDK */
'use strict';

import './box3d.scss';
import Base from '../base';
import autobind from 'autobind-decorator';
import Box3DControls from './box3d-controls';
import Box3DRenderer from './box3d-renderer';
import {
    CSS_CLASS_BOX3D,
    EVENT_ENABLE_VR,
    EVENT_ERROR,
    EVENT_DISABLE_VR,
    EVENT_LOAD,
    EVENT_RESET,
    EVENT_SCENE_LOADED,
    EVENT_SHOW_VR_BUTTON,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_TRIGGER_RENDER
} from './box3d-constants';

/**
 * Box3D
 * This is the entry point for Box3D Preview Base
 * @class
 */
class Box3D extends Base {

    /**
     * Provides base functionality that ties together submodules that handle things like
     * Rendering webgl, Rendering UI, and handling communication between these
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

        const sdkOpts = { token: options.token, apiBase: options.api };
        this.boxSdk = new BoxSDK(sdkOpts);

        this.loadTimeout = 50000;

        this.createSubModules();
        this.attachEventHandlers();
    }

    /**
     * Create any submodules required for previewing this document
     * @returns {void}
     */
    createSubModules() {
        this.controls = new Box3DControls(this.wrapperEl);
        this.renderer = new Box3DRenderer(this.wrapperEl, this.boxSdk);
    }

    /**
     * Attaches event handlers and provides base events for controls and rendering
     * @returns {void}
     */
    attachEventHandlers() {
        if (this.controls) {
            this.controls.on(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
            this.controls.on(EVENT_ENABLE_VR, this.handleEnableVr);
            this.controls.on(EVENT_DISABLE_VR, this.handleDisableVr);
            this.controls.on(EVENT_RESET, this.handleReset);
        }

        if (this.renderer) {
            this.renderer.on(EVENT_SCENE_LOADED, this.handleSceneLoaded);
            this.renderer.on(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
        }
    }

    /**
     * Detaches event handlers
     * @returns {void}
     */
    detachEventHandlers() {
        if (this.controls) {
            this.controls.removeListener(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
            this.controls.removeListener(EVENT_ENABLE_VR, this.handleEnableVr);
            this.controls.removeListener(EVENT_DISABLE_VR, this.handleDisableVr);
            this.controls.removeListener(EVENT_RESET, this.handleReset);
        }

        if (this.renderer) {
            this.renderer.removeListener(EVENT_SCENE_LOADED, this.handleSceneLoaded);
            this.renderer.removeListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
        }
    }

    /**
     * Called on preview destroy
     * @returns {void}
     */
    destroy() {
        super.destroy();

        this.detachEventHandlers();
        this.controls.destroy();
        this.renderer.destroy();

        this.destroyed = true;
    }

    /**
     * Loads a 3D Scene
     * @param {string} assetUrl The asset to load into preview
     * @returns {Promise} A promise object which will be resolved/rejected on load
     */
    load(assetUrl) {
        // Temp hack
        this.renderer
        .load(this.appendAuthParam(assetUrl), this.options)
        .then(() => {
            if (this.destroyed) {
                return;
            }
        })
        .catch((err) => {
            /*eslint-disable*/
            console.error(err.message);
            console.error(err);
            /*eslint-enable*/
            this.emit(EVENT_ERROR, err.message);
        });
        super.load();
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
        this.vrDevice = undefined;
        this.renderer.disableVr();
    }

    /**
     * Handle scene loaded event
     * @returns {void}
     */
    @autobind
    handleSceneLoaded() {
        this.emit(EVENT_LOAD);
        this.loaded = true;
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
     * Handle reset event
     * @returns {void}
     */
    @autobind
    handleReset() {
        this.renderer.reset();
    }
}

export default Box3D;
