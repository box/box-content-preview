import React from 'react';
import noop from 'lodash/noop';
import Settings, { Menu } from '../settings';

export type Props = {
    onQualityChange: (quality: Quality) => void;
    quality: Quality;
};

export enum Quality {
    AUTO = 'auto',
    HD = 'hd',
    SD = 'sd',
}

const QUALITY_LABEL_MAP: Record<Quality, string> = {
    [Quality.AUTO]: __('media_quality_auto') as string,
    [Quality.HD]: '1080p',
    [Quality.SD]: '480p',
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
