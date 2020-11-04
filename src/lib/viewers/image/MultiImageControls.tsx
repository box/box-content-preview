import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FullscreenToggleProps & ZoomControlsProps;

export default function MultiImageControls({ onFullscreenToggle, onZoomIn, onZoomOut, scale }: Props): JSX.Element {
    return (
        <ControlsBar>
            <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
            {/* TODO: PageControls */}
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
