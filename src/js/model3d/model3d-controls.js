'use strict';

import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import controlsTemplate from 'raw!../../html/model3d/controls.html';
import {EVENT_SET_RENDER_MODE,EVENT_ENABLE_VR,EVENT_DISABLE_VR} from './model3d-constants';

const CSS_CLASS_HIDDEN = 'hidden';
const CSS_CLASS_CURRENT_RENDER_MODE = 'current-render-mode';
const RENDER_MODES = {
	lit: {
		name: 'Lit',
		key: 'lit',
		icon: 'icon-rm-lit',
		renderMode: 'Lit',
		elQuery: '.rm-lit',//class associated with the unique menu item  rmunlit rm-normals rm-wireframe rm-untexturedwireframe rm-uvoverlay
		el: null
	},
	unlit: {
		name: 'Unlit',
		key: 'unlit',
		icon: 'icon-rm-unlit',
		renderMode: 'Unlit',
		elQuery: '.rm-unlit',
		el: null
	},
	normals: {
		name: 'Normals',
		key: 'normals',
		icon: 'icon-rm-normals',
		renderMode: 'Normals',
		elQuery: '.rm-normals',
		el: null
	},
	wireframe: {
		name: 'Wireframe',
		key: 'wireframe',
		icon: 'icon-rm-wireframe',
		renderMode: 'Wireframe',
		elQuery: '.rm-wireframe',
		el: null
	},
	flatwire: {
		name: 'Untextured Wireframe',
		key: 'flatwire',
		icon: 'icon-rm-untexturedwireframe',
		renderMode: 'Untextured Wireframe',
		elQuery: '.rm-untexturedwireframe',
		el: null
	},
	uv: {
		name: 'UV Overlay',
		key: 'uv',
		icon: 'icon-rm-uvoverlay',
		renderMode: 'UV Overlay',
		elQuery: '.rm-uvoverlay',
		el: null
	}
};

@autobind
class Model3dControls extends EventEmitter  {
	/**
	 * [constructor]
	 * @param {HTMLElement} containerEl the container element
	 * @returns {Model3dControls} Model3dControls instance
	 */
	constructor(containerEl) {
		super();

		this.vrEnabled = false;

		this.containerEl = containerEl;

		let template = controlsTemplate.replace(/\>\s*\</g, '><'); // removing new lines

		this.containerEl.appendChild(document.createRange().createContextualFragment(template));

		this.el = this.containerEl.querySelector('.model3d-controls');

		this.renderModeCurrent = 'Lit';
		this.renderModesButtonEl = this.el.querySelector('.icon-rendermodes');
		this.renderModesSelectorEl = this.el.querySelector('.render-mode-selector');
		this.renderModeLitButtonEl = this.el.querySelector('.rm-lit');
		this.renderModeUnlitButtonEl = this.el.querySelector('.rm-unlit');
		this.renderModeNormalsButtonEl = this.el.querySelector('.rm-normals');
		this.renderModeWireframeButtonEl = this.el.querySelector('.rm-wireframe');
		this.renderModeUntexturedWireframeButtonEl = this.el.querySelector('.rm-untexturedwireframe');
		this.renderModeUVOverlayButtonEl = this.el.querySelector('.rm-uvoverlay');
		this.renderModeIconEl = this.el.querySelector('.icon-rendermodes');
		this.renderModeMenuItemEl = this.el.querySelector('.' + CSS_CLASS_CURRENT_RENDER_MODE);
		this.fullscreenButtonEl = this.el.querySelector('.controls-fullscreen');
		this.resetButtonEl = this.el.querySelector('.controls-reset');
		this.vrButtonEl = this.el.querySelector('.controls-vr');

		this.attachEventHandlers();
	}

	destroy() {
		this.detachEventHandlers();
	}

	/**
	 * Attaches event handlers
	 * @returns {void}
	 */
	attachEventHandlers() {
		this.fullscreenButtonEl.addEventListener('click', this.handleToggleFullscreen);
		this.renderModesButtonEl.addEventListener('click', this.handleToggleRenderModes);
		this.renderModeLitButtonEl.addEventListener('click', this.handleSelectRenderModeLit);
		this.renderModeUnlitButtonEl.addEventListener('click', this.handleSelectRenderModeUnlit);
		this.renderModeNormalsButtonEl.addEventListener('click', this.handleSelectRenderModeNormals);
		this.renderModeWireframeButtonEl.addEventListener('click', this.handleSelectRenderModeWireframe);
		this.renderModeUntexturedWireframeButtonEl.addEventListener('click', this.handleSelectRenderModeFlatwire);
		this.renderModeUVOverlayButtonEl.addEventListener('click', this.handleSelectRenderModeUv);
		this.resetButtonEl.addEventListener('click', this.handleReset);
		this.vrButtonEl.addEventListener('click', this.handleToggleVr)
	}

	/**
	 * Detaches event handlers
	 * @returns {void}
	 */
	detachEventHandlers() {
		this.fullscreenButtonEl.removeEventListener('click', this.handleToggleFullscreen);
		this.renderModesButtonEl.removeEventListener('click', this.handleToggleRenderModes);
		this.renderModeLitButtonEl.removeEventListener('click', this.handleSelectRenderModeLit);
		this.renderModeUnlitButtonEl.removeEventListener('click', this.handleSelectRenderModeUnlit);
		this.renderModeNormalsButtonEl.removeEventListener('click', this.handleSelectRenderModeNormals);
		this.renderModeWireframeButtonEl.removeEventListener('click', this.handleSelectRenderModeWireframe);
		this.renderModeUntexturedWireframeButtonEl.removeEventListener('click', this.handleSelectRenderModeFlatwire);
		this.renderModeUVOverlayButtonEl.removeEventListener('click', this.handleSelectRenderModeUv);
		this.resetButtonEl.removeEventListener('click', this.handleReset);
		this.vrButtonEl.removeEventListener('click', this.handleToggleVr)
	}

	/**
	 * Handle toggle fullscreen event
	 * @returns {void}
	 */
	handleToggleFullscreen() {
		this.emit('toggleFullscreen');
	}

	/**
	 * Handle toggle rendermodes ui event
	 * @returns {void}
	 */
	handleToggleRenderModes() {
		this.renderModesSelectorEl.classList.toggle(CSS_CLASS_HIDDEN);
	}

	handleToggleVr() {
		if (this.vrEnabled) {
			this.vrEnabled = false;
			this.emit(EVENT_DISABLE_VR);
		} else {
			this.vrEnabled = true;
			this.emit(EVENT_ENABLE_VR);
		}
	}

	/**
	 * Handle select render mode 'lit' event
	 * @returns {void}
	 */
	handleSelectRenderModeLit() {
		this.setRenderMode(RENDER_MODES.lit);
	}

	/**
	 * Handle select render mode 'unlit' event
	 * @returns {void}
	 */
	handleSelectRenderModeUnlit() {
		this.setRenderMode(RENDER_MODES.unlit);
	}

	/**
	 * Handle select render mode 'normals' event
	 * @returns {void}
	 */
	handleSelectRenderModeNormals() {
		this.setRenderMode(RENDER_MODES.normals);
	}

	/**
	 * Handle select render mode 'wireframe' event
	 * @returns {void}
	 */
	handleSelectRenderModeWireframe() {
		this.setRenderMode(RENDER_MODES.wireframe);
	}

	/**
	 * Handle select render mode 'flatwire' event
	 * @returns {void}
	 */
	handleSelectRenderModeFlatwire() {
		this.setRenderMode(RENDER_MODES.flatwire);
	}

	/**
	 * Handle select render mode 'uv' event
	 * @returns {void}
	 */
	handleSelectRenderModeUv() {
		this.setRenderMode(RENDER_MODES.uv);
	}

	/**
	 * Handles the reset event
	 * @returns {void}
	 */
	handleReset() {
		// Reset the render mode to the default render mode of this preview.
		this.setRenderMode(RENDER_MODES.lit);
		this.emit(EVENT_SET_RENDER_MODE);
	}

	/**
	 * Enables the VR button
	 * @returns {void}
	 */
	showVrButton() {
		this.vrButtonEl.classList.remove(CSS_CLASS_HIDDEN);
	}

	/**
	 * Set the render mode.
	 * @private
	 * @param {string} mode The render mode
	 * @returns {void}
	 */
	setRenderMode(mode) {
		this.emit('setRenderMode', mode.renderMode);

		this.renderModeIconEl.className = mode.icon;
		this.renderModesSelectorEl.classList.add(CSS_CLASS_HIDDEN);

		mode.el = mode.el || this.el.querySelector(mode.elQuery);

		this.renderModeMenuItemEl.classList.remove(CSS_CLASS_CURRENT_RENDER_MODE);
		mode.el.classList.add(CSS_CLASS_CURRENT_RENDER_MODE);

		this.renderModeMenuItemEl = mode.el;
		this.renderModeCurrent = mode.key;
	}
}

export default Model3dControls;
