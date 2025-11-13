import React from 'react';
import ColorPickerControl from '../color-picker';
import { ANNOTATION_COLORS } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types';

export type Props = {
    annotationColor?: string;
    annotationMode?: AnnotationMode;
    modernizationEnabled?: boolean;
    onAnnotationColorChange: (color: string) => void;
};

export default function DrawingControls({
    annotationColor,
    annotationMode,
    modernizationEnabled = false,
    onAnnotationColorChange,
}: Props): JSX.Element | null {
    if (annotationMode !== AnnotationMode.DRAWING) {
        return null;
    }

    return (
        <ColorPickerControl
            activeColor={annotationColor}
            colors={ANNOTATION_COLORS}
            modernizationEnabled={modernizationEnabled}
            onColorSelect={onAnnotationColorChange}
        />
    );
}
