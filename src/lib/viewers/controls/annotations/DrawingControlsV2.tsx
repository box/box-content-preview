import React from 'react';
import ColorPickerControlV2 from '../color-picker/ColorPickerControlV2';
import { ANNOTATION_COLORS } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types';
import { Props } from './DrawingControls';

export default function DrawingControlsV2({
    annotationColor,
    annotationMode,
    onAnnotationColorChange,
}: Props): JSX.Element | null {
    if (annotationMode !== AnnotationMode.DRAWING) {
        return null;
    }

    return (
        <ColorPickerControlV2
            activeColor={annotationColor}
            colors={ANNOTATION_COLORS}
            onColorSelect={onAnnotationColorChange}
        />
    );
}
