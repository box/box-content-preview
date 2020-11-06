import React from 'react';
import AnnotationsControls, { Props as AnnotationsControlsProps } from '../controls/annotations';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import RotateControl, { Props as RotateControlProps } from '../controls/rotate';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = AnnotationsControlsProps & FullscreenToggleProps & RotateControlProps & ZoomControlsProps;

export default function ImageControls({
    annotationMode,
    fileId,
    hasHighlight,
    hasRegion,
    onAnnotationModeClick,
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
            <AnnotationsControls
                annotationMode={annotationMode}
                fileId={fileId}
                hasHighlight={hasHighlight}
                hasRegion={hasRegion}
                onAnnotationModeClick={onAnnotationModeClick}
            />
        </ControlsBar>
    );
}
