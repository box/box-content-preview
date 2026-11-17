import React from 'react';
import Settings, { Menu } from '../settings';

export type Props = {
    onRateChange: (rate: string) => void;
    rate: string;
};

export const RATES = ['0.5', '1.0', '1.25', '1.5', '2.0'];

export const getLabel = (rate?: string): string => (rate === '1.0' || !rate ? __('media_speed_normal') : rate);

export default function MediaSettingsMenuRate({ rate, onRateChange }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: string): void => {
        setActiveMenu(Menu.MAIN);
        onRateChange(value);
    };

    return (
        <Settings.Menu name={Menu.RATE}>
            <Settings.MenuBack label={__('media_speed')} />
            {RATES.map(value => (
                <Settings.RadioItem
                    key={value}
                    isSelected={rate === value}
                    label={getLabel(value)}
                    onChange={handleChange}
                    value={value}
                />
            ))}
        </Settings.Menu>
    );
}
