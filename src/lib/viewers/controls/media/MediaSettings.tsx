import React from 'react';
import MediaSettingsMenuAutoplay, { Props as AutoplayProps } from './MediaSettingsMenuAutoplay';
import MediaSettingsMenuRate, { Props as RateProps } from './MediaSettingsMenuRate';
import Settings, { Menu } from '../settings';

export type Props = AutoplayProps & RateProps & { className?: string };

export default function MediaSettings({
    autoplay,
    className,
    onAutoplayChange,
    onRateChange,
    rate,
}: Props): JSX.Element {
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;

    return (
        <Settings className={className}>
            <Settings.Menu name={Menu.MAIN}>
                <Settings.MenuItem label={__('media_autoplay')} target={Menu.AUTOPLAY} value={autoValue} />
                <Settings.MenuItem label={__('media_speed')} target={Menu.RATE} value={rateValue} />
            </Settings.Menu>

            <MediaSettingsMenuAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <MediaSettingsMenuRate onRateChange={onRateChange} rate={rate} />
        </Settings>
    );
}
