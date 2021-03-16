import React from 'react';
import DurationLabels, { Props as DurationLabelsProps } from '../controls/media/DurationLabels';
import MP3Settings, { Props as MP3SettingsProps } from './MP3Settings';
import PlayPauseToggle, { Props as PlayControlsProps } from '../controls/media/PlayPauseToggle';
import TimeControls, { Props as TimeControlsProps } from '../controls/media/TimeControls';
import VolumeControls, { Props as VolumeControlsProps } from '../controls/media/VolumeControls';
import './MP3Controls.scss';

export type Props = DurationLabelsProps &
    MP3SettingsProps &
    PlayControlsProps &
    TimeControlsProps &
    VolumeControlsProps;

export default function MP3Controls({
    autoplay,
    bufferedRange,
    currentTime,
    durationTime,
    isPlaying,
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
                    <MP3Settings
                        autoplay={autoplay}
                        onAutoplayChange={onAutoplayChange}
                        onRateChange={onRateChange}
                        rate={rate}
                    />
                </div>
            </div>
        </div>
    );
}
