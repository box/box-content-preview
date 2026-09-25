import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import isFinite from 'lodash/isFinite';
import { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import MediaSettings, { Props as MediaSettingsProps } from '../controls/media/MediaSettings';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import { Props as TimeControlsProps } from '../controls/media/TimeControls';
import TimestampControl from '../controls/media/TimestampControl';
import { CommentMarker } from '../controls/media/markers';
import { CommentRangeDraft } from '../controls/media/types';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import { ICON_PLAY_LARGE } from '../../icons';
import { WAVEFORM_ZOOM_BUTTON_STEP, WAVEFORM_ZOOM_DISMISS_MS, WAVEFORM_ZOOM_MIN } from './waveform/constants';
import { PLACEHOLDER_DURATION_SEC, placeholderPeaks } from './waveform/peaks';
import { ShuttleDirection, WaveformViewport } from './waveform/types';
import { clampWaveformZoom, getTapeDefaultZoom, stepWaveformZoom, viewportEquals } from './waveform/viewport';
import useTapeWaveform from './waveform/useTapeWaveform';
import WaveformCommentMarkers from './waveform/WaveformCommentMarkers';
import WaveformGeneratingIndicator from './waveform/WaveformGeneratingIndicator';
import WaveformShuttleIndicator from './waveform/WaveformShuttleIndicator';
import WaveformView from './waveform/WaveformView';
import WaveformZoomControl from './waveform/WaveformZoomControl';
import './MP3ControlsV2.scss';

const PLACEHOLDER_PEAKS = placeholderPeaks();

export type Props = Omit<DurationLabelsProps, 'mediaEl'> &
    MediaSettingsProps &
    PlayControlsProps &
    Pick<TimeControlsProps, 'onTimeChange'> &
    VolumeControlsProps & {
        bufferedRange?: TimeRanges;
        commentMarkers?: CommentMarker[];
        commentRangeDraft?: CommentRangeDraft | null;
        /** Selected ranged comment. Drawn when no draft is open. */
        commentRangeReadOnly?: CommentRangeDraft | null;
        hasStartedPlayback?: boolean;
        isGeneratingWaveform?: boolean;
        keyboardZoomStep?: number;
        mediaEl?: HTMLMediaElement | null;
        onCommentMarkerClick?: (marker: CommentMarker) => void;
        onCommentRangeChange?: (range: { endMs: number; startMs: number }) => void;
        onCommentRangeClear?: () => void;
        onCommentRangeDragCreate?: () => void;
        onCommentRangeDragChange?: (isDragging: boolean) => void;
        peaks?: ArrayLike<number>;
        shuttleDirection?: ShuttleDirection | null;
        shuttleRate?: number;
    };

export default function MP3ControlsV2({
    autoplay,
    bufferedRange,
    commentMarkers,
    commentRangeDraft = null,
    commentRangeReadOnly = null,
    currentTime,
    durationTime,
    hasStartedPlayback = false,
    isGeneratingWaveform = false,
    isPlaying,
    keyboardVolumeStep = 0,
    keyboardZoomStep = 0,
    mediaEl,
    onAutoplayChange,
    onCommentMarkerClick,
    onCommentRangeChange,
    onCommentRangeClear,
    onCommentRangeDragCreate,
    onCommentRangeDragChange,
    onMuteChange,
    onPlayPause,
    onPlayNextChange,
    onRateChange,
    onTimeChange,
    onVolumeChange,
    peaks,
    playNext,
    rate,
    shuttleDirection = null,
    shuttleRate = 0,
    volume,
}: Props): JSX.Element {
    const durationValue = typeof durationTime === 'number' && isFinite(durationTime) ? durationTime : 0;
    const mediaDuration = mediaEl ? mediaEl.duration : NaN;
    const hasMediaMetadata = typeof mediaDuration === 'number' && Number.isFinite(mediaDuration) && mediaDuration > 0;
    const hasWaveformDuration = durationValue > 0;
    const [zoomLevel, setZoomLevel] = useState(WAVEFORM_ZOOM_MIN);
    const [maxZoom, setMaxZoom] = useState(WAVEFORM_ZOOM_MIN);
    const [isZoomRevealed, setIsZoomRevealed] = useState(false);
    const zoomRevealTimerRef = useRef(0); // hides the zoom flyout after WAVEFORM_ZOOM_DISMISS_MS
    const hasRealPeaks = !!(peaks && peaks.length);
    const waveformPeaks = hasRealPeaks ? peaks : PLACEHOLDER_PEAKS;
    const waveformDurationSec = hasWaveformDuration ? durationValue : PLACEHOLDER_DURATION_SEC;
    const [playRequested, setPlayRequested] = useState(hasStartedPlayback);
    const [viewport, setViewport] = useState<WaveformViewport | null>(null);
    const isTape = useTapeWaveform();
    const hasAppliedTapeDefaultZoomRef = useRef(false); // ~10s window applied; reset to 1× when leaving tape
    const lastKeyboardZoomStepRef = useRef(0); // last +/− step applied; skip re-step when maxZoom retriggers the effect
    const userChangedTapeZoomRef = useRef(false); // pinch/wheel zoom; skip re-applying the 10s default
    const handleViewportChange = useCallback((next: WaveformViewport) => {
        setMaxZoom(prev => (prev === next.maxZoom ? prev : next.maxZoom));
        setViewport(prev => (viewportEquals(prev, next) ? prev : next));
    }, []);

    const revealZoomControl = useCallback(() => {
        setIsZoomRevealed(true);
        window.clearTimeout(zoomRevealTimerRef.current);
        zoomRevealTimerRef.current = window.setTimeout(() => {
            setIsZoomRevealed(false);
            zoomRevealTimerRef.current = 0;
        }, WAVEFORM_ZOOM_DISMISS_MS);
    }, []);

    const handleWaveformZoom = useCallback(
        (nextZoom: number) => {
            userChangedTapeZoomRef.current = true;
            setZoomLevel(nextZoom);
            revealZoomControl();
        },
        [revealZoomControl],
    );

    useEffect(() => {
        const steps = keyboardZoomStep - lastKeyboardZoomStepRef.current;
        if (!steps) {
            return;
        }
        lastKeyboardZoomStepRef.current = keyboardZoomStep;
        if (!(maxZoom > WAVEFORM_ZOOM_MIN)) {
            return;
        }
        userChangedTapeZoomRef.current = true;
        setZoomLevel(prev => stepWaveformZoom(prev, maxZoom, steps * WAVEFORM_ZOOM_BUTTON_STEP));
        revealZoomControl();
    }, [keyboardZoomStep, maxZoom, revealZoomControl]);

    useEffect(() => {
        setZoomLevel(prev => clampWaveformZoom(prev, maxZoom));
    }, [maxZoom]);

    useEffect(() => {
        if (!isTape) {
            if (hasAppliedTapeDefaultZoomRef.current) {
                hasAppliedTapeDefaultZoomRef.current = false;
                userChangedTapeZoomRef.current = false;
                setZoomLevel(WAVEFORM_ZOOM_MIN);
            }
            return;
        }
        if (!hasWaveformDuration || !hasRealPeaks || !viewport || !(viewport.widthPx > 0)) {
            return;
        }
        if (userChangedTapeZoomRef.current) {
            hasAppliedTapeDefaultZoomRef.current = true;
            return;
        }
        const nextZoom = getTapeDefaultZoom(durationValue, Math.max(maxZoom, viewport.maxZoom));
        hasAppliedTapeDefaultZoomRef.current = true;
        setZoomLevel(prev => (prev === nextZoom ? prev : nextZoom));
    }, [durationValue, hasRealPeaks, hasWaveformDuration, isTape, maxZoom, viewport]);

    useEffect(() => () => window.clearTimeout(zoomRevealTimerRef.current), []);

    useEffect(() => {
        if (isPlaying || hasStartedPlayback) {
            setPlayRequested(true);
        }
    }, [hasStartedPlayback, isPlaying]);

    const handlePlayOverlayClick = useCallback(() => {
        setPlayRequested(true);
        onPlayPause(true);
        // Overlay unmounts on click; without this, focus lands on body and Space is lost.
        mediaEl?.closest<HTMLElement>('.bp-media-container')?.focus();
    }, [mediaEl, onPlayPause]);

    const waveformRange = commentRangeDraft ?? commentRangeReadOnly;
    const isRangeReadOnly = commentRangeDraft == null && commentRangeReadOnly != null;
    const waveformMarkers = useMemo(() => commentMarkers || [], [commentMarkers]);
    const selectedMarkerId = useMemo(() => waveformMarkers.find(marker => marker.isSelected)?.id ?? null, [
        waveformMarkers,
    ]);
    const handleCommentMarkerClick = useCallback(
        (marker: CommentMarker) => {
            setPlayRequested(true);
            onPlayPause(false);
            if (onCommentMarkerClick) {
                onCommentMarkerClick(marker);
                return;
            }
            onTimeChange(marker.time);
        },
        [onCommentMarkerClick, onPlayPause, onTimeChange],
    );

    const hasStarted = playRequested || hasStartedPlayback;
    const isWaveformInteractive = hasStarted && hasMediaMetadata;
    const isWaitingToPlay = hasStarted && !hasMediaMetadata;
    const showPlayOverlay = !hasStarted && !isPlaying;
    const hasZoomHandlers = hasRealPeaks && !showPlayOverlay;
    const hasZoomControl = hasZoomHandlers && hasMediaMetadata && maxZoom > WAVEFORM_ZOOM_MIN;
    const showGeneratingWaveformIndicator = isGeneratingWaveform && !hasRealPeaks;
    const showShuttle = !isTape && !!shuttleDirection && shuttleRate > 0;
    const waveformZoomLevel = isTape || hasZoomHandlers ? zoomLevel : WAVEFORM_ZOOM_MIN;

    return (
        <div className="bp-MP3ControlsV2" data-testid="media-controls-wrapper-v2">
            <div className="bp-MP3ControlsV2-stage">
                <div className="bp-MP3ControlsV2-waveform">
                    <WaveformView
                        bufferedRange={bufferedRange}
                        cameraMode={isTape ? 'tape' : 'desktop'}
                        currentTime={currentTime}
                        durationSec={waveformDurationSec}
                        interactive={isWaveformInteractive}
                        isPlaying={isPlaying}
                        mediaEl={mediaEl}
                        onPlayPause={isWaveformInteractive ? onPlayPause : undefined}
                        onRangeChange={isWaveformInteractive ? onCommentRangeChange : undefined}
                        onRangeClear={isWaveformInteractive ? onCommentRangeClear : undefined}
                        onRangeDragChange={onCommentRangeDragChange}
                        onRangeDragCreate={isWaveformInteractive ? onCommentRangeDragCreate : undefined}
                        onSeek={isWaveformInteractive ? onTimeChange : undefined}
                        onViewportChange={hasRealPeaks ? handleViewportChange : undefined}
                        onZoomChange={hasZoomHandlers ? handleWaveformZoom : undefined}
                        peaks={waveformPeaks}
                        range={waveformRange}
                        rangeReadOnly={isRangeReadOnly}
                        zoomLevel={waveformZoomLevel}
                    />
                    <WaveformCommentMarkers
                        commentMarkers={waveformMarkers}
                        durationSec={hasWaveformDuration ? durationValue : 0}
                        isTape={isTape}
                        onCommentMarkerClick={handleCommentMarkerClick}
                        selectedId={selectedMarkerId}
                        viewport={viewport}
                    />
                </div>
                {showShuttle && shuttleDirection && (
                    <WaveformShuttleIndicator direction={shuttleDirection} rate={shuttleRate} />
                )}
                {(showGeneratingWaveformIndicator || hasZoomControl) && (
                    <div className="bp-MP3ControlsV2-waveformZoom">
                        {showGeneratingWaveformIndicator ? (
                            <WaveformGeneratingIndicator />
                        ) : (
                            <WaveformZoomControl
                                isRevealed={isZoomRevealed}
                                maxZoom={maxZoom}
                                onZoomChange={handleWaveformZoom}
                                zoomLevel={zoomLevel}
                            />
                        )}
                    </div>
                )}
                {showPlayOverlay && (
                    <button
                        className="bp-MP3ControlsV2-playOverlay"
                        // Static SVG from the icons module, same asset video uses for the overlay.
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: ICON_PLAY_LARGE }}
                        data-testid="bp-MP3ControlsV2-play-overlay"
                        onClick={handlePlayOverlayClick}
                        onMouseDown={event => event.preventDefault()}
                        title={__('media_play')}
                        type="button"
                    />
                )}
                {isWaitingToPlay && (
                    <div className="bp-media-buffering-spinner" data-testid="bp-MP3ControlsV2-loading" />
                )}
            </div>
            {hasMediaMetadata && (
                <div className="bp-MP3ControlsV2-bar" data-testid="bp-MP3ControlsV2-bar">
                    <div className="bp-MP3ControlsV2-group">
                        <PlayPauseToggle hasSkipButtons={false} isPlaying={isPlaying} onPlayPause={onPlayPause} />
                        <div className="bp-MP3ControlsV2-divider" />
                        <TimestampControl currentTime={currentTime} durationTime={durationValue} />
                    </div>

                    <div className="bp-MP3ControlsV2-group">
                        <VolumeControls
                            keyboardVolumeStep={keyboardVolumeStep}
                            onMuteChange={onMuteChange}
                            onVolumeChange={onVolumeChange}
                            volume={volume}
                        />
                        <MediaSettings
                            autoplay={autoplay}
                            className="bp-MP3Controls-settings"
                            onAutoplayChange={onAutoplayChange}
                            onPlayNextChange={onPlayNextChange}
                            onRateChange={onRateChange}
                            playNext={playNext}
                            rate={rate}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
