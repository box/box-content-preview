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
    modernizationEnabled,
}: Props): JSX.Element {
    return (
        <ExperiencesProvider experiences={experiences}>
            <ControlsBar modernizationEnabled={modernizationEnabled}>
                <ControlsBarGroup isDistinct modernizationEnabled={modernizationEnabled}>
                    <ZoomControls
                        modernizationEnabled={modernizationEnabled}
                        onZoomIn={onZoomIn}
                        onZoomOut={onZoomOut}
                        scale={scale}
                    />
                </ControlsBarGroup>
                <ControlsBarGroup modernizationEnabled={modernizationEnabled}>
                    <RotateControl modernizationEnabled={modernizationEnabled} onRotateLeft={onRotateLeft} />
                    <FullscreenToggle
                        modernizationEnabled={modernizationEnabled}
                        onFullscreenToggle={onFullscreenToggle}
                    />
                    <AnnotationsControls
                        annotationColor={annotationColor}
                        annotationMode={annotationMode}
                        hasDrawing={hasDrawing}
                        hasHighlight={hasHighlight}
                        hasRegion={hasRegion}
                        modernizationEnabled={modernizationEnabled}
                        onAnnotationModeClick={onAnnotationModeClick}
                        onAnnotationModeEscape={onAnnotationModeEscape}
                    />
                </ControlsBarGroup>
            </ControlsBar>
            <ControlsBar modernizationEnabled={modernizationEnabled}>
                <DrawingControls
                    annotationColor={annotationColor}
                    annotationMode={annotationMode}
                    modernizationEnabled={modernizationEnabled}
                    onAnnotationColorChange={onAnnotationColorChange}
                />
            </ControlsBar>
        </ExperiencesProvider>
    );
}
