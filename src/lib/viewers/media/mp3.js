import autobind from 'autobind-decorator';
import MediaBase from './media-base';
import './mp3.scss';

const CSS_CLASS_MP3 = 'bp-media-mp3';

@autobind
class MP3 extends MediaBase {
    /**
     * @inheritdoc
     */
    setup() {
        // Always call super 1st to have the common layout
        super.setup();

        // mp3 specific class
        this.wrapperEl.classList.add(CSS_CLASS_MP3);

        // Audio element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('audio'));
        this.mediaEl.setAttribute('preload', 'auto');
    }

    /**
     * Prefetches assets for a mp3.
     *
     * @return {void}
     */
    prefetch() {
        const { url_template: template } = this.options.representation.data.content;
        document.createElement('audio').src = this.createContentUrlWithAuthParams(template);
    }

    /**
     * Loads the controls
     *
     * @private
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.mediaControls.show();
        this.mediaControls.resizeTimeScrubber();
    }
}

export default MP3;
