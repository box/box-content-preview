import autobind from 'autobind-decorator';
import VideoBase from './video-base';
import './mp4.scss';

const CSS_CLASS_MP4 = 'bp-media-mp4';

@autobind
class MP4 extends VideoBase {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
        super.setup();

        // mp4 specific class
        this.wrapperEl.classList.add(CSS_CLASS_MP4);
    }

    /**
     * Prefetches assets for a video.
     *
     * @return {void}
     */
    prefetch() {
        const { url_template: template } = this.options.representation.data.content;
        document.createElement('video').src = this.createContentUrlWithAuthParams(template);
    }

    /**
     * Returns the name of the viewer
     *
     * @override
     * @returns {string} mp4
     */
    getName() {
        return 'MP4';
    }
}

export default MP4;
