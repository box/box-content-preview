'use strict';

import autobind from 'autobind-decorator';
import MediaBase from './media-base';
import throttle from 'lodash/function/throttle';

const MOUSE_MOVE_TIMEOUT_IN_MILLIS = 1000;

let document = global.document;

@autobind
class VideoBase extends MediaBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container DOM node
     * @param {object} [options] some options
     * @returns {Image}
     */
    constructor(container, options) {
        super(container, options);
        
        // Video element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('video'));
    }

    /**
     * Adds event listeners to the media controls.
     * Makes changes to the media element.
     * 
     * @private
     * @returns {void}
     */
    addEventsListenersForMediaControls() {
        super.addEventsListenersForMediaControls();
        
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
    addEventsListenersForMediaElement() {
        super.addEventsListenersForMediaElement();

        this.mousemoveHandler = throttle(() => {
            this.mediaControls.show();
        }, MOUSE_MOVE_TIMEOUT_IN_MILLIS);

        this.mediaEl.addEventListener('mousemove', this.mousemoveHandler);            
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