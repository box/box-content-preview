import EventEmitter from 'events';

import { CSS_CLASS_ANIMATION_CLIP_PULLUP, CSS_CLASS_HIDDEN, EVENT_SELECT_ANIMATION_CLIP } from './model3DConstants';

import { createPullup, UIRegistry } from '../Box3DUIUtils';
import { ICON_CHECK_MARK } from '../../../icons';
import { createFragment } from '../../../util';

const CLIP_TEMPLATE = `
    <div class="box3d-animation-clip" data-type="clip">
        <div class="box3d-animation-clip-icon"></div>
        <div class="box3d-animation-clip-value"></div>
    </div>`.trim();

class Model3DAnimationClipsPullup extends EventEmitter {
    /** @property {HTMLElement} - Pullup element that contains 3D scene configuration properties */
    pullupEl;

    /** @property {UIRegistry} - Used to track and cleanup UI elements */
    uiRegistry;

    /** @property {Object} - Dictionary of elements linked to animation clips */
    clipEls;

    /** @constructor */
    constructor() {
        super();
        this.pullupEl = createPullup();
        this.pullupEl.classList.add(CSS_CLASS_ANIMATION_CLIP_PULLUP);
        this.uiRegistry = new UIRegistry();
        this.uiRegistry.registerItem('settings-pullup-el', this.pullupEl);
        this.clipEls = {};
    }

    /**
     * Add an animation clip to the pullup.
     *
     * @public
     * @param {string} id - The ID of the animation clip.
     * @param {string} name - The name of the animation clip.
     * @param {number} duration - The duration of the clip, in seconds.
     * @return {void}
     */
    addClip(id, name, duration) {
        const clipFragment = createFragment(this.pullupEl, CLIP_TEMPLATE);
        const clipEl = clipFragment.firstChild;

        const durationStr = this.formatDurationStr(duration);
        const valueEl = clipEl.querySelector('.box3d-animation-clip-value');
        valueEl.setAttribute('data-value', id);
        valueEl.textContent = `${durationStr} ${name}`;
        valueEl.addEventListener('click', this.handleClipClick.bind(this));

        this.pullupEl.appendChild(clipEl);
        this.clipEls[id] = clipEl;
    }

    /**
     * Cleanup resources used by this pullup.
     *
     * @public
     * @return {void}
     */
    destroy() {
        this.pullupEl = null;
        this.uiRegistry.unregisterAll();
        this.uiRegistry = null;
    }

    /**
     * Format a duration, in seconds, as a time code of the form: HH:MM:SS.
     *
     * @private
     * @param {number} duration - The duration, in seconds.
     * @return {string} The time code string.
     */
    formatDurationStr(duration) {
        let secondsLeft = Math.floor(duration);
        const hours = Math.floor(secondsLeft / 3600);
        const hoursStr = this.padLeft(hours.toString(), 2);

        secondsLeft -= hours * 3600;
        const minutes = Math.floor(secondsLeft / 60);
        const minutesStr = this.padLeft(minutes.toString(), 2);

        secondsLeft -= minutes * 60;
        const secondsStr = this.padLeft(secondsLeft.toString(), 2);

        return `${hoursStr}:${minutesStr}:${secondsStr}`;
    }

    /**
     * Get the number of clips in this pullup.
     *
     * @public
     * @return {number} The number of clips in this pullup.
     */
    getClipCount() {
        return Object.keys(this.clipEls).length;
    }

    /**
     * Get the clip ID for the clip at the specified index.
     *
     * @public
     * @param {number} index - The clip index.
     * @return {string} The clip ID.
     */
    getClipId(index) {
        return Object.keys(this.clipEls)[index];
    }

    /**
     * Handle clicks on clips.
     *
     * @private
     * @param {Event} event - The click event.
     * @return {void}
     */
    handleClipClick(event) {
        if (event.target) {
            const clipId = event.target.getAttribute('data-value');
            this.selectClip(clipId);
        }
    }

    /**
     * Hide this pullup.
     *
     * @public
     * @return {void}
     */
    hide() {
        this.pullupEl.classList.add(CSS_CLASS_HIDDEN);
    }

    /**
     * Left-pad the specified integer with zeroes.
     *
     * @private
     * @param {number} x - The integer to pad with zeroes.
     * @param {number} width - The total number of characters in the padded string.
     * @return {string} A string containing the zero-padded integer.
     */
    padLeft(x, width) {
        return x.length >= width ? x : new Array(width - x.length + 1).join('0') + x;
    }

    /**
     * Reset this pullup to its default state.
     *
     * @public
     * @return {void}
     */
    reset() {
        if (this.getClipCount() > 0) {
            this.selectClip(this.getClipId(0));
        }
    }

    /**
     * Select the specified clip, firing EVENT_SELECT_ANIMATION_CLIP.
     *
     * @public
     * @param {string} selectedClipId - The ID of the clip to select.
     * @return {void}
     */
    selectClip(selectedClipId) {
        Object.keys(this.clipEls).forEach(clipId => {
            const clipEl = this.clipEls[clipId];
            const iconEl = clipEl.querySelector('.box3d-animation-clip-icon');
            iconEl.innerHTML = clipId === selectedClipId ? ICON_CHECK_MARK : '';
        });

        this.emit(EVENT_SELECT_ANIMATION_CLIP, selectedClipId);
    }

    /**
     * Show this pullup.
     *
     * @public
     * @return {void}
     */
    show() {
        this.pullupEl.classList.remove(CSS_CLASS_HIDDEN);
    }

    /**
     * Toggle the visibility of this pullup.
     *
     * @public
     * @return {void}
     */
    toggle() {
        this.pullupEl.classList.toggle(CSS_CLASS_HIDDEN);
    }
}

export default Model3DAnimationClipsPullup;
