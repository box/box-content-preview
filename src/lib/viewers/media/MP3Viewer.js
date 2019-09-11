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
     * Autoplay the audio
     *
     * @override
     * @emits volume
     * @return {Promise}
     */
    autoplay() {
        // Play may return a promise depending on browser support. This promise
        // will resolve when playback starts. If it fails, we pause the audio.
        // https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/
        const autoPlayPromise = this.play();

        if (autoPlayPromise && typeof autoPlayPromise.then === 'function') {
            return autoPlayPromise.catch(this.pause);
        }

        // Fallback to traditional autoplay tag if play does not return a promise
        this.mediaEl.autoplay = true;
        return Promise.resolve();
    }
}

export default MP3Viewer;
