import React, { useState } from 'react';
import classNames from 'classnames';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import ColorPickerPalette from './ColorPickerPalette';
import useAttention from '../hooks/useAttention';
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
    const [isPaletteActive, handlers] = useAttention();

    const handleSelect = (color: string): void => {
        setIsColorPickerToggled(false);
        onColorSelect(color);
    };

    const handleBlur = (): void => {
        if (isPaletteActive) {
            return;
        }
        setIsColorPickerToggled(false);
    };

    const handleClick = (): void => setIsColorPickerToggled(!isColorPickerToggled);

    return (
        <div className="bp-ColorPickerControl">
            <button
                className="bp-ColorPickerControl-button"
                data-testid="bp-ColorPickerControl-button"
                onBlur={handleBlur}
                onClick={handleClick}
                type="button"
                {...rest}
            >
                <div className="bp-ColorPickerControl-swatch" style={{ backgroundColor: activeColor }} />
            </button>
            <div
                className={classNames('bp-ColorPickerControl-palette', { 'bp-is-open': isColorPickerToggled })}
                data-testid="bp-ColorPickerControl-palette"
                {...handlers}
            >
                <ColorPickerPalette colors={colors} data-testid="bp-ColorPickerPalette" onSelect={handleSelect} />
            </div>
        </div>
    );
}
