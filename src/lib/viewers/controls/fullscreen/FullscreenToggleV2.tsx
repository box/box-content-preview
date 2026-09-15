import React from 'react';
import { Toolbar, Tooltip } from '@box/blueprint-web';
import Expand from '@box/blueprint-web-assets/icons/Medium/Expand';
import Minimize from '@box/blueprint-web-assets/icons/Medium/Minimize';
import useFullscreen from '../hooks/useFullscreen';
import { Props } from './FullscreenToggle';

export default function FullscreenToggleV2({ onFullscreenToggle, ...rest }: Props): JSX.Element {
    const isFullscreen = useFullscreen();
    const icon = isFullscreen ? Minimize : Expand;
    const label = isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen');

    const handleClick = (): void => {
        onFullscreenToggle(!isFullscreen, document.activeElement);
    };

    return (
        <Tooltip content={label}>
            <Toolbar.Button aria-label={label} data-resin-target="fullscreen" onClick={handleClick} {...rest}>
                <Toolbar.Icon icon={icon} />
            </Toolbar.Button>
        </Tooltip>
    );
}
