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

const QUALITY_LABEL_MAP: Record<Quality, string> = {
    [Quality.AUTO]: __('media_quality_auto') as string,
    [Quality.HD]: '1080p',
    [Quality.SD]: '480p',
};

export const getLabel = (quality: Quality): string => QUALITY_LABEL_MAP[quality];

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
            <Settings.RadioItem<Quality>
                isSelected={quality === Quality.SD}
                label="480p"
                onChange={handleChange}
                value={Quality.SD}
            />
            <Settings.RadioItem<Quality>
                isSelected={quality === Quality.HD}
                label="1080p"
                onChange={handleChange}
                value={Quality.HD}
            />
            <Settings.RadioItem<Quality>
                isSelected={quality === Quality.AUTO}
                label={__('media_quality_auto')}
                onChange={handleChange}
                value={Quality.AUTO}
            />
        </Settings.Menu>
    );
}
