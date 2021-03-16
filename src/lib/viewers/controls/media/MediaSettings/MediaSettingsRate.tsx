import React from 'react';
import MediaSettings, { Menu } from '.';

export type Props = {
    onRateChange: (rate: string) => void;
    rate: string;
};

export default function MediaSettingsMenuRate({ rate, onRateChange }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(MediaSettings.Context);

    const handleChange = (value: string): void => {
        setActiveMenu(Menu.MAIN);
        onRateChange(value);
    };

    return (
        <MediaSettings.Menu name={Menu.RATE}>
            <MediaSettings.MenuBack label={__('media_speed')} />
            <MediaSettings.RadioItem isSelected={rate === '0.5'} onChange={handleChange} value="0.5" />
            <MediaSettings.RadioItem
                isSelected={rate === '1.0'}
                label={__('media_speed_normal')}
                onChange={handleChange}
                value="1.0"
            />
            <MediaSettings.RadioItem isSelected={rate === '1.25'} onChange={handleChange} value="1.25" />
            <MediaSettings.RadioItem isSelected={rate === '1.5'} onChange={handleChange} value="1.5" />
            <MediaSettings.RadioItem isSelected={rate === '2.0'} onChange={handleChange} value="2.0" />
        </MediaSettings.Menu>
    );
}
