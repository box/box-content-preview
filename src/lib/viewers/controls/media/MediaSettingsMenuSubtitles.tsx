import React from 'react';
import Settings, { Menu } from '../settings';
import { SUBTITLES_OFF } from '../../../constants';

export type Subtitle = {
    displayLanguage: string;
    id: number;
};

export type Props = {
    onSubtitleChange?: (id: number) => void;
    subtitle?: number;
    subtitles?: Array<Subtitle>;
};

export const getDisplayLanguage = (subtitle?: number, subtitles: Array<Subtitle> = []): string => {
    const { displayLanguage } = subtitles.find(({ id }) => subtitle === id) || {
        displayLanguage: __('off'),
    };

    return displayLanguage;
};

export default function MediaSettingsMenuSubtitles({
    onSubtitleChange,
    subtitle,
    subtitles = [],
}: Props): JSX.Element | null {
    const { setActiveMenu } = React.useContext(Settings.Context);

    if (!subtitles.length || !onSubtitleChange) {
        return null;
    }

    const handleChange = (value: number): void => {
        setActiveMenu(Menu.MAIN);
        onSubtitleChange(value);
    };

    return (
        <Settings.Menu name={Menu.SUBTITLES}>
            <Settings.MenuBack label={`${__('subtitles')}/CC`} />
            <Settings.RadioItem
                isSelected={subtitle === SUBTITLES_OFF}
                label={__('off')}
                onChange={handleChange}
                value={SUBTITLES_OFF}
            />
            {subtitles.map(({ displayLanguage, id }) => (
                <Settings.RadioItem
                    key={id}
                    isSelected={subtitle === id}
                    label={displayLanguage}
                    onChange={handleChange}
                    value={id}
                />
            ))}
        </Settings.Menu>
    );
}
