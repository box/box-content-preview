import EventEmitter from 'events';
import fscreen from 'fscreen';
import { CLASS_FULLSCREEN, CLASS_FULLSCREEN_UNSUPPORTED } from './constants';

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
     * Unbinds DOM listeners for Fullscreen.
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
        return fscreen.fullscreenEnabled;
    }

    /**
     * Return true if full screen is active
     *
     * @public
     * @param {HTMLElement} [element] - fullscreen element
     * @return {boolean} In fullscreen or not
     */
    isFullscreen(element) {
        if (this.isSupported()) {
            return !!fscreen.fullscreenElement;
        }

        return element instanceof HTMLElement && element.classList.contains(CLASS_FULLSCREEN);
    }

    /**
     * Fires events when the fullscreen state changes
     *
     * @private
     * @return {void}
     */
    fullscreenchangeHandler = () => {
        if (this.isFullscreen()) {
            this.focusFullscreenElement();
            this.emit('enter');
        } else {
            this.emit('exit');
        }
    };

    /**
     * Focuses the element
     *
     * @private
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    focusFullscreenElement = () => {
        // Focus on the fullscreen element so keyboard
        // events are triggered without an extra click
        fscreen.fullscreenElement.focus();
    };

    /**
     * Enter fullscreen mode
     *
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    enter(el = document.documentElement) {
        if (el instanceof HTMLElement) {
            el.classList.add(CLASS_FULLSCREEN);

            if (!this.isSupported()) {
                el.classList.add(CLASS_FULLSCREEN_UNSUPPORTED);
            }
        }

        if (this.isSupported()) {
            fscreen.requestFullscreenFunction(el).call(el, Element.ALLOW_KEYBOARD_INPUT);
        } else {
            this.emit('enter');
        }
    }

    /**
     * Exit fullscreen mode
     *
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    exit(el = document.documentElement) {
        if (el instanceof HTMLElement) {
            el.classList.remove(CLASS_FULLSCREEN);
            el.classList.remove(CLASS_FULLSCREEN_UNSUPPORTED);
        }

        if (this.isSupported()) {
            fscreen.exitFullscreen();
        } else {
            this.emit('exit');
        }
    }

    /**
     * Toggle fullscreen mode
     *
     * @public
     * @param {HTMLElement} el - fullscreen element
     * @return {void}
     */
    toggle(el = document.documentElement) {
        if (this.isFullscreen(el)) {
            this.exit(el);
        } else {
            this.enter(el);
        }
    }
}

export default new Fullscreen();
