import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import ArrowsMaximize from '@box/blueprint-web-assets/icons/Medium/ArrowsMaximize';
import ArrowsMinimize from '@box/blueprint-web-assets/icons/Medium/ArrowsMinimize';
import useFullscreen from '../hooks/useFullscreen';
import { Props } from './FullscreenToggle';

export default function FullscreenToggleV2({ onFullscreenToggle, ...rest }: Props): JSX.Element {
    const isFullscreen = useFullscreen();
    const icon = isFullscreen ? ArrowsMinimize : ArrowsMaximize;
    const label = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');

    const handleClick = ({ currentTarget }: React.MouseEvent<HTMLButtonElement>): void => {
        onFullscreenToggle(!isFullscreen, currentTarget);
    };

    return (
        <Tooltip content={label}>
            <Toolbar.Button aria-label={label} data-resin-target="fullscreen" onClick={handleClick} {...rest}>
                <Toolbar.Icon icon={icon} />
            </Toolbar.Button>
        </Tooltip>
    );
}
