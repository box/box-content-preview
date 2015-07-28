'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fullscreen from './fullscreen';

const OPTIONS = {
    ui: true
};

let document = global.document;


@autobind
class Base extends EventEmitter {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super();

        this.options = options || OPTIONS;
        this.currentRotationAngle = 0;

        if (typeof container === 'string') {
            this.containerEl = document.querySelector(container);
        } else {
            this.containerEl = container;
        }

        this.containerEl.style.position = 'relative';
        this.containerEl.setAttribute('tabindex', '-1');
    }

    /**
     * Enters fullscreen
     * @private
     * @returns {void}
     */
    enterFullscreen() {
        fullscreen.enter();
        this.emit('enterfullscreen');    
    }

    /**
     * Exits fullscreen
     * @private
     * @returns {void}
     */
    exitFullscreen() {
        fullscreen.exit();
        this.emit('exitfullscreen');    
    }

    /**
     * Destroys the viewer
     * @private
     * @returns {void}
     */
    destroy() {
        // empty    
    }        
}

module.exports = Base;
