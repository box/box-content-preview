import React from 'react';
import classNames from 'classnames';
import IconVolumeMed24 from '../icons/IconVolumeMed24';
import IconVolumeMute24 from '../icons/IconVolumeMute24';
import IconVolumeNone24 from '../icons/IconVolumeNone24';
import IconVolumeMuted24 from '../icons/IconVolumeMuted24';
import MediaToggle from './MediaToggle';
import useAttention from '../hooks/useAttention';
import './VolumeControls.scss';
import IconVolumeMax24 from '../icons/IconVolumeMax24';
import VolumeSliderControl from '../slider/VolumeSliderControl';

export type Props = {
    onMuteChange: (isMuted: boolean) => void;
    onVolumeChange: (volume: number) => void;
    volume?: number;
    v2?: boolean;
};

export function getIcon(volume: number): (props: React.SVGProps<SVGSVGElement>) => JSX.Element {
    let Icon = IconVolumeMuted24;

    if (volume >= 0.66) {
        Icon = IconVolumeMax24;
    } else if (volume >= 0.33) {
        Icon = IconVolumeMed24;
    } else if (volume >= 0.01) {
        Icon = IconVolumeNone24;
    }

    return Icon;
}

export default function VolumeControls({ onMuteChange, onVolumeChange, volume = 1, v2 }: Props): JSX.Element {
    const [isActive, handlers] = useAttention();
    const isMuted = !volume;
    const Icon = isMuted ? IconVolumeMuted24 : getIcon(volume);
    const title = isMuted ? __('media_unmute') : __('media_mute');
    const value = Math.round(volume * 100);

    const handleVolume = React.useCallback(
        (newValue: number): void => {
            const newValueToUse = newValue <= 5 ? 0 : newValue;
            onVolumeChange(newValueToUse / 100);
        },
        [onVolumeChange],
    );

    return (
        <div
            className="bp-VolumeControls"
            data-testid="bp-volume-controls"
            onBlur={handlers.onBlur}
            onFocus={handlers.onFocus}
            onMouseOut={handlers.onMouseOut}
            onMouseOver={handlers.onMouseOver}
            style={{ position: 'relative' }}
        >
            <div className={classNames('bp-VolumeControls-flyoutV2', { 'bp-is-open': isActive })}>
                <VolumeSliderControl
                    className="bp-VolumeControls-slider"
                    max={100}
                    onUpdate={handleVolume}
                    step={1}
                    title={__('media_volume_slider')}
                    track={`linear-gradient(to right, #0061d5 ${value}%, #fff ${value}%)`}
                    value={value}
                    {...handlers}
                />
            </div>

            <MediaToggle
                className="bp-VolumeControls-toggle"
                onClick={(): void => onMuteChange(!isMuted)}
                title={title}
                {...handlers}
            >
                <Icon />
            </MediaToggle>
        </div>
    );
}
