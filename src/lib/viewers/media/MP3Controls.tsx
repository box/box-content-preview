import React from 'react';
import { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import MediaSettings, { Props as MediaSettingsProps } from '../controls/media/MediaSettings';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import TimeControls, { Props as TimeControlsProps } from '../controls/media/TimeControls';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import './MP3Controls.scss';

export type Props = DurationLabelsProps &
    MediaSettingsProps &
    PlayControlsProps &
    TimeControlsProps &
    VolumeControlsProps;

export default function MP3Controls({
    autoplay,
    bufferedRange,
    currentTime,
    durationTime,
    isPlaying,
    movePlayback,
    onAutoplayChange,
    onMuteChange,
    onPlayPause,
    onRateChange,
    onTimeChange,
    onVolumeChange,
    rate,
    volume,
}: Props): JSX.Element {
    return (
        <div className="bp-MP3Controls" data-testid="media-controls-wrapper">
            <TimeControls
                bufferedRange={bufferedRange}
                currentTime={currentTime}
                durationTime={durationTime}
                onTimeChange={onTimeChange}
            />

            <div className="bp-MP3Controls-bar">
                <div className="bp-MP3Controls-group">
                    <PlayPauseToggle isPlaying={isPlaying} movePlayback={movePlayback} onPlayPause={onPlayPause} />
                    <VolumeControls onMuteChange={onMuteChange} onVolumeChange={onVolumeChange} volume={volume} />
                </div>

                <div className="bp-MP3Controls-group">
                    <MediaSettings
                        autoplay={autoplay}
                        className="bp-MP3Controls-settings"
                        onAutoplayChange={onAutoplayChange}
                        onRateChange={onRateChange}
                        rate={rate}
                    />
                </div>
            </div>
        </div>
    );
}
