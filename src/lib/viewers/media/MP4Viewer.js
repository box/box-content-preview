import React from 'react';
import { CLASS_INVISIBLE, PRELOAD_REP_NAME } from '../../constants';
import { VIEWER_EVENT } from '../../events';
import VideoBaseViewer from './VideoBaseViewer';
import VideoControls from './VideoControls';
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
        this.wrapperEl.classList.add('bp-media-dash');
    }

    constructor(options) {
        super(options);

        this.api = options.api;
        this.updateExperiences = this.updateExperiences.bind(this);
    }

    updateExperiences(experiences) {
        this.experiences = experiences;

        this.renderUI();
    }

    load() {
        const rep = this.options.representation;
        if (rep && rep.representation === PRELOAD_REP_NAME) {
            this.showPreload();
            return;
        }
        super.load();
        this.handleAssetAndRepLoad();
    }

    /**
     * @inheritdoc
     */
    loadUIReact() {
        super.loadUIReact();
        this.annotationControlsFSM.subscribe(() => this.renderUI());
    }

    loadeddataHandler() {
        if (this.isDestroyed()) {
            return;
        }

        if (!this.preloader?.wrapperEl) {
            this.mediaEl.classList.remove(CLASS_INVISIBLE);
        }
        if (this.useReactControls()) {
            this.loadUIReact();
        } else {
            this.loadUI();
        }

        if (this.isAutoplayEnabled()) {
            this.autoplay();
        }

        this.calculateVideoDimensions();
        this.resize();
        this.handleVolume();
        this.showPlayButton();
        this.setMediaTime(this.startTimeInSeconds);

        if (this.userRequestedPlay) {
            this.play();
        }

        this.loaded = true;
        this.emit(VIEWER_EVENT.load);

        // Make media element visible after resize
        this.showMedia();

        // Show controls briefly after content loads
        if (this.useReactControls() && this.controls) {
            this.showAndHideReactControls();
        } else {
            this.mediaControls.show();
        }

        if (this.options.autoFocus) {
            this.mediaContainerEl.focus();
        }
    }

    /**
     * @inheritdoc
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        const { showAnnotationsDrawingCreate: canDraw } = this.options;
        const canAnnotate =
            this.areNewAnnotationsEnabled() && this.hasAnnotationCreatePermission() && this.videoAnnotationsEnabled;

        const annotationsEnabled = !!this.annotator && this.videoAnnotationsEnabled;
        this.controls.render(
            <VideoControls
                annotationColor={this.annotationModule.getColor()}
                annotationMode={this.annotationControlsFSM.getMode()}
                autoplay={this.isAutoplayEnabled()}
                bufferedRange={this.mediaEl.buffered}
                currentTime={this.mediaEl.currentTime}
                durationTime={this.mediaEl.duration}
                experiences={this.experiences}
                hasDrawing={canDraw}
                hasHighlight={false}
                hasRegion={canAnnotate}
                isNarrowVideo={this.isNarrowVideo}
                isPlaying={!this.mediaEl.paused}
                movePlayback={this.movePlayback}
                onAnnotationColorChange={this.handleAnnotationColorChange}
                onAnnotationModeClick={this.handleAnnotationControlsClick}
                onAnnotationModeEscape={this.handleAnnotationControlsEscape}
                onAutoplayChange={this.setAutoplay}
                onFullscreenToggle={this.toggleFullscreen}
                onMuteChange={this.toggleMute}
                onPlayPause={this.handlePlayRequest}
                onRateChange={this.setRate}
                onTimeChange={this.handleTimeupdateFromMediaControls}
                onVolumeChange={this.setVolume}
                rate={this.getRate()}
                videoAnnotationsEnabled={annotationsEnabled}
                volume={this.mediaEl.volume}
            />,
        );
    }

    calculateVideoDimensions() {
        const hasVideoDimensions =
            this.mediaEl.readyState >= 1 && this.mediaEl.videoWidth > 0 && this.mediaEl.videoHeight > 0;

        if (hasVideoDimensions) {
            this.videoWidth = this.mediaEl.videoWidth;
            this.videoHeight = this.mediaEl.videoHeight;
        } else {
            this.videoWidth = this.mediaContainerEl.clientWidth;
            this.videoHeight = this.mediaContainerEl.clientHeight;
        }

        this.aspect = this.videoWidth / this.videoHeight;
    }
}

export default MP4Viewer;
