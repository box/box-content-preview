import React, { useState } from 'react';
import classNames from 'classnames';
import noop from 'lodash/noop';
import ColorPickerPalette from './ColorPickerPalette';
import { AnnotationMode } from '../annotations/types';
import './ColorPickerToggle.scss';

export type Props = {
    isActive?: boolean;
    onClick?: () => void;
    annotationMode: AnnotationMode;
};

export default function ColorPickerToggle({
    annotationMode,
    isActive = false,
    onClick = noop,
    ...rest
}: Props): JSX.Element | null {
    const [isColorPickerToggled, setIsColorPickerToggled] = useState(false);

    if (annotationMode !== AnnotationMode.DRAWING) {
        return null;
    }

    return (
        <div className="bp-ColorPickerToggle">
            {isColorPickerToggled && (
                <ColorPickerPalette
                    onColorSelect={color => {
                        setIsColorPickerToggled(false);
                    }}
                />
            )}
            <button
                className={classNames('bp-ColorPickerToggle-button', {
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
