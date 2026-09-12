import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import isFinite from 'lodash/isFinite';
import { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import MediaSettings, { Props as MediaSettingsProps } from '../controls/media/MediaSettings';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import { Props as TimeControlsProps } from '../controls/media/TimeControls';
import TimestampControl from '../controls/media/TimestampControl';
import { CommentMarker } from '../controls/media/markers';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import { ICON_PLAY_LARGE } from '../../icons';
import { WAVEFORM_HEIGHT, WAVEFORM_ZOOM_DISMISS_MS, WAVEFORM_ZOOM_MIN } from './waveform/constants';
import { PLACEHOLDER_DURATION_SEC, placeholderPeaks } from './waveform/peaks';
import { WaveformViewport } from './waveform/types';
import { clampWaveformZoom, getTapeDefaultZoom, viewportEquals } from './waveform/viewport';
import useTapeWaveform from './waveform/useTapeWaveform';
import WaveformCommentMarkers from './waveform/WaveformCommentMarkers';
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
        mediaEl?: HTMLMediaElement | null;
        onCommentMarkerClick?: (marker: CommentMarker) => void;
        peaks?: ArrayLike<number>;
    };

export default function MP3ControlsV2({
    autoplay,
    bufferedRange,
    commentMarkers,
    currentTime,
    durationTime,
    isPlaying,
    mediaEl,
    onAutoplayChange,
    onCommentMarkerClick,
    onMuteChange,
    onPlayPause,
    onRateChange,
    onTimeChange,
    onVolumeChange,
    peaks,
    rate,
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
    const [playRequested, setPlayRequested] = useState(false);
    const [viewport, setViewport] = useState<WaveformViewport | null>(null);
    const isTape = useTapeWaveform();
    const hasAppliedTapeDefaultZoomRef = useRef(false); // ~10s window applied; reset to 1× when leaving tape
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
        if (isPlaying) {
            setPlayRequested(true);
        }
    }, [isPlaying]);

    const handlePlayOverlayClick = useCallback(() => {
        setPlayRequested(true);
        onPlayPause(true);
        // Overlay unmounts on click; without this, focus lands on body and Space is lost.
        mediaEl?.closest<HTMLElement>('.bp-media-container')?.focus();
    }, [mediaEl, onPlayPause]);

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

    const isWaveformInteractive = playRequested && hasMediaMetadata;
    const isWaitingToPlay = playRequested && !hasMediaMetadata;
    const showPlayOverlay = !playRequested && !isPlaying;
    const hasZoomHandlers = hasRealPeaks && !showPlayOverlay;
    const hasZoomControl = hasZoomHandlers && hasMediaMetadata && maxZoom > WAVEFORM_ZOOM_MIN;
    const waveformZoomLevel = isTape || hasZoomHandlers ? zoomLevel : WAVEFORM_ZOOM_MIN;

    return (
        <div
            className="bp-MP3ControlsV2"
            data-testid="media-controls-wrapper-v2"
            style={{ '--bp-waveform-bar-min': `${WAVEFORM_HEIGHT}px` } as React.CSSProperties}
        >
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
                        onSeek={isWaveformInteractive ? onTimeChange : undefined}
                        onViewportChange={hasRealPeaks ? handleViewportChange : undefined}
                        onZoomChange={hasZoomHandlers ? handleWaveformZoom : undefined}
                        peaks={waveformPeaks}
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
                {hasZoomControl && (
                    <div className="bp-MP3ControlsV2-waveformZoom">
                        <WaveformZoomControl
                            isRevealed={isZoomRevealed}
                            maxZoom={maxZoom}
                            onZoomChange={handleWaveformZoom}
                            zoomLevel={zoomLevel}
                        />
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
                        <VolumeControls onMuteChange={onMuteChange} onVolumeChange={onVolumeChange} volume={volume} />
                        <MediaSettings
                            autoplay={autoplay}
                            className="bp-MP3Controls-settings"
                            onAutoplayChange={onAutoplayChange}
                            onRateChange={onRateChange}
                            rate={rate}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
