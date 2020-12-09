import React from 'react';
import AnnotationsControls, { Props as AnnotationsControlsProps } from '../controls/annotations';
import ControlsBar from '../controls/controls-bar';
import DrawingControls, { Props as DrawingControlsProps } from '../controls/annotations/DrawingControls';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import RotateControl, { Props as RotateControlProps } from '../controls/rotate';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = AnnotationsControlsProps &
    DrawingControlsProps &
    FullscreenToggleProps &
    RotateControlProps &
    ZoomControlsProps;

export default function ImageControls({
    annotationColor,
    annotationMode,
    hasDrawing,
    hasHighlight,
    hasRegion,
    onAnnotationColorChange,
    onAnnotationModeClick,
    onAnnotationModeEscape,
    onFullscreenToggle,
    onRotateLeft,
    onZoomIn,
    onZoomOut,
    scale,
}: Props): JSX.Element {
    return (
        <>
            <ControlsBar>
                <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
                <RotateControl onRotateLeft={onRotateLeft} />
                <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                <AnnotationsControls
                    annotationColor={annotationColor}
                    annotationMode={annotationMode}
                    hasDrawing={hasDrawing}
                    hasHighlight={hasHighlight}
                    hasRegion={hasRegion}
                    onAnnotationModeClick={onAnnotationModeClick}
                    onAnnotationModeEscape={onAnnotationModeEscape}
                />
            </ControlsBar>
            <ControlsBar>
                <DrawingControls
                    annotationColor={annotationColor}
                    annotationMode={annotationMode}
                    onAnnotationColorChange={onAnnotationColorChange}
                />
            </ControlsBar>
        </>
    );
}
