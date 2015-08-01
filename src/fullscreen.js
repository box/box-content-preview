'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';

let document = global.document;
let singleton = null; 

@autobind
class Fullscreen extends EventEmitter {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @returns {Image}
     */
    constructor() {
        super();

        if (singleton) {
            return singleton;
        } else {
            singleton = this;
        }

        document.addEventListener('webkitfullscreenchange', this.fullscreenchangeHandler);
        document.addEventListener('mozfullscreenchange', this.fullscreenchangeHandler);
        document.addEventListener('MSFullscreenChange', this.fullscreenchangeHandler);
        document.addEventListener('fullscreenchange', this.fullscreenchangeHandler);

        return singleton;
    }

    /**
     * Returns true if the browser supports fullscreen natively
     * @return {Boolean}
     * @private
     */
    isSupported() {
        return document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled;
    }

    /**
     * Return true if full screen is active
     * @returns {Boolean}
     * @private
     */
    isFullscreen() {
        return document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    }

    /**
     * Fires events when the fullscreen state changes
     * @return {void}
     * @private
     */
    fullscreenchangeHandler() {
        if (this.isFullscreen()) {
            this.emit('enter');
        } else {    
            this.emit('exit');
        }
    }

    /**
     * Toggles fullscreen mode
     * @param {HTMLElement} element
     * @return {void}
     * @private
     */
    toggle(element) {

        element = element || document.documentElement;

        if (!this.isFullscreen()) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }    
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }    
        }
    }
}

export default new Fullscreen();
