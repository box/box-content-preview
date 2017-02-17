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
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ content = true }) {
        const representation = this.options.representation;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            document.createElement('video').src = this.createContentUrlWithAuthParams(template);
        }
    }
}

export default MP4;
