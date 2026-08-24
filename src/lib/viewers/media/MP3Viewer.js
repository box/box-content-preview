import React from 'react';
import { VIEWER_EVENT } from '../../events';
import MediaBaseViewer from './MediaBaseViewer';
import MP3Controls from './MP3Controls';
import MP3ControlsRoot from './MP3ControlsRoot';
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

        this.isAudioPlayerV2 = this.getIsAudioPlayerV2();
        this.waveformPeaks = [];
        if (this.isAudioPlayerV2) {
            this.wrapperEl.classList.add('bp-media--v2');
            this.mediaContainerEl.classList.add('bp-media-container--v2');
            this.ensureV2Controls();
        }

        // Audio element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('audio'));
        this.mediaEl.setAttribute('preload', 'auto');
    }

    /**
     * Audio player v2 (waveform). Off unless the host enables `audioPlayerV2`
     * and React controls are on.
     *
     * @return {boolean} whether v2 treatment is on
     */
    getIsAudioPlayerV2() {
        return this.featureEnabled('audioPlayerV2.enabled') && this.useReactControls();
    }

    /**
     * Load v2 controls (and wavesurfer) only when the audio player v2 gate is on.
     *
     * @return {Promise<Function|null>} MP3ControlsV2 component, or null after a failed load
     */
    ensureV2Controls() {
        if (this.MP3ControlsV2) {
            return Promise.resolve(this.MP3ControlsV2);
        }

        if (!this.mp3ControlsV2Promise) {
            this.mp3ControlsV2Promise = this.importV2Controls()
                .then(mod => {
                    this.MP3ControlsV2 = mod.default;
                    return this.MP3ControlsV2;
                })
                .catch(() => {
                    this.mp3ControlsV2Promise = null;
                    this.fallbackToV1Controls();
                    return null;
                });
        }

        return this.mp3ControlsV2Promise;
    }

    /**
     * Drop v2 layout and keep the classic player if the v2 chunk cannot load.
     *
     * @return {void}
     */
    fallbackToV1Controls() {
        this.isAudioPlayerV2 = false;
        if (this.wrapperEl) {
            this.wrapperEl.classList.remove('bp-media--v2');
        }
        if (this.mediaContainerEl) {
            this.mediaContainerEl.classList.remove('bp-media-container--v2');
        }
    }

    /**
     * @return {Promise<{ default: Function }>} MP3ControlsV2 module
     */
    importV2Controls() {
        return import(/* webpackChunkName: "mp3-controls-v2" */ './MP3ControlsV2');
    }

    /**
     * @inheritdoc
     */
    load() {
        if (this.isAudioPlayerV2) {
            this.showAudioLoadingShell();
        }

        return super.load();
    }

    /**
     * Paint the v2 gradient stage and placeholder waveform before audio metadata arrives.
     * Emits preload so Preview hides the file-type spinner in favor of this shell.
     *
     * @return {void}
     */
    showAudioLoadingShell() {
        this.showMedia();

        if (!this.controls) {
            this.controls = new MP3ControlsRoot({ containerEl: this.mediaContainerEl });
        }

        this.ensureV2Controls().then(Mp3ControlsV2 => {
            if (this.destroyed) {
                return;
            }

            this.renderUI();
            if (!Mp3ControlsV2) {
                return;
            }

            this.emitFirstRenderMetric();
            this.emit(VIEWER_EVENT.default, { event: VIEWER_EVENT.preload, data: {} });
        });
    }

    /**
     * @inheritdoc
     */
    loadeddataHandler() {
        super.loadeddataHandler();

        if (this.isAudioPlayerV2 && this.userRequestedPlay) {
            this.play();
        }
    }

    /**
     * @inheritdoc
     */
    handlePlayRequest = () => {
        this.userRequestedPlay = true;
        this.togglePlay();
    };

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
    loadUIReact() {
        super.loadUIReact();

        if (!this.controls) {
            this.controls = new MP3ControlsRoot({ containerEl: this.mediaContainerEl });
        }

        this.renderUI();
    }

    /**
     * @inheritdoc
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        const sharedProps = {
            autoplay: this.isAutoplayEnabled(),
            bufferedRange: this.mediaEl.buffered,
            currentTime: this.mediaEl.currentTime,
            durationTime: this.mediaEl.duration,
            isPlaying: !this.mediaEl.paused,
            movePlayback: this.movePlayback,
            onAutoplayChange: this.setAutoplay,
            onMuteChange: this.toggleMute,
            onPlayPause: this.isAudioPlayerV2 ? this.handlePlayRequest : this.togglePlay,
            onRateChange: this.setRate,
            onTimeChange: this.handleTimeupdateFromMediaControls,
            onVolumeChange: this.setVolume,
            rate: this.getRate(),
            volume: this.mediaEl.volume,
        };

        if (this.isAudioPlayerV2) {
            if (!this.MP3ControlsV2) {
                this.ensureV2Controls().then(() => {
                    if (!this.destroyed) {
                        this.renderUI();
                    }
                });
                return;
            }

            const Mp3ControlsV2 = this.MP3ControlsV2;
            this.controls.render(<Mp3ControlsV2 {...sharedProps} mediaEl={this.mediaEl} peaks={this.waveformPeaks} />);
            return;
        }

        this.controls.render(<MP3Controls {...sharedProps} />);
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
