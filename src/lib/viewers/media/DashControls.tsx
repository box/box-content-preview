import React from 'react';
import DurationLabels, { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import HDBadge from '../controls/media/HDBadge';
import MediaFullscreenToggle, { Props as MediaFullscreenToggleProps } from '../controls/media/MediaFullscreenToggle';
import MediaSettings, { Props as MediaSettingsProps } from '../controls/media/MediaSettings';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import TimeControls, { Props as TimeControlsProps } from '../controls/media/TimeControls';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import './DashControls.scss';

export type Props = DurationLabelsProps &
    MediaFullscreenToggleProps &
    MediaSettingsProps &
    PlayControlsProps &
    TimeControlsProps &
    VolumeControlsProps & { isPlayingHD?: boolean };

export default function DashControls({
    audioTrack,
    audioTracks,
    autoplay,
    bufferedRange,
    currentTime,
    durationTime,
    isPlaying,
    isPlayingHD,
    onAudioTrackChange,
    onAutoplayChange,
    onFullscreenToggle,
    onMuteChange,
    onPlayPause,
    onQualityChange,
    onRateChange,
    onTimeChange,
    onVolumeChange,
    quality,
    rate,
    volume,
}: Props): JSX.Element {
    return (
        <div className="bp-DashControls" data-testid="media-controls-wrapper">
            <TimeControls
                bufferedRange={bufferedRange}
                currentTime={currentTime}
                durationTime={durationTime}
                onTimeChange={onTimeChange}
            />

            <div className="bp-DashControls-bar">
                <div className="bp-DashControls-group">
                    <PlayPauseToggle isPlaying={isPlaying} onPlayPause={onPlayPause} />
                    <VolumeControls onMuteChange={onMuteChange} onVolumeChange={onVolumeChange} volume={volume} />
                    <DurationLabels currentTime={currentTime} durationTime={durationTime} />
                </div>

                <div className="bp-DashControls-group">
                    {/* CC Toggle */}
                    <MediaSettings
                        audioTrack={audioTrack}
                        audioTracks={audioTracks}
                        autoplay={autoplay}
                        badge={isPlayingHD ? <HDBadge /> : undefined}
                        className="bp-DashControls-settings"
                        onAudioTrackChange={onAudioTrackChange}
                        onAutoplayChange={onAutoplayChange}
                        onQualityChange={onQualityChange}
                        onRateChange={onRateChange}
                        quality={quality}
                        rate={rate}
                    />
                    <MediaFullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                </div>
            </div>
        </div>
    );
}
