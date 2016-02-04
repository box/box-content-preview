'use strict';

import autobind from 'autobind-decorator';
import MediaBase from './media-base';
import throttle from 'lodash/function/throttle';

const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;

@autobind
class VideoBase extends MediaBase {

    /**
     * [constructor]
     * @param {String|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @returns {VideoBase} VideoBase instance
     */
    constructor(container, options) {
        super(container, options);

        // Video element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('video'));
        this.mediaEl.setAttribute('autoplay', true);
        this.mediaEl.setAttribute('preload', 'auto');
    }

    /**
     * [destructor]
     * @returns {void}
     */
    destroy() {
        if (this.mediaEl) {
            this.mediaEl.removeEventListener('mousemove', this.mousemoveHandler);
            this.mediaEl.removeEventListener('click', this.togglePlay);
        }
        super.destroy();
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     *
     * @private
     * @returns {void}
     */
    addEventListenersForMediaControls() {
        super.addEventListenersForMediaControls();

        this.mediaControls.on('togglefullscreen', () => {
            this.toggleFullscreen();
        });
    }

    /**
     * Adds event listeners to the media element.
     * Makes changes to the meida controls.
     *
     * @private
     * @returns {void}
     */
    addEventListenersForMediaElement() {
        super.addEventListenersForMediaElement();

        this.mousemoveHandler = throttle(() => {
            this.mediaControls.show();
        }, MOUSE_MOVE_TIMEOUT_IN_MILLIS);

        this.mediaEl.addEventListener('mousemove', this.mousemoveHandler);
        this.mediaEl.addEventListener('click', this.togglePlay);
    }

    /**
     * Overriden method to handle resizing of the window.
     * Adjusts the size of the time scrubber since its
     * senstive to the containers width.
     *
     * @private
     * @returns {void}
     */
    resize() {
        this.mediaControls.resizeTimeScrubber();
    }
}

export default VideoBase;
