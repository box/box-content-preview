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
                <ColorPickerPalette
                    onColorSelect={(color: string): void => {
                        setIsColorPickerToggled(false);
                        onAnnotationColorClick(color);
                    }}
                />
            )}
            <button
                className={classNames('bp-ColorPickerControl-button', {
                    'bp-is-active': isActive,
                })}
                onClick={(): void => setIsColorPickerToggled(!isColorPickerToggled)}
                type="button"
                {...rest}
            >
                <svg
                    className="bp-ColorPickerControl-button-swatch"
                    focusable="false"
                    height="16"
                    viewBox="0 0 16 16"
                    width="16"
                />
            </button>
        </div>
    );
}
