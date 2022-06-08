import React from 'react';
import AnnotationsControls, { Props as AnnotationsControlsProps } from '../controls/annotations';
import ControlsBar, { ControlsBarGroup } from '../controls/controls-bar';
import DrawingControls, { Props as DrawingControlsProps } from '../controls/annotations/DrawingControls';
import ExperiencesProvider, { Props as ExperiencesProviderProps } from '../controls/experiences';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import RotateControl, { Props as RotateControlProps } from '../controls/rotate';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';

export type Props = AnnotationsControlsProps &
    DrawingControlsProps &
    ExperiencesProviderProps &
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
}: Props): JSX.Element {
    return (
        <ExperiencesProvider experiences={experiences}>
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
                        hasDrawing={hasDrawing}
                        hasHighlight={hasHighlight}
                        hasRegion={hasRegion}
                        onAnnotationModeClick={onAnnotationModeClick}
                        onAnnotationModeEscape={onAnnotationModeEscape}
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
        </ExperiencesProvider>
    );
}
