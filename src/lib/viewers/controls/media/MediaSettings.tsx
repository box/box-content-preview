import React from 'react';
import noop from 'lodash/noop';
import MediaSettingsMenuAudioTracks, { addLabels, Props as AudioTracksProps } from './MediaSettingsAudioTracks';
import MediaSettingsMenuAutoplay, { Props as AutoplayProps } from './MediaSettingsMenuAutoplay';
import MediaSettingsMenuQuality, {
    getLabel as getQualityLabel,
    Props as QualityProps,
} from './MediaSettingsMenuQuality';
import MediaSettingsMenuRate, { Props as RateProps } from './MediaSettingsMenuRate';
import MediaSettingsMenuSubtitles, { getDisplayLanguage, Props as SubtitlesProps } from './MediaSettingsMenuSubtitles';
import Settings, { Menu, Props as SettingsProps } from '../settings';

export type Props = Partial<AudioTracksProps> &
    Partial<QualityProps> &
    Partial<SettingsProps> &
    Partial<SubtitlesProps> &
    AutoplayProps &
    RateProps & { className?: string; isHDSupported?: boolean };

export default function MediaSettings({
    audioTrack,
    audioTracks = [],
    autoplay,
    badge,
    className,
    isHDSupported,
    onAudioTrackChange = noop,
    onAutoplayChange,
    onQualityChange,
    onRateChange,
    onSubtitleChange,
    quality,
    rate,
    subtitle,
    subtitles = [],
    toggle,
}: Props): JSX.Element {
    const subtitleDisplayLanguage = getDisplayLanguage(subtitle, subtitles);
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;
    const labelledAudioTracks = React.useMemo(() => addLabels(audioTracks), [audioTracks]);
    const hydratedSelectedAudioTrack = labelledAudioTracks.find(({ id }) => audioTrack === id);
    const audioTrackLabel = hydratedSelectedAudioTrack ? hydratedSelectedAudioTrack.label : '';
    const showAudioTrackItems = audioTracks.length > 1;
    const showSubtitles = subtitles.length > 0 && onSubtitleChange;

    return (
        <Settings badge={badge} className={className} toggle={toggle}>
            <Settings.Menu name={Menu.MAIN}>
                <Settings.MenuItem
                    data-testid="bp-media-settings-autoplay"
                    label={__('media_autoplay')}
                    target={Menu.AUTOPLAY}
                    value={autoValue}
                />
                <Settings.MenuItem
                    data-testid="bp-media-settings-speed"
                    label={__('media_speed')}
                    target={Menu.RATE}
                    value={rateValue}
                />
                {quality && (
                    <Settings.MenuItem
                        data-testid="bp-media-settings-quality"
                        isDisabled={!isHDSupported}
                        label={__('media_quality')}
                        target={Menu.QUALITY}
                        value={getQualityLabel(quality)}
                    />
                )}
                {showSubtitles && (
                    <Settings.MenuItem
                        data-testid="bp-media-settings-subtitles"
                        label={`${__('subtitles')}/CC`}
                        target={Menu.SUBTITLES}
                        value={subtitleDisplayLanguage}
                    />
                )}
                {showAudioTrackItems && (
                    <Settings.MenuItem
                        data-testid="bp-media-settings-audiotracks"
                        label={__('media_audio')}
                        target={Menu.AUDIO}
                        value={audioTrackLabel}
                    />
                )}
            </Settings.Menu>

            <MediaSettingsMenuAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <MediaSettingsMenuRate onRateChange={onRateChange} rate={rate} />
            <MediaSettingsMenuQuality onQualityChange={onQualityChange} quality={quality} />
            <MediaSettingsMenuSubtitles onSubtitleChange={onSubtitleChange} subtitle={subtitle} subtitles={subtitles} />
            <MediaSettingsMenuAudioTracks
                audioTrack={audioTrack}
                audioTracks={labelledAudioTracks}
                onAudioTrackChange={onAudioTrackChange}
            />
        </Settings>
    );
}
