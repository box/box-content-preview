import React from 'react';
import noop from 'lodash/noop';
import getLanguageName from '../../../lang';
import MediaSettingsMenuAudioTracks, { AudioTrack, Props as AudioTracksProps } from './MediaSettingsAudioTracks';
import MediaSettingsMenuAutoplay, { Props as AutoplayProps } from './MediaSettingsMenuAutoplay';
import MediaSettingsMenuRate, { Props as RateProps } from './MediaSettingsMenuRate';
import Settings, { Menu } from '../settings';

export type Props = Partial<AudioTracksProps> & AutoplayProps & RateProps & { className?: string };

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

export default function MediaSettings({
    audioTrack,
    audioTracks = [],
    autoplay,
    className,
    onAudioTrackChange = noop,
    onAutoplayChange,
    onRateChange,
    rate,
}: Props): JSX.Element {
    const autoValue = autoplay ? __('media_autoplay_enabled') : __('media_autoplay_disabled');
    const rateValue = rate === '1.0' || !rate ? __('media_speed_normal') : rate;
    const labelledAudioTracks = React.useMemo(() => addLabels(audioTracks), [audioTracks]);
    const hydratedSelectedAudioTrack = labelledAudioTracks.find(({ id }) => audioTrack === id);
    const audioTrackLabel = hydratedSelectedAudioTrack ? hydratedSelectedAudioTrack.label : '';
    const showAudioTrackItems = audioTracks.length > 1;

    return (
        <Settings className={className}>
            <Settings.Menu name={Menu.MAIN}>
                <Settings.MenuItem label={__('media_autoplay')} target={Menu.AUTOPLAY} value={autoValue} />
                <Settings.MenuItem label={__('media_speed')} target={Menu.RATE} value={rateValue} />
                {showAudioTrackItems && (
                    <Settings.MenuItem label={__('media_audio')} target={Menu.AUDIO} value={audioTrackLabel} />
                )}
            </Settings.Menu>

            <MediaSettingsMenuAutoplay autoplay={autoplay} onAutoplayChange={onAutoplayChange} />
            <MediaSettingsMenuRate onRateChange={onRateChange} rate={rate} />
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
