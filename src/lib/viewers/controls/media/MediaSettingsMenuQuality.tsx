import React from 'react';
import noop from 'lodash/noop';
import Settings, { Menu } from '../settings';

export type Props = {
    onQualityChange?: (quality: string) => void;
    quality?: string;
};

export default function MediaSettingsMenuQuality({ onQualityChange = noop, quality }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: string): void => {
        setActiveMenu(Menu.MAIN);
        onQualityChange(value);
    };

    return (
        <Settings.Menu name={Menu.QUALITY}>
            <Settings.MenuBack label={__('media_quality')} />
            <Settings.RadioItem isSelected={quality === 'sd'} label="480p" onChange={handleChange} value="sd" />
            <Settings.RadioItem isSelected={quality === 'hd'} label="1080p" onChange={handleChange} value="hd" />
            <Settings.RadioItem
                isSelected={quality === 'auto'}
                label={__('media_quality_auto')}
                onChange={handleChange}
                value="auto"
            />
        </Settings.Menu>
    );
}
