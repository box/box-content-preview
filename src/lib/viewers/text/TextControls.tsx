import React from 'react';
import ControlsBar, { ControlsBarGroup } from '../controls/controls-bar';
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
            <ControlsBarGroup isDistinct>
                <ZoomControls
                    maxScale={maxScale}
                    minScale={minScale}
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    scale={scale}
                />
            </ControlsBarGroup>
            <ControlsBarGroup>
                <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
            </ControlsBarGroup>
        </ControlsBar>
    );
}
