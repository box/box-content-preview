/* eslint no-console:0 */
/* global BoxSDK */
'use strict';

import '../../css/image360/image360.css';
import autobind from 'autobind-decorator';
import Base from '../base';
import Image360Controls from './image360-controls';
import Image360Renderer from './image360-renderer';
import {
    EVENT_ENABLE_VR,
    EVENT_DISABLE_VR,
    EVENT_LOAD,
    EVENT_ERROR,
    EVENT_SCENE_LOADED,
    EVENT_SHOW_VR_BUTTON,
    EVENT_TOGGLE_FULLSCREEN,
    EVENT_ENTER_FULLSCREEN,
    EVENT_EXIT_FULLSCREEN,
    EVENT_RELOAD,
    EVENT_SWITCH_2D
} from './image360-constants';
import 'file?name=boxsdk-0.1.1.js!../../third-party/model3d/boxsdk-0.1.1.js';
import 'file?name=box3d-resource-loader-0.1.1.js!../../third-party/model3d/box3d-resource-loader-0.1.1.js';
import 'file?name=box3d-runtime-0.8.1.js!../../third-party/model3d/box3d-runtime-0.8.1.js';

let Box = global.Box || {};

const CSS_CLASS_IMAGE360 = 'box-preview-image360';

/**
 * Image360
 * This is the entry point for the image360 preview.
 * @class
 */
@autobind
class Image360 extends Base {
    /**
     * [constructor]
     * @param {string|HTMLElement} container node
     * @param {object} [options] some options
     * @returns {Image360} the Image360 object instance
     */
    constructor(container, options) {
        super(container, options);

        this.wrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.wrapperEl.className = CSS_CLASS_IMAGE360;

        let sdkOpts = { token: options.token, apiBase: options.api };
        this.boxSdk = new BoxSDK(sdkOpts);

        this.controls = new Image360Controls(this.wrapperEl);
        this.renderer = new Image360Renderer(this.wrapperEl, this.boxSdk);

        this.attachEventHandlers();
    }

    /**
     * Attaches event handlers
     * @returns {void}
     */
    attachEventHandlers() {
        this.controls.addListener(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
        this.controls.addListener(EVENT_ENABLE_VR, this.handleEnableVr);
        this.controls.addListener(EVENT_DISABLE_VR, this.handleDisableVr);
        this.controls.addListener(EVENT_SWITCH_2D, this.switchTo2dViewer);
        this.renderer.addListener(EVENT_SCENE_LOADED, this.handleSceneLoaded);
        this.renderer.addListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
        this.addListener(EVENT_ENTER_FULLSCREEN, this.handleEnterFullscreen);
        this.addListener(EVENT_EXIT_FULLSCREEN, this.handleExitFullscreen);
    }

    /**
     * Detaches event handlers
     * @returns {void}
     */
    detachEventHandlers() {
        this.controls.removeListener(EVENT_TOGGLE_FULLSCREEN, this.toggleFullscreen);
        this.controls.removeListener(EVENT_ENABLE_VR, this.handleEnableVr);
        this.controls.removeListener(EVENT_DISABLE_VR, this.handleDisableVr);
        this.controls.removeListener(EVENT_SWITCH_2D, this.switchTo2dViewer);
        this.renderer.removeListener(EVENT_SCENE_LOADED, this.handleSceneLoaded);
        this.renderer.removeListener(EVENT_SHOW_VR_BUTTON, this.handleShowVrButton);
        this.removeListener(EVENT_ENTER_FULLSCREEN, this.handleEnterFullscreen);
        this.removeListener(EVENT_EXIT_FULLSCREEN, this.handleExitFullscreen);
    }

    /**
     * Loads a 360 photosphere.
     * @param {String} image360Url The image360 to load
     * @returns {Promise} A promise object which will be resolved/rejected on load
     */
    load(image360Url) {
        // Temp hack
        this.renderer
        .load(this.appendAuthParam(image360Url), this.options)
        .then(() => {
            this.emit(EVENT_LOAD);
            this.loaded = true;
        })
        .catch((err) => {
            console.error(err.message);
            console.error(err);
            this.emit(EVENT_ERROR, err.message);
        });
        super.load();
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
    }

    handleEnterFullscreen() {
        this.renderer.enterFullscreen();
    }

    handleExitFullscreen() {
        this.renderer.exitFullscreen();
    }

    /**
     * Handles enable VR event
     * @returns {void}
     */
    handleEnableVr() {
        this.renderer.enableVr();
    }

    /**
     * Handles disable VR event
     * @returns {void}
     */
    handleDisableVr() {
        this.renderer.disableVr();
    }

    /**
     * Handle scene loaded event
     * @returns {void}
     */
    handleSceneLoaded() {
    }

    /**
     * Handle show VR button event
     * @returns {void}
     */
    handleShowVrButton() {
        this.controls.showVrButton();
    }

    /**
     * Switches back to 2D viewer
     * @returns {void}
     */
    switchTo2dViewer() {
        Box.Preview.enableViewers('Image');
        this.emit(EVENT_RELOAD);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.Image360 = Image360;
global.Box = Box;
export default Image360;
