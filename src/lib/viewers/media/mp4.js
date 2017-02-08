import autobind from 'autobind-decorator';
import VideoBase from './video-base';
import './mp4.scss';

const CSS_CLASS_MP4 = 'bp-media-mp4';

const Box = global.Box || {};

@autobind
class MP4 extends VideoBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container - The container DOM node
     * @param {Object} [options] - some options
     * @return {MP4} MP4 instance
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
