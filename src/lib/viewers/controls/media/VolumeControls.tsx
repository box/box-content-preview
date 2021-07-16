import React from 'react';
import classNames from 'classnames';
import { bdlBoxBlue, white } from 'box-ui-elements/es/styles/variables';
import IconVolumeHigh24 from '../icons/IconVolumeHigh24';
import IconVolumeLow24 from '../icons/IconVolumeLow24';
import IconVolumeMedium24 from '../icons/IconVolumeMedium24';
import IconVolumeMute24 from '../icons/IconVolumeMute24';
import MediaToggle from './MediaToggle';
import SliderControl from '../slider';
import useAttention from '../hooks/useAttention';
import './VolumeControls.scss';

export type Props = {
    onMuteChange: (isMuted: boolean) => void;
    onVolumeChange: (volume: number) => void;
    volume?: number;
};

export function getIcon(volume: number): (props: React.SVGProps<SVGSVGElement>) => JSX.Element {
    let Icon = IconVolumeMute24;

    if (volume >= 0.66) {
        Icon = IconVolumeHigh24;
    } else if (volume >= 0.33) {
        Icon = IconVolumeMedium24;
    } else if (volume >= 0.01) {
        Icon = IconVolumeLow24;
    }

    return Icon;
}

export default function VolumeControls({ onMuteChange, onVolumeChange, volume = 1 }: Props): JSX.Element {
    const [isActive, handlers] = useAttention();
    const isMuted = !volume;
    const Icon = isMuted ? IconVolumeMute24 : getIcon(volume);
    const title = isMuted ? __('media_unmute') : __('media_mute');
    const value = Math.round(volume * 100);

    const handleVolume = React.useCallback(
        (newValue: number): void => {
            onVolumeChange(newValue / 100);
        },
        [onVolumeChange],
    );

    return (
        <div className="bp-VolumeControls">
            <MediaToggle
                className="bp-VolumeControls-toggle"
                onClick={(): void => onMuteChange(!isMuted)}
                title={title}
                {...handlers}
            >
                <Icon />
            </MediaToggle>

            <div className={classNames('bp-VolumeControls-flyout', { 'bp-is-open': isActive })}>
                <SliderControl
                    className="bp-VolumeControls-slider"
                    max={100}
                    onUpdate={handleVolume}
                    step={1}
                    title={__('media_volume_slider')}
                    track={`linear-gradient(to right, ${bdlBoxBlue} ${value}%, ${white} ${value}%)`}
                    value={value}
                    {...handlers}
                />
            </div>
        </div>
    );
}
