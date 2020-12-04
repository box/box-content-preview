import React from 'react';
import { AnnotationColor } from '../../../AnnotationModule';
import './ColorPickerPalette.scss';

export type Props = {
    onColorSelect: (color: AnnotationColor) => void;
};

export default function ColorPickerPalette({ onColorSelect }: Props): JSX.Element {
    const colors = [
        AnnotationColor.BLUE,
        AnnotationColor.GREEN_LIGHT,
        AnnotationColor.WATERMELON_RED,
        AnnotationColor.YELLORANGE,
        AnnotationColor.YELLOW,
        AnnotationColor.GRIMACE,
    ];

    return (
        <div className="bp-ColorPickerPalette">
            {colors.map(color => {
                return (
                    <button
                        key={color}
                        className="bp-ColorPickerPalette-button"
                        onClick={(): void => onColorSelect(color)}
                        style={{
                            backgroundColor: color,
                        }}
                        type="button"
                    />
                );
            })}
        </div>
    );
}
