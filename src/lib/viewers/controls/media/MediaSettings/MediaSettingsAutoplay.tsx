import React from 'react';
import MediaSettings, { Menu } from '.';

export type Props = {
    autoplay: boolean;
    onAutoplayChange: (autoplay: boolean) => void;
};

export default function MediaSettingsMenuAutoplay({ autoplay, onAutoplayChange }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(MediaSettings.Context);

    const handleChange = (value: boolean): void => {
        setActiveMenu(Menu.MAIN);
        onAutoplayChange(value);
    };

    return (
        <MediaSettings.Menu name={Menu.AUTOPLAY}>
            <MediaSettings.MenuBack label={__('media_autoplay')} />
            <MediaSettings.RadioItem
                isSelected={!autoplay}
                label={__('media_autoplay_disabled')}
                onChange={handleChange}
                value={false}
            />
            <MediaSettings.RadioItem
                isSelected={autoplay}
                label={__('media_autoplay_enabled')}
                onChange={handleChange}
                value
            />
        </MediaSettings.Menu>
    );
}
