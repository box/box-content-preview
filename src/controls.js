'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import util from './util';

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';
const PREVIEW_CONTROLS_SELECTOR = '.box-preview-controls';
const CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS = 1500;

let document = global.document;

@autobind
class Controls {

    /**
     * [constructor]
     * @param {HTMLElement} event The mousemove event
     * @returns {Controls}
     */
    constructor(container) {
        this.containerEl = container;

        this.controlsWrapperEl = this.containerEl.appendChild(document.createElement('div'));
        this.controlsWrapperEl.className = 'box-preview-controls-wrapper';

        this.controlsEl = this.controlsWrapperEl.appendChild(document.createElement('div'));
        this.controlsEl.className = 'box-preview-controls';

        this.mouseMoveHandler = util.throttle(() => {
            this.containerEl.classList.add(SHOW_PREVIEW_CONTROLS_CLASS);
            this.resetTimeout();
        }, CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS - 500, true);

        this.containerEl.addEventListener('mousemove', this.mouseMoveHandler)
        this.controlsEl.addEventListener('mouseenter', this.mouseEnterHandler);
        this.controlsEl.addEventListener('mouseleave', this.mouseLeaveHandler);
    }

    /**
     * @private
     * @returns {void}
     */
    resetTimeout() {
        clearTimeout(this.controlDisplayTimeoutId);
        this.controlDisplayTimeoutId = setTimeout(() => {

            clearTimeout(this.controlDisplayTimeoutId);

            if (this.blockHiding) {
                this.resetTimeout();
            } else {
                this.containerEl.classList.remove(SHOW_PREVIEW_CONTROLS_CLASS);
                this.containerEl.focus();
            }

        }, CONTROLS_AUTO_HIDE_TIMEOUT_IN_MILLIS);
    }

    /**
     * @private
     * @returns {void}
     */
    mouseEnterHandler() {
        this.blockHiding = true;
    }

    /**
     * @private
     * @returns {void}
     */
    mouseLeaveHandler() {
        this.blockHiding = false;
    }

    /**
     * @private
     * @returns {void}
     */
    add(text, handler) {
        let cell = document.createElement('div');
        cell.className = 'box-preview-controls-cell';

        let button = document.createElement('button');
        button.className = 'box-preview-controls-btn';
        button.textContent = text;
        button.addEventListener('click', handler);

        cell.appendChild(button);
        this.controlsEl.appendChild(cell);
    }

}

module.exports = Controls;

