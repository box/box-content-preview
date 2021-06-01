import React from 'react';
import noop from 'lodash/noop';
import getLanguageName from '../../../lang';
import MediaSettingsMenuAudioTracks, { AudioTrack, Props as AudioTracksProps } from './MediaSettingsAudioTracks';
import MediaSettingsMenuAutoplay, { Props as AutoplayProps } from './MediaSettingsMenuAutoplay';
import MediaSettingsMenuQuality, { Props as QualityProps } from './MediaSettingsMenuQuality';
import MediaSettingsMenuRate, { Props as RateProps } from './MediaSettingsMenuRate';
import Settings, { Menu, Props as SettingsProps } from '../settings';

export type Props = Partial<AudioTracksProps> &
    Partial<QualityProps> &
    Partial<SettingsProps> &
    AutoplayProps &
    RateProps & { className?: string; showQuality?: boolean };

const generateAudioTrackLabel = (language: string, index: number): string => {
    let label = `${__('track')} ${index + 1}`;
    if (language !== 'und') {
        label = `${label} (${getLanguageName(language) || language})`;
    }

    return label;
};

const addLabels = (audioTracks: Array<AudioTrack>): Array<AudioTrack> =>
    audioTracks.map((track, index) => {
        const { language } = track;
        const label = generateAudioTrackLabel(language, index);
        return {
            ...track,
            label,
        };
    });

const QUALITY_LABEL_MAP: Record<string, string> = {
    auto: __('media_quality_auto'),
    hd: '1080p',
    sd: '480p',
};

export default function MediaSettings({
    audioTrack,
    audioTracks = [],
    autoplay,
    className,
    onAudioTrackChange = noop,
    onAutoplayChange,
    onQualityChange,
    onRateChange,
    quality,
    rate,
    showQuality = false,
    toggle,
}: Props): JSX.Element {
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;
    const labelledAudioTracks = React.useMemo(() => addLabels(audioTracks), [audioTracks]);
    const hydratedSelectedAudioTrack = labelledAudioTracks.find(({ id }) => audioTrack === id);
    const audioTrackLabel = hydratedSelectedAudioTrack ? hydratedSelectedAudioTrack.label : '';
    const showAudioTrackItems = audioTracks.length > 1;

    return (
        <Settings className={className} toggle={toggle}>
            <Settings.Menu name={Menu.MAIN}>
                <Settings.MenuItem label={__('media_autoplay')} target={Menu.AUTOPLAY} value={autoValue} />
                <Settings.MenuItem label={__('media_speed')} target={Menu.RATE} value={rateValue} />
                {showQuality && quality && (
                    <Settings.MenuItem
                        label={__('media_quality')}
                        target={Menu.QUALITY}
                        value={QUALITY_LABEL_MAP[quality]}
                    />
                )}
                {showAudioTrackItems && (
                    <Settings.MenuItem label={__('media_audio')} target={Menu.AUDIO} value={audioTrackLabel} />
                )}
            </Settings.Menu>

            <MediaSettingsMenuAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <MediaSettingsMenuRate onRateChange={onRateChange} rate={rate} />
            {showQuality && <MediaSettingsMenuQuality onQualityChange={onQualityChange} quality={quality} />}
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
