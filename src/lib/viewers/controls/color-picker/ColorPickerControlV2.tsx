import React from 'react';
import { SelectMenu } from '@box/blueprint-web';
import { AnnotationColor } from '../../../AnnotationModule';
import { Props } from './ColorPickerControl';

export default function ColorPickerControlV2({
    activeColor = AnnotationColor.BOX_BLUE,
    colors,
    onColorSelect,
}: Props): JSX.Element {
    return (
        <>
            {colors.map(color => (
                <SelectMenu.Option.ColorCircle
                    key={color}
                    active={color === activeColor}
                    aria-label={color}
                    color={color}
                    data-resin-target="colorPicker"
                    data-testid="bp-ColorPickerControl-swatch"
                    onClick={(): void => onColorSelect(color)}
                />
            ))}
        </>
    );
}
