import React from 'react';
import noop from 'lodash/noop';
import MediaSettingsMenuAudioTracks, { addLabels, Props as AudioTracksProps } from './MediaSettingsAudioTracks';
import MediaSettingsMenuAutoplay, { Props as AutoplayProps } from './MediaSettingsMenuAutoplay';
import MediaSettingsMenuQuality, {
    getLabel as getQualityLabel,
    Props as QualityProps,
} from './MediaSettingsMenuQuality';
import MediaSettingsMenuRate, { Props as RateProps } from './MediaSettingsMenuRate';
import Settings, { Menu, Props as SettingsProps } from '../settings';

export type Props = Partial<AudioTracksProps> &
    Partial<QualityProps> &
    Partial<SettingsProps> &
    AutoplayProps &
    RateProps & { className?: string };

export default function MediaSettings({
    audioTrack,
    audioTracks = [],
    autoplay,
    badge,
    className,
    onAudioTrackChange = noop,
    onAutoplayChange,
    onQualityChange,
    onRateChange,
    quality,
    rate,
    toggle,
}: Props): JSX.Element {
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;
    const labelledAudioTracks = React.useMemo(() => addLabels(audioTracks), [audioTracks]);
    const hydratedSelectedAudioTrack = labelledAudioTracks.find(({ id }) => audioTrack === id);
    const audioTrackLabel = hydratedSelectedAudioTrack ? hydratedSelectedAudioTrack.label : '';
    const showAudioTrackItems = audioTracks.length > 1;

    return (
        <Settings badge={badge} className={className} toggle={toggle}>
            <Settings.Menu name={Menu.MAIN}>
                <Settings.MenuItem label={__('media_autoplay')} target={Menu.AUTOPLAY} value={autoValue} />
                <Settings.MenuItem label={__('media_speed')} target={Menu.RATE} value={rateValue} />
                {quality && (
                    <Settings.MenuItem
                        label={__('media_quality')}
                        target={Menu.QUALITY}
                        value={getQualityLabel(quality)}
                    />
                )}
                {showAudioTrackItems && (
                    <Settings.MenuItem label={__('media_audio')} target={Menu.AUDIO} value={audioTrackLabel} />
                )}
            </Settings.Menu>

            <MediaSettingsMenuAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <MediaSettingsMenuRate onRateChange={onRateChange} rate={rate} />
            {quality && onQualityChange && (
                <MediaSettingsMenuQuality onQualityChange={onQualityChange} quality={quality} />
            )}
            {showAudioTrackItems && (
                <MediaSettingsMenuAudioTracks
                    audioTrack={audioTrack}
                    audioTracks={labelledAudioTracks}
                    onAudioTrackChange={onAudioTrackChange}
                />
            )}
        </Settings>
    );
}
