import React, { useState } from 'react';
import classNames from 'classnames';
import ColorPickerPalette from './ColorPickerPalette';
import { AnnotationMode } from '../annotations/types';
import './ColorPickerControl.scss';

export type Props = {
    annotationMode?: AnnotationMode;
    isActive?: boolean;
};

export default function ColorPickerControl({ annotationMode, isActive = false, ...rest }: Props): JSX.Element | null {
    const [isColorPickerToggled, setIsColorPickerToggled] = useState(false);

    if (annotationMode !== AnnotationMode.DRAWING) {
        return null;
    }

    return (
        <div className="bp-ColorPickerControl">
            {isColorPickerToggled && (
                <ColorPickerPalette
                    onColorSelect={(): void => {
                        setIsColorPickerToggled(false);
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
                <svg focusable="false" height="16" viewBox="0 0 16 16" width="16" />
            </button>
        </div>
    );
}
