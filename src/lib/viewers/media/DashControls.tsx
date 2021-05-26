import React from 'react';
import DurationLabels, { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
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
    VolumeControlsProps;

export default function DashControls({
    autoplay,
    bufferedRange,
    currentTime,
    durationTime,
    isPlaying,
    onAutoplayChange,
    onFullscreenToggle,
    onMuteChange,
    onPlayPause,
    onRateChange,
    onTimeChange,
    onVolumeChange,
    rate,
    volume,
}: Props): JSX.Element {
    return (
        <div className="bp-DashControls">
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
                        autoplay={autoplay}
                        className="bp-DashControls-settings"
                        onAutoplayChange={onAutoplayChange}
                        onRateChange={onRateChange}
                        rate={rate}
                    />
                    <MediaFullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                </div>
            </div>
        </div>
    );
}
