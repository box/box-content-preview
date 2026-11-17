import React from 'react';
import { IconButton, Tooltip } from '@box/blueprint-web';
import { Pause, Play } from '@box/blueprint-web-assets/icons/MediumFilled';
import IconPause24 from '../icons/IconPause24';
import IconPlay24 from '../icons/IconPlay24';
import MediaToggle from './MediaToggle';
import { stopActivationKeyPropagation } from './utils';

export type Props = {
    className?: string;
    isPlaying?: boolean;
    onPlayPause: (isPlaying: boolean) => void;
    isBlueprintEnabled?: boolean;
};

export default function PlayPauseButton({
    className,
    isPlaying,
    onPlayPause,
    isBlueprintEnabled = false,
}: Props): JSX.Element {
    const title = isPlaying ? __('media_pause') : __('media_play');
    const handleClick = (): void => onPlayPause(!isPlaying);

    if (isBlueprintEnabled) {
        return (
            <Tooltip content={title}>
                <IconButton
                    aria-label={title}
                    data-resin-target="playPause"
                    data-target-id="PlayPauseButton-playPause"
                    icon={isPlaying ? Pause : Play}
                    onClick={handleClick}
                    onKeyDown={stopActivationKeyPropagation}
                    size="large"
                    variant="on-dark"
                />
            </Tooltip>
        );
    }

    const Icon = isPlaying ? IconPause24 : IconPlay24;

    return (
        <MediaToggle className={className} data-resin-target="playPause" onClick={handleClick} title={title}>
            <Icon />
        </MediaToggle>
    );
}
