import React from 'react';
import noop from 'lodash/noop';
import MediaSettingsMenuAudioTracks, { Props as AudioTracksProps } from './MediaSettingsAudioTracks';
import MediaSettingsMenuAutoplay, { Props as AutoplayProps } from './MediaSettingsMenuAutoplay';
import MediaSettingsMenuRate, { Props as RateProps } from './MediaSettingsMenuRate';
import Settings, { Menu } from '../settings';

export type Props = Partial<AudioTracksProps> & AutoplayProps & RateProps & { className?: string };

export default function MediaSettings({
    autoplay,
    className,
    audioTracks = [],
    onAudioTrackChange = noop,
    onAutoplayChange,
    onRateChange,
    rate,
    selectedAudioTrack,
}: Props): JSX.Element {
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;
    const hydratedSelectedAudioTrack = audioTracks.find(({ id }) => selectedAudioTrack === id);
    const selectedAudioTrackLabel = hydratedSelectedAudioTrack ? hydratedSelectedAudioTrack.label : '';
    const showAudioTrackItems = audioTracks.length > 1;

    return (
        <Settings className={className}>
            <Settings.Menu name={Menu.MAIN}>
                <Settings.MenuItem label={__('media_autoplay')} target={Menu.AUTOPLAY} value={autoValue} />
                <Settings.MenuItem label={__('media_speed')} target={Menu.RATE} value={rateValue} />
                {showAudioTrackItems && (
                    <Settings.MenuItem label={__('media_audio')} target={Menu.AUDIO} value={selectedAudioTrackLabel} />
                )}
            </Settings.Menu>

            <MediaSettingsMenuAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <MediaSettingsMenuRate onRateChange={onRateChange} rate={rate} />
            {showAudioTrackItems && (
                <MediaSettingsMenuAudioTracks
                    audioTracks={audioTracks}
                    onAudioTrackChange={onAudioTrackChange}
                    selectedAudioTrack={selectedAudioTrack}
                />
            )}
        </Settings>
    );
}
