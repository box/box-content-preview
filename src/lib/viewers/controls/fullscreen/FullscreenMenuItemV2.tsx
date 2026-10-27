import React from 'react';
import ArrowsMaximize from '@box/blueprint-web-assets/icons/Medium/ArrowsMaximize';
import ArrowsMinimize from '@box/blueprint-web-assets/icons/Medium/ArrowsMinimize';
import ControlsMenuItemV2 from '../controls-bar/ControlsMenuItemV2';
import useFullscreen from '../hooks/useFullscreen';
import { Props } from './FullscreenToggle';

// Viewers using this menu row bind F to fullscreen while the Blueprint controls bar is on
export default function FullscreenMenuItemV2({ onFullscreenToggle }: Props): JSX.Element {
    const isFullscreen = useFullscreen();

    return (
        <ControlsMenuItemV2
            bareKey="F"
            data-resin-target="fullscreen"
            icon={isFullscreen ? ArrowsMinimize : ArrowsMaximize}
            label={isFullscreen ? __('exit_fullscreen') : __('enter_fullscreen')}
            onSelect={(trigger): void => onFullscreenToggle(!isFullscreen, trigger)}
        />
    );
}
