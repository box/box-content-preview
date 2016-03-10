import autobind from 'autobind-decorator';
import EventEmitter from 'events';

@autobind
class Fullscreen extends EventEmitter {

    /**
     * [constructor]
     * @param {string|HTMLElement} event The mousemove event
     * @returns {Fullscreen} Fullscreen instance
     */
    constructor() {
        super();

        document.addEventListener('webkitfullscreenchange', this.fullscreenchangeHandler);
        document.addEventListener('mozfullscreenchange', this.fullscreenchangeHandler);
        document.addEventListener('MSFullscreenChange', this.fullscreenchangeHandler);
        document.addEventListener('fullscreenchange', this.fullscreenchangeHandler);
    }

    /**
     * Returns true if the browser supports fullscreen natively
     *
     * @private
     * @returns {Boolean} Fullscreen supported or not
     */
    isSupported() {
        return document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled;
    }

    /**
     * Return true if full screen is active
     *
     * @public
     * @returns {Boolean} In fullscreen or not
     */
    isFullscreen() {
        return !!(document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    }

    /**
     * Fires events when the fullscreen state changes
     * @returns {void}
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
     *
     * @private
     * @param {HTMLElement} el fullscreen element
     * @param {Object} vrDevice The HMD device used by WebVR
     * @returns {void}
     */
    toggle(el, vrDevice) {
        const options = vrDevice ? { vrDisplay: vrDevice } : Element.ALLOW_KEYBOARD_INPUT;
        const element = el || document.documentElement;

        if (!this.isFullscreen()) {
            if (element.requestFullscreen) {
                element.requestFullscreen(options);
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen(options);
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen(options);
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen(options);
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
