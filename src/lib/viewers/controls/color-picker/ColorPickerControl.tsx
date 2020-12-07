import React, { useState } from 'react';
import classNames from 'classnames';
import ColorPickerPalette from './ColorPickerPalette';
import { AnnotationColor } from '../../../AnnotationModule';
import './ColorPickerControl.scss';

const colors = Object.values(AnnotationColor);

export type Props = {
    annotationColor: AnnotationColor;
    isActive?: boolean;
    onAnnotationColorClick: (color: AnnotationColor) => void;
};

export default function ColorPickerControl({
    annotationColor,
    isActive = false,
    onAnnotationColorClick,
    ...rest
}: Props): JSX.Element | null {
    const [isColorPickerToggled, setIsColorPickerToggled] = useState(false);

    return (
        <div className="bp-ColorPickerControl">
            {isColorPickerToggled && (
                <div className="bp-ColorPickerControl-palette">
                    <ColorPickerPalette
                        colors={colors}
                        onColorSelect={(color): void => {
                            setIsColorPickerToggled(false);
                            onAnnotationColorClick(color);
                        }}
                    />
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
