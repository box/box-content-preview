import React from 'react';
import MP3SettingsMenu from './MP3SettingsMenu';
import MediaSettingsFlyout from './MediaSettingsFlyout';
import { Menu } from './MediaSettingsMenu';

export enum AutoplayOption {
    ENABLED = 'Enabled',
    DISABLED = 'Disabled',
}

export type Props = {
    autoplay: AutoplayOption;
    onAutoplayChange: (autoplay: AutoplayOption) => void;
    onRateChange: (rate: string) => void;
    rate: string;
};

const CLASS_MP3_SETTINGS_MENU = 'bp-MP3SettingsFlyout-menu';
const CLASS_MP3_SETTINGS_MENU_AUTOPLAY = 'bp-MP3SettingsFlyout-menu-autoplay';
const CLASS_MP3_SETTINGS_MENU_SPEED = 'bp-MP3SettingsFlyout-menu-speed';

const menuSelectors = {
    [Menu.MAIN]: `.${CLASS_MP3_SETTINGS_MENU}`,
    [Menu.AUTOPLAY]: `.${CLASS_MP3_SETTINGS_MENU_AUTOPLAY}`,
    [Menu.SPEED]: `.${CLASS_MP3_SETTINGS_MENU_SPEED}`,
};

export default function MP3SettingsFlyout({ autoplay, rate }: Props): JSX.Element {
    const [menu, setMenu] = React.useState<Menu>(Menu.MAIN);

    const handleMenuChange = (nextMenu: Menu): void => {
        setMenu(nextMenu);
    };

    return (
        <MediaSettingsFlyout className="bp-MP3SettingsFlyout" menu={menu} menuSelectors={menuSelectors}>
            <MP3SettingsMenu
                autoplay={autoplay}
                className={CLASS_MP3_SETTINGS_MENU}
                isActive={menu === Menu.MAIN}
                onMenuChange={handleMenuChange}
                rate={rate}
            />
            {/* <MediaSettingsMenuAutoplay
                autoplay={autoplay}
                className={CLASS_MP3_SETTINGS_MENU_AUTOPLAY}
                isActive={menu === Menu.AUTOPLAY}
                onAutoplayChange={onAutoplayChange}
                onReturn={handleReturn}
            />
            <MediaSettingsMenuSpeed
                className={CLASS_MP3_SETTINGS_MENU_SPEED}
                isActive={menu === Menu.SPEED}
                onRateChange={onRateChange}
                onReturn={handleReturn}
                rate={rate}
            /> */}
        </MediaSettingsFlyout>
    );
}
