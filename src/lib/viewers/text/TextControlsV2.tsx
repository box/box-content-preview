import React from 'react';
import { ControlsBarV2 } from '../controls/controls-bar';
import { FullscreenToggleV2 } from '../controls/fullscreen';
import { ZoomControlsV2 } from '../controls/zoom';
import { Props } from './TextControls';

export default function TextControlsV2({
    maxScale,
    minScale,
    onFullscreenToggle,
    onZoomIn,
    onZoomOut,
    scale,
}: Props): JSX.Element {
    return (
        <ControlsBarV2>
            <ZoomControlsV2
                maxScale={maxScale}
                minScale={minScale}
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
                scale={scale}
            />
            <FullscreenToggleV2 onFullscreenToggle={onFullscreenToggle} />
        </ControlsBarV2>
    );
}
