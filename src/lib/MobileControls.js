import Controls from './Controls';

const SHOW_PREVIEW_CONTROLS_CLASS = 'box-show-preview-controls';

class MobileControls extends Controls {
    /**
     * [destructor]
     * @return {void}
     */
    destroy() {
        this.containerEl.removeEventListener('touchstart', this.mousemoveHandler);
        this.containerEl.removeEventListener('touchmove', this.mousemoveHandler);
        this.controlsEl.removeEventListener('touchmove', this.mousemoveHandler);
        this.controlsEl.addEventListener('focusin', this.focusinHandler);
        this.controlsEl.addEventListener('focusout', this.focusoutHandler);
        this.controlsEl.removeEventListener('click', this.clickHandler);

        super.destroy();
    }

    /** Bind event listeners for mobile controls.
     * @return {void}
     */
    bindControlListeners() {
        this.containerEl.addEventListener('touchstart', this.mousemoveHandler);
        this.containerEl.addEventListener('touchmove', this.mousemoveHandler);
        this.controlsEl.addEventListener('focusin', this.focusinHandler);
        this.controlsEl.addEventListener('focusout', this.focusoutHandler);
        this.controlsEl.addEventListener('click', this.clickHandler);
    }

    /**
     * Handles all focusin events for the module.
     *
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    focusinHandler(event) {
        // When we focus onto a preview control button, show controls
        if (this.isPreviewControlButton(event.target)) {
            this.containerEl.classList.add(SHOW_PREVIEW_CONTROLS_CLASS);
            this.blockHiding = true;
        }
    }

    /**
     * Handles all focusout events for the module.
     *
     * @param {Event} event - A DOM-normalized event object.
     * @return {void}
     */
    focusoutHandler(event) {
        // When we focus out of a control button and aren't focusing onto another control button, hide the controls
        if (this.isPreviewControlButton(event.target) && !this.isPreviewControlButton(event.relatedTarget)) {
            this.containerEl.classList.remove(SHOW_PREVIEW_CONTROLS_CLASS);
            this.blockHiding = false;
        }
    }

    /** Prevent zooming on the control bar.
    * @param {Event} event - A DOM-normalized event object.
    * @return {void}
    */
    clickHandler(event) {
        event.preventDefault();
        event.stopPropagation();
    }
}

export default MobileControls;
