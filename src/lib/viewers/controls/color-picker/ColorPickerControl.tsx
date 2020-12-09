import React, { useState } from 'react';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import ColorPickerPalette from './ColorPickerPalette';
import './ColorPickerControl.scss';

export type Props = {
    activeColor?: string;
    colors: Array<string>;
    onColorSelect: (color: string) => void;
};

export default function ColorPickerControl({
    activeColor = bdlBoxBlue,
    colors,
    onColorSelect,
    ...rest
}: Props): JSX.Element | null {
    const [isColorPickerToggled, setIsColorPickerToggled] = useState(false);

    const handleSelect = (color: string): void => {
        setIsColorPickerToggled(false);
        onColorSelect(color);
    };

    return (
        <div className="bp-ColorPickerControl">
            {isColorPickerToggled && (
                <div className="bp-ColorPickerControl-palette">
                    <ColorPickerPalette colors={colors} data-testid="bp-ColorPickerPalette" onSelect={handleSelect} />
                </div>
            )}
            <button
                className="bp-ColorPickerControl-button"
                data-testid="bp-ColorPickerControl-button"
                onClick={(): void => setIsColorPickerToggled(!isColorPickerToggled)}
                type="button"
                {...rest}
            >
                <div className="bp-ColorPickerControl-swatch" style={{ backgroundColor: activeColor }} />
            </button>
        </div>
    );
}
