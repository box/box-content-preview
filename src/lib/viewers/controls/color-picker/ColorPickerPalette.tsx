import React from 'react';
import './ColorPickerPalette.scss';

export type Props = {
    onColorSelect: (color: string) => void;
};

export default function ColorPickerPalette({ onColorSelect }: Props): JSX.Element {
    const colors = ['#0061d5', '#26c281', '#ed3757', '#f5b31b', '#ffd700', '#4826c2'];

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
