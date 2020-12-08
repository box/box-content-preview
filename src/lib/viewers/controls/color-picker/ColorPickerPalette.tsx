import React from 'react';
import './ColorPickerPalette.scss';

export type Props = {
    colors: Array<string>;
    onSelect: (color: string) => void;
};

export default function ColorPickerPalette({ colors, onSelect }: Props): JSX.Element {
    return (
        <div className="bp-ColorPickerPalette">
            {colors.map(color => {
                return (
                    <button
                        key={color}
                        className="bp-ColorPickerPalette-button"
                        data-testid="bp-ColorPickerPalette-button"
                        onClick={(): void => onSelect(color)}
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
