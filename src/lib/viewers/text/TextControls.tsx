import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FullscreenToggleProps & ZoomControlsProps;

export default function TextControls({
    maxScale,
    minScale,
    onFullscreenToggle,
    onZoomIn,
    onZoomOut,
    scale,
}: Props): JSX.Element {
    return (
        <ControlsBar>
            <ZoomControls
                maxScale={maxScale}
                minScale={minScale}
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                scale={scale}
            />
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
        </ControlsBar>
    );
}
