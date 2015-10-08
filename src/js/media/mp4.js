'use strict';

import '../../css/media/mp4.css';
import 'core-js/modules/es6.reflect';
import autobind from 'autobind-decorator';
import VideoBase from './video-base';

const CSS_CLASS_MP4 = 'box-preview-media-mp4';

let Box = global.Box || {};

@autobind
class MP4 extends VideoBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container DOM node
     * @param {object} [options] some options
     * @returns {MP4}
     */
    constructor(container, options) {
        super(container, options);
        
        // mp4 specific class
        this.wrapperEl.classList.add(CSS_CLASS_MP4);
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.MP4 = MP4;
global.Box = Box;
export default MP4;