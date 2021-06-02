import React from 'react';
import noop from 'lodash/noop';
import Settings, { Menu } from '../settings';

export type Props = {
    onQualityChange: (quality: Quality) => void;
    quality: Quality;
};

export enum Quality {
    auto = 'auto',
    hd = 'hd',
    sd = 'sd',
}

const QUALITY_LABEL_MAP: Record<Quality, string> = {
    [Quality.auto]: __('media_quality_auto') as string,
    [Quality.hd]: '1080p',
    [Quality.sd]: '480p',
};

export const getLabel = (quality: Quality): string => QUALITY_LABEL_MAP[quality];

export default function MediaSettingsMenuQuality({ onQualityChange = noop, quality }: Props): JSX.Element {
    const { setActiveMenu } = React.useContext(Settings.Context);

    const handleChange = (value: Quality): void => {
        setActiveMenu(Menu.MAIN);
        onQualityChange(value);
    };

    return (
        <Settings.Menu name={Menu.QUALITY}>
            <Settings.MenuBack label={__('media_quality')} />
            <Settings.RadioItem<Quality>
                isSelected={quality === 'sd'}
                label="480p"
                onChange={handleChange}
                value={Quality.sd}
            />
            <Settings.RadioItem<Quality>
                isSelected={quality === 'hd'}
                label="1080p"
                onChange={handleChange}
                value={Quality.hd}
            />
            <Settings.RadioItem<Quality>
                isSelected={quality === 'auto'}
                label={__('media_quality_auto')}
                onChange={handleChange}
                value={Quality.auto}
            />
        </Settings.Menu>
    );
}
