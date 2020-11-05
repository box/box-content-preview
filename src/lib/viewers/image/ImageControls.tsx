import React from 'react';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = FullscreenToggleProps & ZoomControlsProps;

export default function ImageControls({ onFullscreenToggle, onZoomIn, onZoomOut, scale }: Props): JSX.Element {
    return (
        <ControlsBar>
            <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
            {/* TODO: RotateControl */}
            <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
            {/* TODO: AnnotationControls (separate group) */}
        </ControlsBar>
    );
}
