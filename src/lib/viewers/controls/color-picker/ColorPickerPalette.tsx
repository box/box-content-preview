import React from 'react';
import { AnnotationColor } from '../../../AnnotationModule';
import './ColorPickerPalette.scss';

const colors = Object.values(AnnotationColor);

export type Props = {
    onColorSelect: (color: AnnotationColor) => void;
};

export default function ColorPickerPalette({ onColorSelect }: Props): JSX.Element {
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
