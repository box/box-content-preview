import React from 'react';
import AnnotationsControls, { Props as AnnotationsControlsProps } from '../controls/annotations';
import ControlsBar, { ControlsBarGroup } from '../controls/controls-bar';
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
    experiences,
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
    setWasClosedByUser,
}: Props): JSX.Element {
    return (
        <>
            <ControlsBar>
                <ControlsBarGroup isDistinct>
                    <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} scale={scale} />
                </ControlsBarGroup>
                <ControlsBarGroup>
                    <RotateControl onRotateLeft={onRotateLeft} />
                    <FullscreenToggle onFullscreenToggle={onFullscreenToggle} />
                    <AnnotationsControls
                        annotationColor={annotationColor}
                        annotationMode={annotationMode}
                        experiences={experiences}
                        hasDrawing={hasDrawing}
                        hasHighlight={hasHighlight}
                        hasRegion={hasRegion}
                        onAnnotationModeClick={onAnnotationModeClick}
                        onAnnotationModeEscape={onAnnotationModeEscape}
                        setWasClosedByUser={setWasClosedByUser}
                    />
                </ControlsBarGroup>
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
