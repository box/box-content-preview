import React from 'react';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import { SelectMenu } from '@box/blueprint-web';
import { AnnotationColor } from '../../../AnnotationModule';
import { Props } from './ColorPickerControl';
import './ColorPickerControlV2.scss';

const getColorLabels = (): Record<string, string> => ({
    [AnnotationColor.BOX_BLUE]: __('drawing_color_blue'),
    [AnnotationColor.GREEN_LIGHT]: __('drawing_color_green'),
    [AnnotationColor.WATERMELON_RED]: __('drawing_color_red'),
    [AnnotationColor.YELLORANGE]: __('drawing_color_orange'),
    [AnnotationColor.YELLOW]: __('drawing_color_yellow'),
    [AnnotationColor.GRIMACE]: __('drawing_color_purple'),
});

export default function ColorPickerControlV2({ activeColor = bdlBoxBlue, colors, onColorSelect }: Props): JSX.Element {
    const colorLabels = getColorLabels();

    return (
        <div className="bp-ColorPickerControlV2" data-testid="bp-color-picker-control">
            <SelectMenu.Grid aria-label={__('drawing_color')} columns={colors.length}>
                {colors.map(color => (
                    <SelectMenu.Option.ColorCircle
                        key={color}
                        active={color === activeColor}
                        aria-label={colorLabels[color] || color}
                        color={color}
                        data-resin-target="colorSelect"
                        onClick={(): void => onColorSelect(color)}
                    />
                ))}
            </SelectMenu.Grid>
        </div>
    );
}
