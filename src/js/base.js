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
     * Zooms in
     * @public
     * @returns {void}
     */
    zoomIn() {
        this.zoom('in');
    }

    /**
     * Zooms in
     * @public
     * @returns {void}
     */
    zoomOut() {
        this.zoom('out');
    }

    /**
     * Zooms in
     * @private
     * @returns {void}
     */
    loadUI() {
        this.controls = new Controls(this.containerEl);
        this.controls.add(__('zoom_in'), this.zoomIn, 'box-preview-image-zoom-in-icon');
        this.controls.add(__('zoom_out'), this.zoomOut, 'box-preview-image-zoom-out-icon');
        this.controls.add(__('fullscreen'), this.toggleFullscreen, 'box-preview-image-expand-icon');
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

export default Base;
