import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import RotateControl, { Props as RotateControlProps } from '../controls/rotate';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FullscreenToggleProps & RotateControlProps & ZoomControlsProps;

export default function ImageControls({
    onFullscreenToggle,
    onRotateLeft,
    onZoomIn,
    onZoomOut,
    scale,
}: Props): JSX.Element {
    return (
        <ControlsBar>
            <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
            <RotateControl onRotateLeft={onRotateLeft} />
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
            {/* TODO: AnnotationControls (separate group) */}
        </ControlsBar>
    );
}
