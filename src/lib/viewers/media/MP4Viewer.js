import React from 'react';
import MP4Controls from './MP4Controls';
import VideoBaseViewer from './VideoBaseViewer';
import './MP4.scss';

const CSS_CLASS_MP4 = 'bp-media-mp4';

class MP4Viewer extends VideoBaseViewer {
    /**
     * @inheritdoc
     */
    setup() {
        if (this.isSetup) {
            return;
        }

        // Call super() first to set up common layout
        super.setup();

        // mp4 specific class
        this.wrapperEl.classList.add(CSS_CLASS_MP4);
    }

    /**
     * @inheritdoc
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        this.controls.render(
            <MP4Controls
                autoplay={this.isAutoplayEnabled()}
                bufferedRange={this.mediaEl.buffered}
                currentTime={this.mediaEl.currentTime}
                durationTime={this.mediaEl.duration}
                isPlaying={!this.mediaEl.paused}
                onAutoplayChange={this.setAutoplay}
                onFullscreenToggle={this.toggleFullscreen}
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
}

export default MP4Viewer;
