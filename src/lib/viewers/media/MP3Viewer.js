import autobind from 'autobind-decorator';
import MediaBaseViewer from './MediaBaseViewer';
import { ICON_FILE_AUDIO } from '../../icons/icons';

import './MP3.scss';

const CSS_CLASS_MP3 = 'bp-media-mp3';

@autobind
class MP3Viewer extends MediaBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        this.fileLoadingIcon = ICON_FILE_AUDIO;

        // Call super() to set up common layout
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
     * @param {boolean} [options.content] - Whether or not to prefetch rep content
     * @return {void}
     */
    prefetch({ content = true }) {
        const representation = this.options.representation;
        if (content && this.isRepresentationReady(representation)) {
            const template = representation.content.url_template;
            document.createElement('audio').src = this.createContentUrlWithAuthParams(template);
        }
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

export default MP3Viewer;
