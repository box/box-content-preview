'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';
import fullscreen from './fullscreen';
import Controls from './controls';

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

        // Get the container dom element if selector was passed
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        // Double check if the layout is accurate and if not create it.
        // This code should never execute when using the wrapper preview.js
        if (!container.firstElementChild || !container.firstElementChild.classList.contains('box-preview')) {
            container.innerHTML = '<div class="box-preview"></div>';
        }

        // Save handles to the container and make its position relative
        // so that the childen can be positioned absolute
        this.containerEl = container.firstElementChild;
        container.style.position = 'relative';

        // Attach common full screen events
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
        this.containerEl.innerHTML = '';    
    }        
}

export default Base;
