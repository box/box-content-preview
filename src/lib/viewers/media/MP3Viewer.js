import MediaBaseViewer from './MediaBaseViewer';
import './MP3.scss';

const CSS_CLASS_MP3 = 'bp-media-mp3';

class MP3Viewer extends MediaBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() to set up common layout
        super.setup();

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
     * @return {void}
     */
    loadUI() {
        super.loadUI();
        this.mediaControls.show();
        this.mediaControls.resizeTimeScrubber();
    }

    /**
     * Determines if media should autoplay based on cached settings value.
     *
     * @override
     * @emits volume
     * @return {Promise}
     */
    autoplay() {
        const autoPlayPromise = this.mediaEl.play();

        if (autoPlayPromise && typeof autoPlayPromise.then === 'function') {
            return autoPlayPromise
                .then(() => {
                    this.handleRate();
                    this.handleVolume();
                })
                .catch(() => {
                    // Auto-play was prevented, pause
                    this.mediaEl.pause();
                });
        }

        // Fallback to traditional autoplay tag if play does not return a promise
        this.mediaEl.autoplay = true;
        return Promise.resolve();
    }
}

export default MP3Viewer;
