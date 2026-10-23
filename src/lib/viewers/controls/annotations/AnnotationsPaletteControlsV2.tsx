import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import AnnotationsPaletteV2 from './AnnotationsPaletteV2';
import ColorPickerControlV2 from '../color-picker/ColorPickerControlV2';
import { ActiveAnnotationMode } from './annotationModeIcons';
import { ANNOTATION_COLORS } from '../../../AnnotationModule';
import { AnnotationMode } from '../../../types';

export type Props = {
    annotationColor?: string;
    annotationMode: AnnotationMode;
    modes: ActiveAnnotationMode[];
    onAnnotationColorChange: (color: string) => void;
    onAnnotationModeClick?: ({ mode }: { mode: AnnotationMode }) => void;
};

// The palette opened by the markup toggle, with the drawing colors while drawing
export default function AnnotationsPaletteControlsV2({
    annotationColor,
    annotationMode,
    modes,
    onAnnotationColorChange,
    onAnnotationModeClick,
}: Props): JSX.Element | null {
    if (annotationMode === AnnotationMode.NONE || !modes.length) {
        return null;
    }

    return (
        <AnnotationsPaletteV2>
            <AnnotationsPaletteV2.Modes annotationMode={annotationMode} onAnnotationModeClick={onAnnotationModeClick}>
                {modes.map(mode => (
                    <AnnotationsPaletteV2.Mode key={mode} value={mode} />
                ))}
            </AnnotationsPaletteV2.Modes>
            {annotationMode === AnnotationMode.DRAWING && (
                <>
                    <Toolbar.Separator />
                    <ColorPickerControlV2
                        activeColor={annotationColor}
                        colors={ANNOTATION_COLORS}
                        onColorSelect={onAnnotationColorChange}
                    />
                </>
            )}
        </AnnotationsPaletteV2>
    );
}
