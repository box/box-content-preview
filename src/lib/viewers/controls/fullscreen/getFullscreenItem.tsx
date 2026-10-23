import React from 'react';
import ArrowsMaximize from '@box/blueprint-web-assets/icons/Medium/ArrowsMaximize';
import ArrowsMinimize from '@box/blueprint-web-assets/icons/Medium/ArrowsMinimize';
import ControlsMenuItemV2 from '../controls-bar/ControlsMenuItemV2';
import FullscreenToggleV2 from './FullscreenToggleV2';
import useFullscreen from '../hooks/useFullscreen';
import { ControlsBarItem } from '../controls-bar/useControlsOverflow';
import { Props } from './FullscreenToggle';

// Viewers using this menu row bind F to fullscreen while the Blueprint controls bar is on
function FullscreenMenuItemV2({ onFullscreenToggle }: Props): JSX.Element {
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

// Without a priority, fullscreen stays on the bar at every width and has no menu form
export default function getFullscreenItem({ onFullscreenToggle }: Props, priority?: number): ControlsBarItem {
    return {
        control: <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />,
        id: 'fullscreen',
        menu: priority !== undefined && <FullscreenMenuItemV2 onFullscreenToggle={onFullscreenToggle} />,
        priority,
    };
}
