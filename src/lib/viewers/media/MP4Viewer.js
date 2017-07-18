import autobind from 'autobind-decorator';
import VideoBaseViewer from './VideoBaseViewer';
import './MP4.scss';

const CSS_CLASS_MP4 = 'bp-media-mp4';

@autobind
class MP4Viewer extends VideoBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        // Call super() first to set up common layout
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

export default MP4Viewer;
