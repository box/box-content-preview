import React from 'react';
import MediaBaseViewer from './MediaBaseViewer';
import MP3Controls from './MP3Controls';
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

    destroy() {
        if (this.controls) {
            this.controls.destroy();
        }

        super.destroy();
    }

    /**
     * @inheritdoc
     */
    loadUI() {
        super.loadUI();
        this.mediaControls.show();
        this.mediaControls.resizeTimeScrubber();
    }

    /**
     * @inheritdoc
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        this.controls.render(
            <MP3Controls
                autoplay={this.isAutoplayEnabled()}
                bufferedRange={this.mediaEl.buffered}
                currentTime={this.mediaEl.currentTime}
                durationTime={this.mediaEl.duration}
                isPlaying={!this.mediaEl.paused}
                onAutoplayChange={this.setAutoplay}
                onMuteChange={this.toggleMute}
                onPlayPause={this.togglePlay}
                onRateChange={this.setRate}
                onTimeChange={this.handleTimeupdateFromMediaControls}
                onVolumeChange={this.setVolume}
                rate={this.getRate()}
                volume={this.mediaEl.volume}
            />,
        );
    }

    /**
     * Auto-play was prevented, pause the audio
     *
     * @override
     */
    handleAutoplayFail = () => {
        this.pause();
    };
}

export default MP3Viewer;
