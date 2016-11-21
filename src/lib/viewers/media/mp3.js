import autobind from 'autobind-decorator';
import MediaBase from './media-base';
import './mp3.scss';

const CSS_CLASS_MP3 = 'box-preview-media-mp3';

const Box = global.Box || {};

@autobind
class MP3 extends MediaBase {

    /**
     * [constructor]
     * @param {string|HTMLElement} container The container DOM node
     * @param {Object} [options] some options
     * @returns {MP3} MP3 instance
     */
    constructor(container, options) {
        super(container, options);

        // mp3 specific class
        this.wrapperEl.classList.add(CSS_CLASS_MP3);

        // Audio element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('audio'));
        this.mediaEl.setAttribute('preload', 'auto');
    }

    /**
     * Loads the controls
     *
     * @private
     * @returns {void}
     */
    loadUI() {
        super.loadUI();
        this.mediaControls.show();
        this.mediaControls.resizeTimeScrubber();
    }
}

Box.Preview = Box.Preview || {};
Box.Preview.MP3 = MP3;
global.Box = Box;
export default MP3;
