import React from 'react';
import Settings, { Menu } from '../controls/settings';
import SettingsAutoplay, { Props as AutoplayProps } from '../controls/settings/SettingsAutoplay';
import SettingsRate, { Props as RateProps } from '../controls/settings/SettingsRate';

export type Props = AutoplayProps & RateProps;

export default function MP3Settings({ autoplay, onAutoplayChange, onRateChange, rate }: Props): JSX.Element {
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;

    return (
        <Settings className="bp-MP3Settings">
            <Settings.Menu name={Menu.MAIN}>
                <Settings.MenuItem label={__('media_autoplay')} target={Menu.AUTOPLAY} value={autoValue} />
                <Settings.MenuItem label={__('media_speed')} target={Menu.RATE} value={rateValue} />
            </Settings.Menu>

            <SettingsAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <SettingsRate onRateChange={onRateChange} rate={rate} />
        </Settings>
    );
}
