import React from 'react';
import classNames from 'classnames';
import MediaSettingsMenu, {
    Menu,
    Props as MediaSettingsMenuProps,
    Ref as MediaSettingsMenuRef,
} from './MediaSettingsMenu';
import MediaSettingsMenuItem from './MediaSettingsMenuItem';

export type Props = MediaSettingsMenuProps & {
    autoplay: boolean;
    onMenuChange: (menu: Menu) => void;
    rate: string;
};

export type Ref = MediaSettingsMenuRef;

function MP3SettingsMenu(
    { autoplay, className, isActive, onMenuChange, rate }: Props,
    ref: React.Ref<Ref>,
): JSX.Element {
    const autoplayValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' ? __('media_speed_normal') : rate;

    return (
        <MediaSettingsMenu ref={ref} className={classNames('bp-MP3SettingsMenu', className)} isActive={isActive}>
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

export default React.forwardRef(MP3SettingsMenu);
