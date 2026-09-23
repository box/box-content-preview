import React from 'react';
import {
    EVENT_COMMENT_RANGE_DRAG_CREATE,
    EVENT_COMMENT_RANGE_DRAFT,
    EVENT_COMMENT_RANGE_DRAFT_CHANGE,
    EVENT_COMMENT_RANGE_DRAFT_CLEAR,
    EVENT_COMMENT_RANGE_DRAFT_DISMISS,
    isValidCommentRangeDraft,
} from '../controls/media/types';
import { AUDIO_PLAYER_V2, STATUS_ERROR, STATUS_SUCCESS, STATUS_VIEWABLE, WAVEFORM_REP_NAME } from '../../constants';
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
import { isRangeCollapsed } from './waveform/range';
import { isPositiveFinite } from './waveform/validateWaveformPayload';
import './MP3.scss';

const CSS_CLASS_MP3 = 'bp-media-mp3';
const AUDIO_V2_SHUTTLE_RATES = [2, 4, 8, 16];
const AUDIO_V2_SHUTTLE_TICK_MS = 50;
const AUDIO_V2_SKIP_SEC = 1;
const AUDIO_V2_SHIFT_SKIP_SEC = 5;

/**
 * Next J/L shuttle rate. Opposite direction starts at 2×.
 *
 * @param {number} currentRate
 * @param {boolean} sameDirection
 * @return {number} 2, 4, 8, or 16
 */
function nextShuttleRate(currentRate, sameDirection) {
    if (!sameDirection) {
        return AUDIO_V2_SHUTTLE_RATES[0];
    }
    const index = AUDIO_V2_SHUTTLE_RATES.indexOf(currentRate);
    if (index < 0) {
        return AUDIO_V2_SHUTTLE_RATES[0];
    }
    return AUDIO_V2_SHUTTLE_RATES[Math.min(index + 1, AUDIO_V2_SHUTTLE_RATES.length - 1)];
}

/**
 * Next/previous comment marker for ↑/↓. Walks by id so same-time stacks each get a stop.
 *
 * @param {Array<Object>} markers
 * @param {Object} options
 * @param {number} options.direction -1 previous, 1 next
 * @param {string|null} options.selectedId
 * @param {number} options.time current playhead
 * @return {Object|null} marker to select
 */
function nextCommentMarker(markers, { direction, selectedId, time }) {
    const sorted = (markers || [])
        .filter(marker => Number.isFinite(marker.time))
        .sort((left, right) => left.time - right.time || String(left.id).localeCompare(String(right.id)));
    if (!sorted.length) {
        return null;
    }

    const selectedIndex = sorted.findIndex(marker => marker.id === selectedId);
    if (selectedIndex >= 0) {
        return sorted[Math.max(0, Math.min(sorted.length - 1, selectedIndex + direction))];
    }

    if (direction > 0) {
        return sorted.find(marker => marker.time >= time) || sorted[sorted.length - 1];
    }

    return [...sorted].reverse().find(marker => marker.time <= time) || sorted[0];
}

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
        this.isWaveformConversionPolling = false;
        this.waveformDurationSec = 0;
        if (this.isAudioPlayerV2) {
            this.wrapperEl.classList.add('bp-media--v2');
            this.mediaContainerEl.classList.add('bp-media-container--v2');
            this.ensureV2Controls();
            this.importWaveformDecode();
            // Listen on the loading shell. The waveform is on
            // screen before the audio blob is playable; getViewer() is still null.
            this.bindCommentMarkersListener();
            this.bindCommentRangeDraftListeners();
        }

        // Audio element
        this.mediaEl = this.mediaContainerEl.appendChild(document.createElement('audio'));
        this.mediaEl.setAttribute('preload', 'auto');
        this.commentMarkers = [];
        this.commentRangeDraft = null;
        this.hostSelectedMarkerId = null;
        this.isCommentRangeDragging = false;
        this.isCommentRangeTimestampActive = false;
        this.shuttleDirection = null;
        this.shuttleRate = 0;
        this.reverseShuttleTimer = 0;
        this.commentRangeLoopTimer = 0;
        this.keyboardVolumeStep = 0;
        this.keyboardZoomStep = 0;
    }

    bindCommentMarkersListener() {
        if (!this.isAudioPlayerV2) {
            return;
        }
        this.removeListener('comment_markers', this.handleCommentMarkersUpdated);
        this.addListener('comment_markers', this.handleCommentMarkersUpdated);
    }

    bindCommentRangeDraftListeners() {
        if (!this.isAudioPlayerV2) {
            return;
        }
        this.removeListener(EVENT_COMMENT_RANGE_DRAFT, this.handleCommentRangeDraft);
        this.removeListener(EVENT_COMMENT_RANGE_DRAFT_CLEAR, this.handleCommentRangeDraftClear);
        this.addListener(EVENT_COMMENT_RANGE_DRAFT, this.handleCommentRangeDraft);
        this.addListener(EVENT_COMMENT_RANGE_DRAFT_CLEAR, this.handleCommentRangeDraftClear);
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
     * V2 audio keymap. Flag off and video keep MediaBaseViewer.handleKeydownReact.
     * Alt is not in Preview's key decoder — read it from the native event.
     *
     * @param {string} key
     * @param {KeyboardEvent} [event]
     * @return {boolean} consumed
     */
    onKeydown(key, event) {
        if (this.isAudioPlayerV2 && this.handleKeydownAudioV2(key, event)) {
            return true;
        }
        return super.onKeydown(key, event);
    }

    handleKeydownAudioV2(key, event) {
        const decoded = (key || '').toLowerCase();
        const altKey = !!(event && event.altKey);

        switch (decoded) {
            case 'space':
                this.toggleV2Play();
                return true;
            case 'k':
                this.exitShuttle();
                this.pause(undefined, true);
                return true;
            case 'j':
                this.shuttle('reverse');
                return true;
            case 'l':
                this.shuttle('forward');
                return true;
            case 'arrowleft':
                this.quickSeek(-AUDIO_V2_SKIP_SEC);
                return true;
            case 'arrowright':
                this.quickSeek(AUDIO_V2_SKIP_SEC);
                return true;
            case ',':
                this.frameStep('back');
                return true;
            case '.':
                this.frameStep('forward');
                return true;
            case 'arrowup':
                if (altKey || !(this.commentMarkers || []).some(marker => Number.isFinite(marker.time))) {
                    this.stepKeyboardVolume(1);
                    return true;
                }
                this.jumpToCommentMarker(-1);
                return true;
            case 'arrowdown':
                if (altKey || !(this.commentMarkers || []).some(marker => Number.isFinite(marker.time))) {
                    this.stepKeyboardVolume(-1);
                    return true;
                }
                this.jumpToCommentMarker(1);
                return true;
            case 'end':
                if (!this.mediaEl || !Number.isFinite(this.mediaEl.duration)) {
                    return false;
                }
                this.exitShuttle();
                this.setMediaTime(this.mediaEl.duration);
                return true;
            case '0':
            case 'home':
                this.exitShuttle();
                return false;
            case 'shift+arrowleft':
                this.quickSeek(-AUDIO_V2_SHIFT_SKIP_SEC);
                return true;
            case 'shift+arrowright':
                this.quickSeek(AUDIO_V2_SHIFT_SKIP_SEC);
                return true;
            case 'i':
            case 'o':
            case '/':
            case 'shift+l':
                // Range UI is not on this branch yet. Consume so I/O/loop cannot
                // fall through to shuttle or Preview navigation.
                return true;
            case 'shift++':
            case '+':
            case '=':
                this.stepKeyboardZoom(1);
                return true;
            case '-':
            case 'shift+_':
                this.stepKeyboardZoom(-1);
                return true;
            default:
                return false;
        }
    }

    toggleV2Play() {
        const reverseShuttle = this.shuttleDirection === 'reverse';
        const wasPlaying = !!(this.mediaEl && !this.mediaEl.paused);
        this.exitShuttle();
        if (reverseShuttle || wasPlaying) {
            this.pause(undefined, true);
            return;
        }
        this.handlePlayRequest();
    }

    shuttle(direction) {
        const sameDirection = this.shuttleDirection === direction;
        const rate = nextShuttleRate(this.shuttleRate, sameDirection);
        if (direction === 'forward') {
            this.startForwardShuttle(rate);
            return;
        }
        this.startReverseShuttle(rate);
    }

    startForwardShuttle(rate) {
        this.stopReverseShuttle();
        this.shuttleDirection = 'forward';
        this.shuttleRate = rate;
        this.userRequestedPlay = true;
        const playPromise = this.play();
        if (this.mediaEl) {
            this.mediaEl.playbackRate = this.shuttleRate;
        }
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise
                .then(() => {
                    if (this.mediaEl && this.shuttleDirection === 'forward') {
                        this.mediaEl.playbackRate = this.shuttleRate;
                    }
                    this.scheduleCommentRangeLoopWrap();
                })
                .catch(() => {});
        }
        this.scheduleCommentRangeLoopWrap(true);
    }

    startReverseShuttle(rate) {
        this.stopReverseShuttle();
        this.shuttleDirection = 'reverse';
        this.shuttleRate = rate;
        this.userRequestedPlay = true;
        this.pause(undefined, true);
        this.handleRate();
        this.reverseShuttleTimer = window.setInterval(() => {
            const floor = this.clampTimeToOpenCommentRange(0);
            if (!this.mediaEl || this.mediaEl.currentTime <= floor) {
                this.exitShuttle();
                return;
            }
            this.quickSeek(-((this.shuttleRate * AUDIO_V2_SHUTTLE_TICK_MS) / 1000));
            if (this.mediaEl.currentTime <= floor) {
                this.exitShuttle();
            }
        }, AUDIO_V2_SHUTTLE_TICK_MS);
    }

    stopReverseShuttle() {
        if (this.reverseShuttleTimer) {
            window.clearInterval(this.reverseShuttleTimer);
            this.reverseShuttleTimer = 0;
        }
    }

    exitShuttle() {
        const wasShuttling = !!this.shuttleDirection;
        this.stopReverseShuttle();
        this.shuttleDirection = null;
        this.shuttleRate = 0;
        if (wasShuttling) {
            this.handleRate();
        }
    }

    /**
     * Keep the settings rate unless forward shuttle owns playbackRate.
     *
     * @inheritdoc
     */
    handleRate() {
        if (this.shuttleDirection === 'forward' && this.shuttleRate > 0 && this.mediaEl) {
            this.mediaEl.playbackRate = this.shuttleRate;
            if (this.controls) {
                this.renderUI();
            }
            this.scheduleCommentRangeLoopWrap();
            return;
        }
        super.handleRate();
        this.scheduleCommentRangeLoopWrap();
    }

    jumpToCommentMarker(direction) {
        if (!this.mediaEl) {
            return;
        }

        const target = nextCommentMarker(this.commentMarkers, {
            direction,
            selectedId: this.hostSelectedMarkerId,
            time: this.mediaEl.currentTime,
        });
        if (!target || target.id === this.hostSelectedMarkerId) {
            return;
        }
        this.handleCommentMarkerClick(target);
    }

    stepKeyboardVolume(direction) {
        this.keyboardVolumeStep += 1;
        if (direction > 0) {
            this.increaseVolume();
            return;
        }
        this.decreaseVolume();
    }

    stepKeyboardZoom(direction) {
        this.keyboardZoomStep += direction;
        this.renderUI();
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
        this.clearCommentRangeLoopTimer();
        this.removeListener('comment_markers', this.handleCommentMarkersUpdated);
        this.removeListener(EVENT_COMMENT_RANGE_DRAFT, this.handleCommentRangeDraft);
        this.removeListener(EVENT_COMMENT_RANGE_DRAFT_CLEAR, this.handleCommentRangeDraftClear);
        this.commentRangeDraft = null;
        this.isCommentRangeDragging = false;
        this.isCommentRangeTimestampActive = false;
        this.stopReverseShuttle();
        this.shuttleDirection = null;
        this.shuttleRate = 0;
        this.abortWaveformLoads();
        super.destroy();
    }

    /**
     * @inheritdoc
     */
    load() {
        if (this.isAudioPlayerV2) {
            // A file-version switch is a clear, not a resync of the previous draft.
            this.commentRangeDraft = null;
            this.isCommentRangeDragging = false;
            this.isCommentRangeTimestampActive = false;
            this.syncCommentRangeLoop();
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
     * @return {Object|null} waveform conversion representation
     */
    getWaveformRepresentation() {
        const { file } = this.options;
        return file?.representations?.entries ? getRepresentation(file, WAVEFORM_REP_NAME) : null;
    }

    /**
     * @return {string|null} conversion representation state
     */
    getWaveformConversionState() {
        const conversionStatus = this.getWaveformRepresentation()?.status;
        return conversionStatus && typeof conversionStatus === 'object' ? conversionStatus.state : null;
    }

    /**
     * Conversion JSON is already (or about to be) fetchable.
     *
     * @return {boolean}
     */
    isConversionWaveformAvailable() {
        const conversionState = this.getWaveformConversionState();
        return conversionState === STATUS_SUCCESS || conversionState === STATUS_VIEWABLE;
    }

    /**
     * Generating chip while conversion RepStatus is polling. Hidden when the
     * rep is already success/viewable, when polling finishes, when conversion
     * errors, and once any source applies peaks.
     *
     * @return {boolean}
     */
    isGeneratingWaveform() {
        if (!this.isAudioPlayerV2 || this.destroyed || this.waveformPeaksSource) {
            return false;
        }
        return !!this.isWaveformConversionPolling;
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

        const waveform = this.getWaveformRepresentation();
        const template = waveform?.content?.url_template;
        const conversionState = this.getWaveformConversionState();
        if (!waveform || !template || !conversionState || conversionState === STATUS_ERROR) {
            this.startClientWaveformDecode();
            this.renderUI();
            return;
        }

        this.abortConversionWaveformLoad();
        this.waveformStatus = this.getRepStatus(waveform);
        this.waveformStatus.removeListener('conversionpending', this.resetLoadTimeout);
        const status = this.waveformStatus;
        const shouldPollConversion = !this.isConversionWaveformAvailable();

        try {
            if (shouldPollConversion) {
                this.isWaveformConversionPolling = true;
                this.renderUI();
            }
            await status.getPromise();
            this.isWaveformConversionPolling = false;
            if (this.destroyed || this.waveformStatus !== status || this.waveformPeaksSource) {
                return;
            }
            if (shouldPollConversion) {
                this.renderUI();
            }
            const result = await this.loadConversionWaveformPayload(template);
            this.handleConversionWaveformResult(result, status);
        } catch {
            this.isWaveformConversionPolling = false;
            this.startClientWaveformDecode();
            if (shouldPollConversion) {
                this.renderUI();
            }
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
        this.isWaveformConversionPolling = false;
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
        this.exitShuttle();
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
        this.exitShuttle();
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
        this.bindCommentRangeDraftListeners();
        this.renderUI();
    }

    handleCommentMarkersUpdated = (markers = []) => {
        this.commentMarkers = markers;
        const selected = markers.find(marker => marker.isSelected);

        // Host echoes often omit isSelected. Keep hostSelectedMarkerId so ↑/↓ can
        // still walk other comments at the same time. Clear only when that id is gone.
        if (selected) {
            if (selected.id !== this.hostSelectedMarkerId) {
                this.hostSelectedMarkerId = selected.id;
                if (Number.isFinite(selected.time)) {
                    this.pendingHostSelectedSeek = selected;
                    this.applyPendingHostSelectedSeek();
                }
            }
        } else if (this.hostSelectedMarkerId && !markers.some(marker => marker.id === this.hostSelectedMarkerId)) {
            this.hostSelectedMarkerId = null;
            this.pendingHostSelectedSeek = null;
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
        this.exitShuttle();
        this.handleCommentRangeClear();
        this.mediaEl.pause();
        if (this.mediaEl.currentTime !== marker.time) {
            this.mediaEl.currentTime = marker.time;
        }
    }

    /**
     * Seconds of the open draft span, or null when collapsed / absent.
     * Collapsed drafts (`endMs: null`) do not confine playback.
     *
     * @return {{endSec: number, startSec: number}|null}
     */
    getOpenCommentRangeSeconds() {
        const draft = this.commentRangeDraft;
        if (isRangeCollapsed(draft) || !Number.isFinite(draft.startMs) || !Number.isFinite(draft.endMs)) {
            return null;
        }
        return { endSec: draft.endMs / 1000, startSec: draft.startMs / 1000 };
    }

    /**
     * Keep a seek inside the open draft. Waveform click-outside and host
     * comment seeks dismiss first, then seek; clamp does not apply then.
     *
     * @param {number} time
     * @return {number}
     */
    clampTimeToOpenCommentRange(time) {
        const range = this.getOpenCommentRangeSeconds();
        if (!range || !Number.isFinite(time)) {
            return time;
        }
        return Math.min(Math.max(time, range.startSec), range.endSec);
    }

    clearCommentRangeLoopTimer() {
        if (this.commentRangeLoopTimer) {
            window.clearTimeout(this.commentRangeLoopTimer);
            this.commentRangeLoopTimer = 0;
        }
    }

    /**
     * Wrap when the remaining time to end elapses. Recalculate after play, seek,
     * rate change, or a draft resize.
     *
     * @param {boolean} [force] schedule even if the element still reports paused
     * @return {void}
     */
    scheduleCommentRangeLoopWrap(force = false) {
        this.clearCommentRangeLoopTimer();
        const range = this.getOpenCommentRangeSeconds();
        if (!range || !this.mediaEl || (!force && this.mediaEl.paused)) {
            return;
        }
        const rate = this.mediaEl.playbackRate > 0 ? this.mediaEl.playbackRate : 1;
        const remainingSec = range.endSec - this.mediaEl.currentTime;
        this.commentRangeLoopTimer = window.setTimeout(() => {
            this.commentRangeLoopTimer = 0;
            const openRange = this.getOpenCommentRangeSeconds();
            if (!openRange || !this.mediaEl || this.mediaEl.paused) {
                return;
            }
            if (this.mediaEl.currentTime !== openRange.startSec) {
                this.mediaEl.currentTime = openRange.startSec;
            }
            this.scheduleCommentRangeLoopWrap();
        }, Math.max(0, (remainingSec / rate) * 1000));
    }

    /**
     * Update the playback loop to match the current range after it arrives, resizes,
     * or clears.
     *
     * @return {void}
     */
    syncCommentRangeLoop() {
        this.clearCommentRangeLoopTimer();
        const range = this.getOpenCommentRangeSeconds();
        if (!range || !this.mediaEl || this.mediaEl.paused) {
            return;
        }
        this.enforceCommentRangePlayback(range);
    }

    /**
     * Keep playback inside the open span. A playhead outside [start, end) jumps
     * to start, then the wrap timer is armed.
     *
     * @param {{endSec: number, startSec: number}} range Open draft in seconds
     * @return {void}
     */
    enforceCommentRangePlayback(range) {
        const { endSec, startSec } = range;
        const currPlayhead = this.mediaEl.currentTime;
        const nextPlayhead = currPlayhead >= startSec && currPlayhead < endSec ? currPlayhead : startSec;
        if (nextPlayhead !== currPlayhead) {
            this.mediaEl.currentTime = nextPlayhead;
        }
        this.scheduleCommentRangeLoopWrap();
    }

    /**
     * Play. An open draft loops that span: keep the playhead when it is already
     * inside, otherwise jump to start. Does not use play(start, end) because
     * that pauses at end.
     *
     * @inheritdoc
     */
    play(...args) {
        const range = this.getOpenCommentRangeSeconds();
        if (!range || !this.mediaEl) {
            // Spread so an argument-less call stays argument-less; super.play() skips
            // playback when it is handed an explicit undefined start.
            return super.play(...args);
        }

        const requested = Number.isFinite(args[0]) ? args[0] : this.mediaEl.currentTime;
        const next = requested >= range.startSec && requested < range.endSec ? requested : range.startSec;
        if (this.mediaEl.currentTime !== next) {
            this.mediaEl.currentTime = next;
        }
        const playPromise = super.play();
        this.scheduleCommentRangeLoopWrap(true);
        return playPromise;
    }

    /**
     * Seek. Keyboard and in-range waveform seeks stay inside an open draft.
     *
     * @inheritdoc
     */
    setMediaTime(time) {
        super.setMediaTime(this.clampTimeToOpenCommentRange(time));
        this.scheduleCommentRangeLoopWrap();
    }

    /**
     * If the range ends at file end, wrap instead of resetting the play icon.
     *
     * @inheritdoc
     */
    mediaendHandler() {
        if (this.getOpenCommentRangeSeconds()) {
            // `ended` fires after the element is paused; play() wraps and restarts.
            this.play();
            return;
        }
        super.mediaendHandler();
    }

    handleCommentRangeDraft = draft => {
        if (this.isCommentRangeDragging || !isValidCommentRangeDraft(draft)) {
            return;
        }
        // Checkbox-on sends a collapsed playhead. A waveform-drawn span should
        // become that timestamp value instead of collapsing back to the playhead.
        const local = this.commentRangeDraft;
        if (local && !isRangeCollapsed(local) && draft.endMs == null) {
            if (!this.isCommentRangeTimestampActive) {
                this.isCommentRangeTimestampActive = true;
                this.emit(EVENT_COMMENT_RANGE_DRAFT_CHANGE, { endMs: local.endMs, startMs: local.startMs });
            }
            this.syncCommentRangeLoop();
            this.renderUI();
            return;
        }
        this.isCommentRangeTimestampActive = true;
        this.commentRangeDraft = { endMs: draft.endMs == null ? null : draft.endMs, startMs: draft.startMs };
        this.syncCommentRangeLoop();
        this.renderUI();
    };

    handleCommentRangeDraftClear = () => {
        this.commentRangeDraft = null;
        this.isCommentRangeDragging = false;
        this.isCommentRangeTimestampActive = false;
        this.syncCommentRangeLoop();
        this.renderUI();
    };

    handleCommentRangeChange = range => {
        if (
            !range ||
            !Number.isFinite(range.startMs) ||
            !Number.isFinite(range.endMs) ||
            range.endMs <= range.startMs
        ) {
            return;
        }
        this.commentRangeDraft = { endMs: range.endMs, startMs: range.startMs };
        if (this.isCommentRangeTimestampActive) {
            this.emit(EVENT_COMMENT_RANGE_DRAFT_CHANGE, { endMs: range.endMs, startMs: range.startMs });
        }
        this.syncCommentRangeLoop();
        this.renderUI();
    };

    handleCommentRangeDragCreate = () => {
        const draft = this.commentRangeDraft;
        if (!draft || isRangeCollapsed(draft)) {
            return;
        }
        this.isCommentRangeTimestampActive = true;
        this.emit(EVENT_COMMENT_RANGE_DRAG_CREATE, { endMs: draft.endMs, startMs: draft.startMs });
    };

    handleCommentRangeDragChange = isDragging => {
        this.isCommentRangeDragging = !!isDragging;
    };

    handleCommentRangeClear = () => {
        if (!this.commentRangeDraft || this.commentRangeDraft.endMs == null) {
            return;
        }
        this.commentRangeDraft = null;
        this.isCommentRangeTimestampActive = false;
        this.emit(EVENT_COMMENT_RANGE_DRAFT_DISMISS);
        this.syncCommentRangeLoop();
        this.renderUI();
    };

    handleCommentMarkerClick = marker => {
        this.exitShuttle();
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
                    commentRangeDraft={this.commentRangeDraft || null}
                    hasStartedPlayback={!!this.userRequestedPlay}
                    isGeneratingWaveform={this.isGeneratingWaveform()}
                    keyboardVolumeStep={this.keyboardVolumeStep}
                    keyboardZoomStep={this.keyboardZoomStep}
                    mediaEl={this.mediaEl}
                    onCommentMarkerClick={this.handleCommentMarkerClick}
                    onCommentRangeChange={this.handleCommentRangeChange}
                    onCommentRangeClear={this.handleCommentRangeClear}
                    onCommentRangeDragChange={this.handleCommentRangeDragChange}
                    onCommentRangeDragCreate={this.handleCommentRangeDragCreate}
                    onPlayNextChange={this.setPlayNext}
                    peaks={this.waveformPeaks}
                    playNext={this.isPlayNextEnabled()}
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
