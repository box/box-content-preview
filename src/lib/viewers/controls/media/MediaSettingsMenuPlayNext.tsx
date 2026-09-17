import React from 'react';
import Settings, { Menu } from '../settings';

export type Props = {
    onPlayNextChange: (playNext: boolean) => void;
    playNext: boolean;
};

export default function MediaSettingsMenuPlayNext({ playNext, onPlayNextChange }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: boolean): void => {
        setActiveMenu(Menu.MAIN);
        onPlayNextChange(value);
    };

    return (
        <Settings.Menu name={Menu.PLAY_NEXT}>
            <Settings.MenuBack label={__('media_play_next')} />
            <Settings.RadioItem
                isSelected={!playNext}
                label={__('media_play_next_disabled')}
                onChange={handleChange}
                value={false}
            />
            <Settings.RadioItem
                isSelected={playNext}
                label={__('media_play_next_enabled')}
                onChange={handleChange}
                value
            />
        </Settings.Menu>
    );
}
