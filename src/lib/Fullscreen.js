import EventEmitter from 'events';
import fscreen from 'fscreen';

import { CLASS_FULLSCREEN } from './constants';

class Fullscreen extends EventEmitter {
    /**
     * [constructor]
     *
     * @return {Fullscreen} Fullscreen instance
     */
    constructor() {
        super();

        this.bindDOMListeners();
    }

    /**
     * Binds DOM listeners for Fullscreen.
     *
     * @protected
     * @return {void}
     */
    bindDOMListeners() {
        // as of now (1/12/18) fullscreenchange is not universally adopted, fscreen will
        // detect and add the appropriate vendor prefixed event
        fscreen.addEventListener('fullscreenchange', this.fullscreenchangeHandler);
    }

    /**
     * Binds DOM listeners for Fullscreen.
     *
     * @protected
     * @return {void}
     */
    unbindDOMListeners() {
        // as of now (1/12/18) fullscreenchange is not universally adopted, fscreen will
        // detect and add the appropriate vendor prefixed event
        fscreen.removeEventListener('fullscreenchange', this.fullscreenchangeHandler);
    }

    /**
     * [destructor]
     *
     * @protected
     * @return {void}
     */
    destroy() {
        this.unbindDOMListeners();
        this.removeAllListeners();
    }

    /**
     * Returns true if the browser supports fullscreen natively
     *
     * @private
     * @return {boolean} Fullscreen supported or not
     */
    isSupported() {
        return (
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        );
    }

    /**
     * Return true if full screen is active
     *
     * @public
     * @param {HTMLElement} [element] - fullscreen element
     * @return {boolean} In fullscreen or not
     */
    isFullscreen(element) {
        let fullscreen;
        if (this.isSupported()) {
            fullscreen = !!(
                document.fullscreenElement ||
                document.mozFullScreenElement ||
                document.webkitFullscreenElement ||
                document.msFullscreenElement
            );
        } else {
            fullscreen = element instanceof HTMLElement && element.classList.contains(CLASS_FULLSCREEN);
        }
        return fullscreen;
    }

    /**
     * Fires events when the fullscreen state changes
     *
     * @private
     * @param {HTMLElement|Event} [el] - Fullscreen element
     * @return {void}
     */
    fullscreenchangeHandler = (el) => {
        let enter = false;

        if (this.isSupported()) {
            if (this.isFullscreen()) {
                enter = true;
            }
        } else if (!this.isFullscreen(el)) {
            enter = true;
        }

        if (enter) {
            this.emit('enter');
        } else {
            this.emit('exit');
        }
    };

    /**
     * Toggles fullscreen mode
     *
     * @public
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    toggle(el) {
        const element = el || document.documentElement;

        if (this.isSupported()) {
            if (this.isFullscreen()) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            } else if (element.requestFullscreen) {
                element.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        } else {
            this.fullscreenchangeHandler(element);
        }
    }
}

export default new Fullscreen();
