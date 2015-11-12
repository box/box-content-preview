'use strict';

import EventEmitter from 'events';
import autobind from 'autobind-decorator';
import settingsTemplate from 'raw!../../html/model3d/settings.html';
import {EVENT_ROTATE_ON_AXIS} from './model3d-constants';

const AXIS_X = 'x';
const AXIS_Y = 'y';
const AXIS_Z = 'z';
const CSS_CLASS_HIDDEN = 'hidden';
const CSS_CLASS_CURRENT_AXIS = 'current-axis';
const ROTATION_STEP = 90;

@autobind
class Model3dSettings extends EventEmitter  {
	/**
	 * [constructor]
	 * @param {HTMLElement} containerEl the container element
	 * @returns {Model3dControls} Model3dControls instance
	 */
	constructor(containerEl) {
		super();

		this.containerEl = containerEl;

		let template = settingsTemplate.replace(/\>\s*\</g, '><'); // removing new lines

		this.containerEl.appendChild(document.createRange().createContextualFragment(template));

		this.currentAxis = AXIS_Y;

		this.el = this.containerEl.querySelector('.preview-settings-wrapper');
		this.settingsButtonEl = this.el.querySelector('.icon-cog');
		this.settingsPanelEl = this.el.querySelector('.settings-panel');
		this.orientationXButton = this.el.querySelector('.orientation-x');
		this.orientationYButton = this.el.querySelector('.orientation-y');
		this.orientationZButton = this.el.querySelector('.orientation-z');
		this.currentAxisEl = this.el.querySelector('.' + CSS_CLASS_CURRENT_AXIS);
		this.rotateNegativeButtonEl = this.el.querySelector('.icon-setting-arrow-left');
		this.rotatePositiveButtonEl = this.el.querySelector('.icon-setting-arrow-right');
		this.attachEventHandlers();
	}

	/**
	 * Called on preview destroy
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
		this.orientationXButton.addEventListener('click', this.handleSelectOrientationX);
		this.orientationYButton.addEventListener('click', this.handleSelectOrientationY);
		this.orientationZButton.addEventListener('click', this.handleSelectOrientationZ);
		this.rotateNegativeButtonEl.addEventListener('click', this.handleRotateNegative);
		this.rotatePositiveButtonEl.addEventListener('click', this.handleRotatePositive);
		this.settingsButtonEl.addEventListener('click', this.handleToggleSettingsPanel);
	}

	/**
	 * Detaches event handlers
	 * @returns {void}
	 */
	detachEventHandlers() {
		this.orientationXButton.removeEventListener('click', this.handleSelectOrientationX);
		this.orientationYButton.removeEventListener('click', this.handleSelectOrientationY);
		this.orientationZButton.removeEventListener('click', this.handleSelectOrientationZ);
		this.rotateNegativeButtonEl.removeEventListener('click', this.handleRotateNegative);
		this.rotatePositiveButtonEl.removeEventListener('click', this.handleRotatePositive);
		this.settingsButtonEl.removeEventListener('click', this.handleToggleSettingsPanel);
	}

	/**
	 * Rotate positively on the currently selected axis
	 * @returns {void}
	 */
	handleRotatePositive() {
		this.rotateOnCurrentAxis(1);
	}

	/**
	 * Rotate negatively on the currently selected axis
	 * @returns {void}
	 */
	handleRotateNegative() {
		this.rotateOnCurrentAxis(-1);
	}

	/**
	 * Sets X as the current axis
	 * @returns {void}
	 */
	handleSelectOrientationX() {
		this.setCurrentRotationAxis(AXIS_X, this.orientationXButton);
	}

	/**
	 * Sets Y as the current axis
	 * @returns {void}
	 */
	handleSelectOrientationY() {
		this.setCurrentRotationAxis(AXIS_Y, this.orientationYButton);
	}

	/**
	 * Sets Z as the current axis
	 * @returns {void}
	 */
	handleSelectOrientationZ() {
		this.setCurrentRotationAxis(AXIS_Z, this.orientationZButton);
	}

	/**
	 * Toggles visibility of settings panel
	 * @returns {void}
	 */
	handleToggleSettingsPanel() {
		this.settingsPanelEl.classList.toggle(CSS_CLASS_HIDDEN);
	}

	/**
	 * Set the axis in which we will rotate the model
	 * @param {string} axisKey The axis to set for current rotation
	 * @param {element} el The element to set as the active axis
	 * @returns {void}
	 */
	setCurrentRotationAxis(axisKey, el) {
		this.currentAxisEl.classList.remove(CSS_CLASS_CURRENT_AXIS);
		el.classList.add(CSS_CLASS_CURRENT_AXIS);
		this.currentAxis = axisKey;
		this.currentAxisEl = el;
	}

	/**
	 * Given a direction, rotate around the setting set axis
	 * @param {int} direction The direction to spin around and axis
	 * @returns {void}
	 */
	rotateOnCurrentAxis(direction) {
		var axis = {};
		axis[this.currentAxis] = direction * ROTATION_STEP;

		this.emit(EVENT_ROTATE_ON_AXIS, axis);
	}
}

export default Model3dSettings;
