import VideoBaseViewer from './VideoBaseViewer';
import './MP4.scss';

const CSS_CLASS_MP4 = 'bp-media-mp4';

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
}

export default MP4Viewer;
