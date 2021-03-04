import React from 'react';
import classNames from 'classnames';
import MediaSettingsMenu, { Menu, Ref as MediaSettingsMenuRef } from './MediaSettingsMenu';
import MediaSettingsMenuItem from './MediaSettingsMenuItem';

export type Props = {
    autoplay: boolean;
    className?: string;
    isActive: boolean;
    onMenuChange: (menu: Menu) => void;
    rate: string;
};

export type Ref = MediaSettingsMenuRef;

function MP3SettingsMenu(props: Props, ref: React.Ref<Ref>): JSX.Element {
    const { autoplay, className, isActive, onMenuChange, rate } = props;
    const autoplayValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' ? __('media_speed_normal') : rate;

    return (
        <MediaSettingsMenu ref={ref} className={classNames('bp-MP3SettingsMenu', className)} isActive={isActive}>
            <MediaSettingsMenuItem
                data-testid="bp-MP3SettingsMenu-autoplay"
                label={__('media_autoplay')}
                onClick={(): void => onMenuChange(Menu.AUTOPLAY)}
                value={autoplayValue}
            />
            <MediaSettingsMenuItem
                data-testid="bp-MP3SettingsMenu-rate"
                label={__('media_speed')}
                onClick={(): void => onMenuChange(Menu.SPEED)}
                value={rateValue}
            />
        </MediaSettingsMenu>
    );
}

export default React.forwardRef(MP3SettingsMenu);
