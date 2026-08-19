import React from 'react';
import { IconButton } from '@box/blueprint-web';
import ArrowsCollapse from '@box/blueprint-web-assets/icons/Fill/ArrowsCollapse';
import ArrowsExpand from '@box/blueprint-web-assets/icons/Fill/ArrowsExpand';
import useFullscreen from '../hooks/useFullscreen';
import './FullscreenToggle.scss';

export type Props = {
    onFullscreenToggle: (isFullscreen: boolean, toggleFullscreenEl: EventTarget | null) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
};

export default function FullscreenToggle({ onFullscreenToggle, ...rest }: Props): JSX.Element {
    const isFullscreen = useFullscreen();
    const Icon = isFullscreen ? ArrowsCollapse : ArrowsExpand;
    const ariaLabel = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');

    const handleClick = ({ target }: React.MouseEvent): void => {
        onFullscreenToggle(!isFullscreen, target);
    };

    return (
        <IconButton
            aria-label={ariaLabel}
            className="bp-FullscreenToggle"
            data-resin-target="fullscreen"
            icon={Icon}
            onClick={handleClick}
            {...rest}
        />
    );
}
