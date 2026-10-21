import React from 'react';
import Settings, { Menu } from '../settings';

export enum Quality {
    AUTO = 'auto',
    HD = 'hd',
    SD = 'sd',
}

export type Props = {
    onQualityChange?: (quality: Quality) => void;
    quality?: Quality;
};

const getQualityLabelMap = (): Record<Quality, string> => ({
    [Quality.AUTO]: __('media_quality_auto') as string,
    [Quality.HD]: '1080p',
    [Quality.SD]: '480p',
});

export const QUALITIES = [Quality.SD, Quality.HD, Quality.AUTO];

export const getLabel = (quality: Quality): string => getQualityLabelMap()[quality];

export default function MediaSettingsMenuQuality({ onQualityChange, quality }: Props): JSX.Element | null {
    const { setActiveMenu } = React.useContext(Settings.Context);

    if (!quality || !onQualityChange) {
        return null;
    }

    const handleChange = (value: Quality): void => {
        setActiveMenu(Menu.MAIN);
        onQualityChange(value);
    };

    return (
        <Settings.Menu name={Menu.QUALITY}>
            <Settings.MenuBack label={__('media_quality')} />
            {QUALITIES.map(value => (
                <Settings.RadioItem<Quality>
                    key={value}
                    isSelected={quality === value}
                    label={getLabel(value)}
                    onChange={handleChange}
                    value={value}
                />
            ))}
        </Settings.Menu>
    );
}
