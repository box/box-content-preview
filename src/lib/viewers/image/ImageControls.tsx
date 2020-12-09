import React from 'react';
import AnnotationsControls, { Props as AnnotationsControlsProps } from '../controls/annotations';
import ColorPickerControl from '../controls/color-picker';
import ControlsBar from '../controls/controls-bar';
import FullscreenToggle, { Props as FullscreenToggleProps } from '../controls/fullscreen';
import RotateControl, { Props as RotateControlProps } from '../controls/rotate';
import ZoomControls, { Props as ZoomControlsProps } from '../controls/zoom';
import { AnnotationColor } from '../../AnnotationModule';
import { AnnotationMode } from '../controls/annotations/types';

const colors = Object.values(AnnotationColor);

export type Props = AnnotationsControlsProps &
    FullscreenToggleProps &
    RotateControlProps &
    ZoomControlsProps & {
        onAnnotationColorChange: (color: string) => void;
    };

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
            {hasDrawing && annotationMode === AnnotationMode.DRAWING && (
                <ControlsBar>
                    <ColorPickerControl
                        activeColor={annotationColor}
                        colors={colors}
                        onColorSelect={onAnnotationColorChange}
                    />
                </ControlsBar>
            )}
        </>
    );
}
