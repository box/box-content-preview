import React from 'react';
import classNames from 'classnames';
import MediaSettingsMenu, { Menu, Props as MediaSettingsMenuProps } from './MediaSettingsMenu';
import MediaSettingsMenuItem from './MediaSettingsMenuItem';
import { AutoplayOption } from './MP3SettingsFlyout';

export type Props = MediaSettingsMenuProps & {
    autoplay?: string;
    onMenuChange: (menu: Menu) => void;
    rate?: string;
};

export default function SettingsMenuMain({ autoplay, className, isActive, onMenuChange, rate }: Props): JSX.Element {
    // Default values
    let autoplayValue = __('media_autoplay_disabled');
    let rateValue = __('media_speed_normal');

    if (autoplay === AutoplayOption.ENABLED) {
        autoplayValue = __('media_autoplay_enabled');
    }

    if (rate && rate !== '1.0') {
        rateValue = rate;
    }

    return (
        <MediaSettingsMenu className={classNames('bp-MP3SettingsMenu', className)} isActive={isActive}>
            <MediaSettingsMenuItem
                label={__('media_autoplay')}
                onClick={(): void => onMenuChange(Menu.AUTOPLAY)}
                value={autoplayValue}
            />
            <MediaSettingsMenuItem
                label={__('media_speed')}
                onClick={(): void => onMenuChange(Menu.SPEED)}
                value={rateValue}
            />
        </MediaSettingsMenu>
    );
}
