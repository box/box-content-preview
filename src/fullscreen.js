'use strict';

import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import EventEmitter from 'events';

@autobind
class Fullscreen extends EventEmitter {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @returns {Image}
     */
    constructor() {
        super();

        if (!instance) {
            instance = this;
        }

        this.document = global.document;
        this.document.addEventListener('webkitfullscreenchange', this.fullscreenchangeHandler);
        this.document.addEventListener('mozfullscreenchange', this.fullscreenchangeHandler);
        this.document.addEventListener('MSFullscreenChange', this.fullscreenchangeHandler);
        this.document.addEventListener('fullscreenchange', this.fullscreenchangeHandler);

        return instance;
    }

    /**
     * Returns true if the browser supports fullscreen natively
     * @return {Boolean}
     * @private
     */
    isSupported() {
        return this.document.fullscreenEnabled || this.document.webkitFullscreenEnabled || this.document.mozFullScreenEnabled || this.document.msFullscreenEnabled;
    }

    /**
     * Return true if full screen is active
     * @returns {Boolean}
     * @private
     */
    isFullscreen() {
        return this.document.fullscreenElement || this.document.mozFullScreenElement || this.document.webkitFullscreenElement || this.document.msFullscreenElement;
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
     * @param {string} [enter] enter or exit
     * @return {void}
     * @private
     */
    toggle(enter) {

        enter = enter || !this.isFullscreen();

        if (enter) {
            if (this.document.documentElement.requestFullscreen) {
                this.document.documentElement.requestFullscreen();
            } else if (this.document.documentElement.msRequestFullscreen) {
                this.document.documentElement.msRequestFullscreen();
            } else if (this.document.documentElement.mozRequestFullScreen) {
                this.document.documentElement.mozRequestFullScreen();
            } else if (this.document.documentElement.webkitRequestFullscreen) {
                this.document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }    
        } else {
            if (this.document.exitFullscreen) {
                this.document.exitFullscreen();
            } else if (this.document.msExitFullscreen) {
                this.document.msExitFullscreen();
            } else if (this.document.mozCancelFullScreen) {
                this.document.mozCancelFullScreen();
            } else if (this.document.webkitExitFullscreen) {
                this.document.webkitExitFullscreen();
            }    
        }
    }

    /**
     * Toggles fullscreen mode
     * @return {void}
     * @private
     */
    enter() {
        this.toggle(true);
    }

    /**
     * Toggles fullscreen mode
     * @return {void}
     * @private
     */
    exit() {
        this.toggle(false);
    }
}

let instance = new Fullscreen();
module.exports = instance;
