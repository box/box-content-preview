import React, { useState } from 'react';
import classNames from 'classnames';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import ColorPickerPalette from './ColorPickerPalette';
import { AnnotationColor } from '../../../AnnotationModule';
import './ColorPickerControl.scss';

const colors = Object.values(AnnotationColor);

export type Props = {
    annotationColor?: string;
    isActive?: boolean;
    onColorSelect: (color: string) => void;
};

export default function ColorPickerControl({
    annotationColor = bdlBoxBlue,
    isActive = false,
    onColorSelect,
    ...rest
}: Props): JSX.Element | null {
    const [isColorPickerToggled, setIsColorPickerToggled] = useState(false);

    const handleSelect = (color: string) => {
        setIsColorPickerToggled(false);
        onColorSelect(color);
    };

    return (
        <div className="bp-ColorPickerControl">
            {isColorPickerToggled && (
                <div className="bp-ColorPickerControl-palette">
                    <ColorPickerPalette colors={colors} onSelect={handleSelect} />
                </div>
            )}
            <button
                className={classNames('bp-ColorPickerControl-button', {
                    'bp-is-active': isActive,
                })}
                onClick={(): void => setIsColorPickerToggled(!isColorPickerToggled)}
                type="button"
                {...rest}
            >
                <div className="bp-ColorPickerControl-swatch" style={{ backgroundColor: annotationColor }} />
            </button>
        </div>
    );
}
