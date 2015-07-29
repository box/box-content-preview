'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fullscreen from './fullscreen';

const CLASS_FULLSCREEN = 'is-fullscreen';
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
            container = document.querySelector(container);
        }

        container.innerHTML = '<div class="box-preview"></div>';     
        this.containerEl = container.firstElementChild;
        this.containerEl.style.position = 'relative';

        fullscreen.on('enter', () => {
            this.containerEl.classList.add(CLASS_FULLSCREEN);
            this.emit('enterfullscreen');
        });

        fullscreen.on('exit', () => {
            this.containerEl.classList.remove(CLASS_FULLSCREEN);
            this.emit('exitfullscreen');
        });
    }

    /**
     * Enters or exits fullscreen
     * @private
     * @returns {void}
     */
    toggleFullscreen() {
        fullscreen.toggle(this.containerEl);    
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
