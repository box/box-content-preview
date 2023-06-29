import React from 'react';
import getLanguageName from '../../../lang';
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

export const generateAudioTrackLabel = (language: string, index: number): string => {
    let label = `${__('track')} ${index + 1}`;
    if (language !== 'und') {
        label = `${label} (${getLanguageName(language) || language})`;
    }

    return label;
};

export const addLabels = (audioTracks: Array<AudioTrack>): Array<AudioTrack> =>
    audioTracks.map((track, index) => {
        const { language } = track;
        const label = generateAudioTrackLabel(language, index);
        return {
            ...track,
            label,
        };
    });

export default function MediaSettingsMenuAudioTracks({
    audioTrack,
    audioTracks,
    onAudioTrackChange,
}: Props): JSX.Element | null {
    const { setActiveMenu } = React.useContext(Settings.Context);

    if (audioTracks.length <= 1) {
        return null;
    }

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
