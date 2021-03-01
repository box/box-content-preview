import React from 'react';
import MediaSettingsFlyout from './MediaSettingsFlyout';
import MP3SettingsMenu from './MP3SettingsMenu';
import { Menu } from './MediaSettingsMenu';
import './MP3SettingsFlyout.scss';

export type Props = {
    autoplay: boolean;
    onAutoplayChange: (autoplay: boolean) => void;
    onRateChange: (rate: string) => void;
    rate: string;
};

export default function MP3SettingsFlyout({ autoplay, rate }: Props): JSX.Element {
    const [menu, setMenu] = React.useState<Menu>(Menu.MAIN);

    const handleMenuChange = (nextMenu: Menu): void => {
        setMenu(nextMenu);
    };

    return (
        <MediaSettingsFlyout className="bp-MP3SettingsFlyout" menu={menu}>
            <MP3SettingsMenu autoplay={autoplay} isActive onMenuChange={handleMenuChange} rate={rate} />
            {/* <MediaSettingsMenuAutoplay
                autoplay={autoplay}
                isActive={menu === Menu.AUTOPLAY}
                onAutoplayChange={onAutoplayChange}
                onReturn={handleReturn}
            />
            <MediaSettingsMenuSpeed
                isActive={menu === Menu.SPEED}
                onRateChange={onRateChange}
                onReturn={handleReturn}
                rate={rate}
            /> */}
        </MediaSettingsFlyout>
    );
}
