import React from 'react';
import Settings, { Menu } from '../settings';

export type Props = {
    autoplay: boolean;
    onAutoplayChange: (autoplay: boolean) => void;
};

export default function MediaSettingsMenuAutoplay({ autoplay, onAutoplayChange }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: boolean): void => {
        setActiveMenu(Menu.MAIN);
        onAutoplayChange(value);
    };

    return (
        <Settings.Menu name={Menu.AUTOPLAY}>
            <Settings.MenuBack label={__('media_autoplay')} />
            <Settings.RadioItem
                isSelected={!autoplay}
                label={__('media_autoplay_disabled')}
                onChange={handleChange}
                value={false}
            />
            <Settings.RadioItem
                isSelected={autoplay}
                label={__('media_autoplay_enabled')}
                onChange={handleChange}
                value
            />
        </Settings.Menu>
    );
}
