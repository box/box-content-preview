import React from 'react';
import Settings, { Menu } from '../settings';

export type Props = {
    onRateChange: (rate: string) => void;
    rate: string;
};

export default function MediaSettingsMenuRate({ rate, onRateChange }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: string): void => {
        setActiveMenu(Menu.MAIN);
        onRateChange(value);
    };

    return (
        <Settings.Menu name={Menu.RATE}>
            <Settings.MenuBack label={__('media_speed')} />
            <Settings.RadioItem isSelected={rate === '0.5'} onChange={handleChange} value="0.5" />
            <Settings.RadioItem
                isSelected={rate === '1.0'}
                label={__('media_speed_normal')}
                onChange={handleChange}
                value="1.0"
            />
            <Settings.RadioItem isSelected={rate === '1.25'} onChange={handleChange} value="1.25" />
            <Settings.RadioItem isSelected={rate === '1.5'} onChange={handleChange} value="1.5" />
            <Settings.RadioItem isSelected={rate === '2.0'} onChange={handleChange} value="2.0" />
        </Settings.Menu>
    );
}
