'use strict';

import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import controlsTemplate from 'raw!../../html/image360/controls.html';
import {EVENT_ENABLE_VR,EVENT_DISABLE_VR} from './image360-constants';

const CSS_CLASS_HIDDEN = 'hidden';

/**
 * Image360Controls
 * This class handles the UI for 3d preview controls. This includes Reset,
 * Render Mode selection, VR and fullscreen buttons.
 * @class
 */
@autobind
class Image360Controls extends EventEmitter  {
	/**
	 * [constructor]
	 * @param {HTMLElement} containerEl the container element
	 * @returns {Image360Controls} Image360Controls instance
	 */
	constructor(containerEl) {
		super();

		this.vrEnabled = false;

		this.containerEl = containerEl;

		let template = controlsTemplate.replace(/\>\s*\</g, '><'); // removing new lines

		this.containerEl.appendChild(document.createRange().createContextualFragment(template));

		this.el = this.containerEl.querySelector('.image360-controls');

		this.fullscreenButtonEl = this.el.querySelector('.controls-fullscreen');
		this.resetButtonEl = this.el.querySelector('.controls-reset');
		this.vrButtonEl = this.el.querySelector('.controls-vr');

		this.attachEventHandlers();
	}

	/**
	 * Destroy handler
	 * @returns {void}
	 */
	destroy() {
		this.detachEventHandlers();
	}

	/**
	 * Attaches event handlers
	 * @returns {void}
	 */
	attachEventHandlers() {
		this.fullscreenButtonEl.addEventListener('click', this.handleToggleFullscreen);
		this.vrButtonEl.addEventListener('click', this.handleToggleVr);
	}

	/**
	 * Detaches event handlers
	 * @returns {void}
	 */
	detachEventHandlers() {
		this.fullscreenButtonEl.removeEventListener('click', this.handleToggleFullscreen);
		this.vrButtonEl.removeEventListener('click', this.handleToggleVr);
	}

	/**
	 * Handle toggle fullscreen event
	 * @returns {void}
	 */
	handleToggleFullscreen() {
		this.emit('toggleFullscreen');
	}

	/**
	 * Handle toggle VR event
	 * @returns {void}
	 */
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
	 * Enables the VR button
	 * @returns {void}
	 */
	showVrButton() {
		this.vrButtonEl.classList.remove(CSS_CLASS_HIDDEN);
	}
}

export default Image360Controls;
