import React from 'react';
import Settings, { Menu } from '../settings';

export type AudioTrack = {
    id: number;
    label: string;
    language: string;
    role: string;
};

export type Props = {
    audioTrack?: number;
    audioTracks: Array<AudioTrack>;
    onAudioTrackChange: (id: number) => void;
};

export default function MediaSettingsMenuAudioTracks({
    audioTrack,
    audioTracks,
    onAudioTrackChange,
}: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: number): void => {
        setActiveMenu(Menu.MAIN);
        onAudioTrackChange(value);
    };

    return (
        <Settings.Menu name={Menu.AUDIO}>
            <Settings.MenuBack label={__('media_audio')} />
            {audioTracks.map(({ id, label }) => (
                <Settings.RadioItem
                    key={id}
                    isSelected={audioTrack === id}
                    label={label}
                    onChange={handleChange}
                    value={id}
                />
            ))}
        </Settings.Menu>
    );
}
