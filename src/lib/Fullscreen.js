import EventEmitter from 'events';
import fscreen from 'fscreen';
import { CLASS_FULLSCREEN, CLASS_FULLSCREEN_UNSUPPORTED } from './constants';

class Fullscreen extends EventEmitter {
    /** {HTMLElement} - The element used as the root for fullscreen mode */
    fullscreenElement;

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
     * @return {void}
     */
    bindDOMListeners() {
        // The fullscreenchange event is not universally supported, but fscreen will
        // detect and add the appropriate vendor-prefixed event
        fscreen.addEventListener('fullscreenchange', this.fullscreenchangeHandler);
    }

    /**
     * Unbinds DOM listeners for Fullscreen.
     *
     * @return {void}
     */
    unbindDOMListeners() {
        // The fullscreenchange event is not universally supported, but fscreen will
        // detect and add the appropriate vendor-prefixed event
        fscreen.removeEventListener('fullscreenchange', this.fullscreenchangeHandler);
    }

    /**
     * [destructor]
     *
     * @return {void}
     */
    destroy() {
        this.unbindDOMListeners();
        this.removeAllListeners();
    }

    /**
     * Returns true if the browser supports fullscreen natively
     *
     * @return {boolean} Fullscreen supported or not
     */
    isSupported() {
        return fscreen.fullscreenEnabled;
    }

    /**
     * Return true if full screen is active
     *
     * @param {HTMLElement} [el] - fullscreen element
     * @return {boolean} In fullscreen or not
     */
    isFullscreen(el) {
        if (this.isSupported()) {
            return !!fscreen.fullscreenElement;
        }

        return el && el.classList.contains(CLASS_FULLSCREEN);
    }

    /**
     * Handles fullscreen change events from fscreen
     *
     * @return {void}
     */
    fullscreenchangeHandler = () => {
        const { fullscreenElement } = fscreen;

        if (fullscreenElement) {
            this.fullscreenEnterHandler(fullscreenElement);
        } else {
            this.fullscreenExitHandler();
        }
    };

    /**
     * Handles fullscreen enter events
     *
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    fullscreenEnterHandler(el) {
        this.fullscreenElement = el;
        this.fullscreenElement.classList.add(CLASS_FULLSCREEN);
        this.fullscreenElement.focus();

        if (!this.isSupported()) {
            this.fullscreenElement.classList.add(CLASS_FULLSCREEN_UNSUPPORTED);
        }

        this.emit('enter');
    }

    /**
     * Handles fullscreen exit events
     *
     * @return {void}
     */
    fullscreenExitHandler() {
        this.fullscreenElement.classList.remove(CLASS_FULLSCREEN);
        this.fullscreenElement.classList.remove(CLASS_FULLSCREEN_UNSUPPORTED);
        this.fullscreenElement = null;

        this.emit('exit');
    }

    /**
     * Enter fullscreen mode
     *
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    enter(el = document.documentElement) {
        if (this.isSupported()) {
            fscreen.requestFullscreenFunction(el).call(el, Element.ALLOW_KEYBOARD_INPUT);
        } else {
            this.fullscreenEnterHandler(el);
        }
    }

    /**
     * Exit fullscreen mode
     *
     * @return {void}
     */
    exit() {
        if (this.isSupported()) {
            fscreen.exitFullscreen();
        } else {
            this.fullscreenExitHandler();
        }
    }

    /**
     * Toggle fullscreen mode
     *
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    toggle(el = document.documentElement) {
        if (this.isFullscreen(el)) {
            this.exit();
        } else {
            this.enter(el);
        }
    }
}

export default new Fullscreen();
