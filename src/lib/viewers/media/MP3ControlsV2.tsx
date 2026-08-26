import React, { useCallback, useEffect, useRef, useState } from 'react';
import isFinite from 'lodash/isFinite';
import { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import MediaSettings, { Props as MediaSettingsProps } from '../controls/media/MediaSettings';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import { Props as TimeControlsProps } from '../controls/media/TimeControls';
import TimestampControl from '../controls/media/TimestampControl';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import { ICON_PLAY_LARGE } from '../../icons';
import { WAVEFORM_ZOOM_DISMISS_MS, WAVEFORM_ZOOM_MIN } from './waveform/constants';
import { PLACEHOLDER_DURATION_SEC, placeholderPeaks } from './waveform/peaks';
import { WaveformViewport } from './waveform/types';
import { clampWaveformZoom } from './waveform/viewport';
import WaveformView from './waveform/WaveformView';
import WaveformZoomControl from './waveform/WaveformZoomControl';
import './MP3ControlsV2.scss';

const PLACEHOLDER_PEAKS = placeholderPeaks();

export type Props = DurationLabelsProps &
    MediaSettingsProps &
    PlayControlsProps &
    Pick<TimeControlsProps, 'onTimeChange'> &
    VolumeControlsProps & {
        bufferedRange?: TimeRanges;
        mediaEl?: HTMLMediaElement | null;
        peaks?: ArrayLike<number>;
    };

export default function MP3ControlsV2({
    autoplay,
    bufferedRange,
    currentTime,
    durationTime,
    isPlaying,
    mediaEl,
    onAutoplayChange,
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
    const [zoomLevel, setZoomLevel] = useState(WAVEFORM_ZOOM_MIN);
    const [maxZoom, setMaxZoom] = useState(WAVEFORM_ZOOM_MIN);
    const [isZoomRevealed, setIsZoomRevealed] = useState(false);
    const zoomRevealTimerRef = useRef(0);
    const hasRealPeaks = !!(peaks && peaks.length);
    const waveformPeaks = hasRealPeaks ? peaks : PLACEHOLDER_PEAKS;
    const hasMetadata = durationValue > 0;
    const waveformDurationSec = hasMetadata ? durationValue : PLACEHOLDER_DURATION_SEC;
    const [playRequested, setPlayRequested] = useState(false);
    const handleViewportChange = useCallback((viewport: WaveformViewport) => {
        setMaxZoom(viewport.maxZoom);
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
            setZoomLevel(nextZoom);
            revealZoomControl();
        },
        [revealZoomControl],
    );

    useEffect(() => {
        setZoomLevel(prev => clampWaveformZoom(prev, maxZoom));
    }, [maxZoom]);

    useEffect(() => () => window.clearTimeout(zoomRevealTimerRef.current), []);

    useEffect(() => {
        if (isPlaying) {
            setPlayRequested(true);
        }
    }, [isPlaying]);

    const handlePlayOverlayClick = useCallback(() => {
        setPlayRequested(true);
        onPlayPause(true);
    }, [onPlayPause]);

    const isWaveformInteractive = playRequested && hasMetadata;
    const isWaitingToPlay = playRequested && !hasMetadata;
    const showPlayOverlay = !playRequested && !isPlaying;
    const hasZoomHandlers = hasRealPeaks && !showPlayOverlay;
    const hasZoomControl = hasZoomHandlers && hasMetadata && maxZoom > WAVEFORM_ZOOM_MIN;

    return (
        <div className="bp-MP3ControlsV2" data-testid="media-controls-wrapper-v2">
            <div className="bp-MP3ControlsV2-stage">
                <WaveformView
                    bufferedRange={bufferedRange}
                    currentTime={currentTime}
                    durationSec={waveformDurationSec}
                    interactive={isWaveformInteractive}
                    mediaEl={mediaEl}
                    onSeek={isWaveformInteractive ? onTimeChange : undefined}
                    onViewportChange={hasRealPeaks ? handleViewportChange : undefined}
                    onZoomChange={hasZoomHandlers ? handleWaveformZoom : undefined}
                    peaks={waveformPeaks}
                    zoomLevel={hasZoomHandlers ? zoomLevel : WAVEFORM_ZOOM_MIN}
                />
                {hasZoomControl && (
                    <div className="bp-MP3ControlsV2-waveformZoom">
                        <WaveformZoomControl
                            isRevealed={isZoomRevealed}
                            maxZoom={maxZoom}
                            onZoomChange={setZoomLevel}
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
                        title={__('media_play')}
                        type="button"
                    />
                )}
                {isWaitingToPlay && (
                    <div className="bp-media-buffering-spinner" data-testid="bp-MP3ControlsV2-loading" />
                )}
            </div>
            {hasMetadata && (
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
