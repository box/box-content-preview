import React from 'react';
import ZoomControlsV2 from './ZoomControlsV2';
import ZoomMenuItemsV2 from './ZoomMenuItemsV2';
import { ControlsBarItem } from '../controls-bar/useControlsOverflow';
import { Props } from './ZoomControls';

// Without a priority, zoom stays on the bar at every width and has no menu form
export default function getZoomItem(props: Props, priority?: number): ControlsBarItem {
    return {
        control: <ZoomControlsV2 {...props} />,
        id: 'zoom',
        menu: priority !== undefined && <ZoomMenuItemsV2 {...props} />,
        priority,
    };
}
