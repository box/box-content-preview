import React, { useState } from 'react';
import classNames from 'classnames';
import ColorPickerPalette from './ColorPickerPalette';
import { AnnotationMode } from '../annotations/types';
import './ColorPickerControl.scss';

export type Props = {
    annotationMode?: AnnotationMode;
    onAnnotationColorClick: (color: string) => void;
    isActive?: boolean;
};

export default function ColorPickerControl({
    annotationMode,
    isActive = false,
    onAnnotationColorClick,
    ...rest
}: Props): JSX.Element | null {
    const [isColorPickerToggled, setIsColorPickerToggled] = useState(false);

    if (annotationMode !== AnnotationMode.DRAWING) {
        return null;
    }

    return (
        <div className="bp-ColorPickerControl">
            {isColorPickerToggled && (
                <div className="bp-ColorPickerControl-palette">
                    <ColorPickerPalette
                        onColorSelect={(color: string): void => {
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
                <div className="bp-ColorPickerControl-swatch" />
            </button>
        </div>
    );
}
