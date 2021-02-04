import React from 'react';
import DurationLabels, { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import SettingsControls from '../controls/media/SettingsControls';
import TimeControls, { Props as TimeControlsProps } from '../controls/media/TimeControls';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import './MP3Controls.scss';

export type Props = DurationLabelsProps & PlayControlsProps & TimeControlsProps & VolumeControlsProps;

export default function MP3Controls({
    bufferedRange,
    currentTime,
    durationTime,
    isPlaying,
    onMuteChange,
    onPlayPause,
    onTimeChange,
    onVolumeChange,
    volume,
}: Props): JSX.Element {
    return (
        <div className="bp-MP3Controls">
            <TimeControls
                bufferedRange={bufferedRange}
                currentTime={currentTime}
                durationTime={durationTime}
                onTimeChange={onTimeChange}
            />

            <div className="bp-MP3Controls-bar">
                <div className="bp-MP3Controls-group">
                    <PlayPauseToggle isPlaying={isPlaying} onPlayPause={onPlayPause} />
                    <VolumeControls onMuteChange={onMuteChange} onVolumeChange={onVolumeChange} volume={volume} />
                    <DurationLabels currentTime={currentTime} durationTime={durationTime} />
                </div>

                <div className="bp-MP3Controls-group">
                    <SettingsControls />
                </div>
            </div>
        </div>
    );
}
