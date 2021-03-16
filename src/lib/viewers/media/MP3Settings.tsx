import React from 'react';
import MediaSettings, { Menu } from '../controls/media/MediaSettings';
import MediaSettingsAutoplay, { Props as AutoplayProps } from '../controls/media/MediaSettings/MediaSettingsAutoplay';
import MediaSettingsRate, { Props as RateProps } from '../controls/media/MediaSettings/MediaSettingsRate';

export type Props = AutoplayProps & RateProps;

export default function MP3Settings({ autoplay, onAutoplayChange, onRateChange, rate }: Props): JSX.Element {
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;

    return (
        <MediaSettings className="bp-MP3Settings">
            <MediaSettings.Menu name={Menu.MAIN}>
                <MediaSettings.MenuItem label={__('media_autoplay')} target={Menu.AUTOPLAY} value={autoValue} />
                <MediaSettings.MenuItem label={__('media_speed')} target={Menu.RATE} value={rateValue} />
            </MediaSettings.Menu>

            <MediaSettingsAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <MediaSettingsRate onRateChange={onRateChange} rate={rate} />
        </MediaSettings>
    );
}
