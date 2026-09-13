import React from 'react';
import { AUDIO_PLAYER_V2, CLASS_DARK, STATUS_ERROR, WAVEFORM_REP_NAME } from '../../constants';
import { VIEWER_EVENT } from '../../events';
import { getRepresentation } from '../../file';
import MediaBaseViewer from './MediaBaseViewer';
import MP3Controls from './MP3Controls';
import MP3ControlsRoot from './MP3ControlsRoot';
import {
    CLIENT_DECODE_MAX_COMPRESSED_BYTES,
    CLIENT_DECODE_MAX_DURATION_SEC,
    DURATION_MISMATCH_TOLERANCE_SEC,
} from './waveform/constants';
import { createWaveformLoader } from './waveform/createWaveformLoader';
import { isPositiveFinite } from './waveform/validateWaveformPayload';
import './MP3.scss';

const CSS_CLASS_MP3 = 'bp-media-mp3';

function createLoadFailedError(message) {
    const error = new Error(message);
    error.name = 'LOAD_FAILED';
    return error;
}

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
        this.waveformPeaksSource = null;
        this.waveformDurationSec = 0;
        if (this.isAudioPlayerV2) {
            this.wrapperEl.classList.add('bp-media--v2');
            this.mediaContainerEl.classList.add('bp-media-container--v2');
            if (this.rootEl) {
                this.rootEl.classList.add(CLASS_DARK);
            }
            this.ensureV2Controls();
            this.importWaveformDecode();
            // Listen on the loading shell. The waveform is on
            // screen before the audio blob is playable; getViewer() is still null.
            this.bindCommentMarkersListener();
        }

        // Audio element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('audio'));
        this.mediaEl.setAttribute('preload', 'auto');
        this.commentMarkers = [];
    }

    bindCommentMarkersListener() {
        if (!this.isAudioPlayerV2) {
            return;
        }
        this.removeListener('comment_markers', this.handleCommentMarkersUpdated);
        this.addListener('comment_markers', this.handleCommentMarkersUpdated);
    }

    /**
     * Audio player v2 (waveform). Off unless the host enables `audioPlayerV2`
     * and React controls are on.
     *
     * @return {boolean} whether v2 treatment is on
     */
    getIsAudioPlayerV2() {
        return this.featureEnabled(AUDIO_PLAYER_V2) && this.useReactControls();
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
        this.abortWaveformLoads();
        if (this.wrapperEl) {
            this.wrapperEl.classList.remove('bp-media--v2');
        }
        if (this.mediaContainerEl) {
            this.mediaContainerEl.classList.remove('bp-media-container--v2');
        }
        if (this.rootEl) {
            this.rootEl.classList.remove(CLASS_DARK);
        }
    }

    /**
     * @return {Promise<{ default: Function }>} MP3ControlsV2 module
     */
    importV2Controls() {
        return import(/* webpackChunkName: "mp3-controls-v2" */ './MP3ControlsV2');
    }

    /**
     * @return {Promise<{ loadPeaks: Function }>} client-decode helpers
     */
    async importWaveformDecode() {
        if (!this.waveformDecodeImport) {
            this.waveformDecodeImport = import(/* webpackChunkName: "mp3-waveform-decode" */ './waveform/decode');
        }

        try {
            return await this.waveformDecodeImport;
        } catch (error) {
            this.waveformDecodeImport = null;
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    destroy() {
        this.removeListener('comment_markers', this.handleCommentMarkersUpdated);
        this.abortWaveformLoads();
        super.destroy();
    }

    /**
     * @inheritdoc
     */
    load() {
        if (this.isAudioPlayerV2) {
            this.showAudioLoadingShell();
            this.startConversionWaveformLoad();
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
        if (this.isAudioPlayerV2) {
            this.dropConversionPeaksOnDurationMismatch();
        }

        super.loadeddataHandler();

        if (!this.isAudioPlayerV2) {
            return;
        }

        this.applyPendingHostSelectedSeek();

        // Play first so Safari has a user gesture before AudioContext is created.
        if (this.userRequestedPlay) {
            this.play();
        }

        if (this.shouldRaceClientWaveformDecode()) {
            this.startClientWaveformDecode();
        }
    }

    /**
     * Client decode races conversion until some source applies peaks. Size and
     * duration caps still apply. First source to apply peaks wins; later
     * results are ignored.
     *
     * @return {boolean}
     */
    shouldRaceClientWaveformDecode() {
        if (!this.isAudioPlayerV2 || this.destroyed || this.waveformPeaksSource) {
            return false;
        }

        const compressedBytes = this.options.file?.size;
        const durationSec = this.mediaEl?.duration;
        return (
            isPositiveFinite(compressedBytes) &&
            compressedBytes <= CLIENT_DECODE_MAX_COMPRESSED_BYTES &&
            isPositiveFinite(durationSec) &&
            durationSec <= CLIENT_DECODE_MAX_DURATION_SEC
        );
    }

    /**
     * @param {number} durationSec
     * @return {boolean}
     */
    isConversionDurationMismatch(durationSec) {
        const mediaDuration = this.mediaEl?.duration;
        return (
            isPositiveFinite(mediaDuration) &&
            isPositiveFinite(durationSec) &&
            Math.abs(durationSec - mediaDuration) > DURATION_MISMATCH_TOLERANCE_SEC
        );
    }

    /**
     * Conversion JSON fetched before metadata skipped duration matching. Drop
     * those peaks once media duration is known if they disagree.
     *
     * @return {void}
     */
    dropConversionPeaksOnDurationMismatch() {
        if (this.waveformPeaksSource !== 'conversion' || !this.isConversionDurationMismatch(this.waveformDurationSec)) {
            return;
        }

        this.waveformPeaks = [];
        this.waveformPeaksSource = null;
        this.waveformDurationSec = 0;
        this.renderUI();
    }

    /**
     * Poll the conversion waveform representation and fetch its JSON.
     * Missing, failed, or unloadable conversion falls back to client decode
     * when the file is under size and duration caps.
     *
     * @return {Promise<void>}
     */
    async startConversionWaveformLoad() {
        if (!this.isAudioPlayerV2 || this.destroyed) {
            return;
        }

        const { file } = this.options;
        const waveform = file?.representations?.entries ? getRepresentation(file, WAVEFORM_REP_NAME) : null;
        const template = waveform?.content?.url_template;
        const conversionStatus = waveform?.status;
        const statusState = conversionStatus && typeof conversionStatus === 'object' ? conversionStatus.state : null;
        if (!waveform || !template || !statusState || statusState === STATUS_ERROR) {
            this.startClientWaveformDecode();
            return;
        }

        this.abortConversionWaveformLoad();
        this.waveformStatus = this.getRepStatus(waveform);
        this.waveformStatus.removeListener('conversionpending', this.resetLoadTimeout);
        const status = this.waveformStatus;

        try {
            await status.getPromise();
            if (this.destroyed || this.waveformStatus !== status || this.waveformPeaksSource) {
                return;
            }
            const result = await this.loadConversionWaveformPayload(template);
            this.handleConversionWaveformResult(result, status);
        } catch {
            this.startClientWaveformDecode();
        }
    }

    /**
     * Fetch and validate conversion waveform JSON after the rep is ready.
     * `{+asset_path}` is empty. Auth is a header, not a query token.
     *
     * @param {string} template - content URL template
     * @return {Promise<import('./waveform/types').WaveformLoadState>}
     */
    loadConversionWaveformPayload(template) {
        const url = this.createContentUrlV2(template);
        const durationSec = this.mediaEl?.duration;
        const source = createWaveformLoader(
            signal =>
                this.api.get(url, {
                    headers: this.appendAuthHeader(),
                    signal,
                }),
            Number.isFinite(durationSec) ? { expectedDurationSec: durationSec } : {},
        );
        this.waveformSource = source;
        return source.load();
    }

    abortWaveformLoads() {
        this.abortConversionWaveformLoad();
        this.abortClientWaveformDecode();
    }

    abortConversionWaveformLoad() {
        if (this.waveformSource) {
            this.waveformSource.abort();
            this.waveformSource = null;
        }
        if (this.waveformStatus) {
            this.waveformStatus.destroy();
            this.waveformStatus = null;
        }
    }

    /**
     * First source to apply peaks wins. Later results are ignored.
     *
     * @param {'conversion'|'client'} source
     * @param {{ peaks: ArrayLike<number>, durationSec?: number }} payload
     * @return {boolean} true when this source claimed peaks
     */
    applyWaveformPeaks(source, payload) {
        if (this.waveformPeaksSource) {
            return false;
        }

        this.waveformPeaks = payload.peaks;
        this.waveformPeaksSource = source;
        this.isWaveformDecodeRetryPending = false;
        if (source === 'conversion') {
            this.waveformDurationSec = payload.durationSec;
            this.abortClientWaveformDecode();
        } else if (this.waveformSource) {
            // RepStatus.destroy() does not reject getPromise().
            this.waveformSource.abort();
            this.waveformSource = null;
        }
        this.renderUI();
        return true;
    }

    /**
     * Apply conversion peaks when the load is still current. Ignored if client
     * decode already applied peaks.
     *
     * @param {import('./waveform/types').WaveformLoadState} result
     * @param {Object} status - RepStatus instance that started this load
     * @return {void}
     */
    handleConversionWaveformResult(result, status) {
        if (!result || this.destroyed || !this.isAudioPlayerV2 || this.waveformStatus !== status) {
            return;
        }

        if (result.status !== 'ready') {
            if (result.status !== 'cancelled') {
                this.startClientWaveformDecode();
            }
            return;
        }

        if (this.isConversionDurationMismatch(result.payload.durationSec)) {
            this.startClientWaveformDecode();
            return;
        }

        this.applyWaveformPeaks('conversion', result.payload);
    }

    /**
     * @inheritdoc
     */
    handlePlayRequest = () => {
        this.userRequestedPlay = true;
        this.togglePlay();

        if (
            this.shouldRaceClientWaveformDecode() &&
            this.isWaveformDecodeRetryPending &&
            !this.hasUsedWaveformDecodePlayRetry
        ) {
            this.hasUsedWaveformDecodePlayRetry = true;
            this.isWaveformDecodeRetryPending = false;
            this.startClientWaveformDecode();
        }
    };

    /**
     * Honor the requested play/pause state. The play button passes the next state;
     * comment markers pass false so a click always pauses instead of toggling.
     *
     * @param {boolean} shouldPlay
     * @return {void}
     */
    handlePlayPause = shouldPlay => {
        if (shouldPlay) {
            this.handlePlayRequest();
            return;
        }
        this.pause(undefined, true);
    };

    /**
     * Fetch compressed audio bytes for client decode. Prefers an already-fetched blob URL.
     *
     * @param {AbortSignal} signal
     * @return {Promise<ArrayBuffer>}
     */
    async fetchAudioArrayBuffer(signal) {
        if (this.mediaBlobUrl) {
            const response = await fetch(this.mediaBlobUrl, { signal });
            if (!response.ok) {
                throw createLoadFailedError(`Waveform fetch failed (${response.status})`);
            }
            return response.arrayBuffer();
        }

        const template =
            this.options.representation &&
            this.options.representation.content &&
            this.options.representation.content.url_template;
        if (!template) {
            throw createLoadFailedError('Waveform fetch URL is missing');
        }

        const data = await this.api.get(this.createContentUrlV2(template), {
            headers: this.appendAuthHeader(),
            signal,
            type: 'arraybuffer',
        });

        if (data instanceof ArrayBuffer) {
            return data;
        }
        throw createLoadFailedError('Waveform fetch did not return binary data');
    }

    abortClientWaveformDecode() {
        if (!this.waveformDecodeController) {
            return;
        }
        this.waveformDecodeController.abort();
        this.waveformDecodeController = null;
    }

    /**
     * Decode peaks in the background until conversion or client decode applies
     * them, when the file is under size and duration caps. Does not block
     * playback. First source to apply peaks wins.
     *
     * @return {Promise<void>}
     */
    async startClientWaveformDecode() {
        if (!this.shouldRaceClientWaveformDecode()) {
            return;
        }

        if (this.waveformDecodeController && !this.waveformDecodeController.signal.aborted) {
            return;
        }

        const controller = new AbortController();
        this.waveformDecodeController = controller;
        const { signal } = controller;

        try {
            const decodeModule = await this.importWaveformDecode();
            if (this.destroyed || signal.aborted || this.waveformDecodeController !== controller) {
                return;
            }

            const result = await decodeModule.loadPeaks({
                compressedBytes: this.options.file && this.options.file.size,
                durationSec: this.mediaEl && this.mediaEl.duration,
                fetchArrayBuffer: fetchSignal => this.fetchAudioArrayBuffer(fetchSignal),
                signal,
            });
            this.handleClientWaveformDecodeResult(result, controller, signal);
        } catch (error) {
            if (error && error.name === 'AbortError') {
                this.handleClientWaveformDecodeResult({ status: 'cancelled' }, controller, signal);
                return;
            }

            this.handleClientWaveformDecodeResult(
                {
                    error: {
                        code: 'LOAD_FAILED',
                        message: error instanceof Error ? error.message : 'Waveform decode failed',
                    },
                    retryable: true,
                    status: 'failed',
                },
                controller,
                signal,
            );
        }
    }

    /**
     * Apply peaks, or record a retryable failure for overlay play.
     *
     * @param {import('./waveform/types').ClientDecodeResult} result
     * @param {AbortController} controller in-flight controller for this attempt
     * @param {AbortSignal} signal
     * @return {void}
     */
    handleClientWaveformDecodeResult(result, controller, signal) {
        if (!result || this.destroyed || signal.aborted || this.waveformDecodeController !== controller) {
            return;
        }

        if (result.status === 'ready') {
            this.applyWaveformPeaks('client', result.payload);
            return;
        }

        if (result.status === 'cancelled') {
            return;
        }

        if (result.status === 'failed' && result.retryable && !this.hasUsedWaveformDecodePlayRetry) {
            this.isWaveformDecodeRetryPending = true;
        }
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
    loadUIReact() {
        super.loadUIReact();

        if (!this.controls) {
            this.controls = new MP3ControlsRoot({ containerEl: this.mediaContainerEl });
        }

        this.bindCommentMarkersListener();
        this.renderUI();
    }

    handleCommentMarkersUpdated = (markers = []) => {
        this.commentMarkers = markers;
        const selected = markers.find(marker => marker.isSelected);
        const selectedId = selected ? selected.id : null;

        if (selectedId !== this.hostSelectedMarkerId) {
            this.hostSelectedMarkerId = selectedId;
            if (selected && Number.isFinite(selected.time)) {
                this.pendingHostSelectedSeek = selected;
                this.applyPendingHostSelectedSeek();
            } else {
                this.pendingHostSelectedSeek = null;
            }
        }

        this.renderUI();
    };

    /**
     * Seek+pause to a host-selected comment (feed / deeplink). Audio-only; video does not
     * seek on comment_markers. No-ops until duration is known. Skips currentTime if the
     * element is already there so a feed seek does not fire a second `seeked`.
     *
     * @return {void}
     */
    applyPendingHostSelectedSeek() {
        const marker = this.pendingHostSelectedSeek;
        if (!marker || !this.mediaEl || !(this.mediaEl.duration > 0) || !Number.isFinite(marker.time)) {
            return;
        }

        this.pendingHostSelectedSeek = null;
        this.mediaEl.pause();
        if (this.mediaEl.currentTime !== marker.time) {
            this.mediaEl.currentTime = marker.time;
        }
    }

    handleCommentMarkerClick = marker => {
        this.hostSelectedMarkerId = marker.id;
        this.pendingHostSelectedSeek = marker;
        if (this.mediaEl) {
            this.mediaEl.pause();
        }
        this.applyPendingHostSelectedSeek();
        // Overlay paints the ring from click optimism until the host re-emits selected.
        this.emit('comment_marker_select', { id: marker.id, time: marker.time });
        this.renderUI();
    };

    /**
     * @inheritdoc
     */
    renderUI() {
        if (!this.controls) {
            return;
        }

        const mediaDuration = this.mediaEl.duration;
        const durationTime =
            typeof mediaDuration === 'number' && mediaDuration > 0 ? mediaDuration : this.waveformDurationSec;

        const sharedProps = {
            autoplay: this.isAutoplayEnabled(),
            bufferedRange: this.mediaEl.buffered,
            currentTime: this.mediaEl.currentTime,
            durationTime,
            isPlaying: !this.mediaEl.paused,
            movePlayback: this.movePlayback,
            onAutoplayChange: this.setAutoplay,
            onMuteChange: this.toggleMute,
            onPlayPause: this.isAudioPlayerV2 ? this.handlePlayPause : this.togglePlay,
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
            this.controls.render(
                <Mp3ControlsV2
                    {...sharedProps}
                    commentMarkers={this.commentMarkers || []}
                    mediaEl={this.mediaEl}
                    onCommentMarkerClick={this.handleCommentMarkerClick}
                    peaks={this.waveformPeaks}
                />,
            );
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
