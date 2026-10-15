import React from 'react';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import { Popover, SelectMenu, Toolbar, Tooltip } from '@box/blueprint-web';
import { AnnotationColor } from '../../../AnnotationModule';
import { ControlsLayerContext } from '../controls-layer';
import { PortalContainerContext } from '../../../BlueprintProviders';
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
    const container = React.useContext(PortalContainerContext);
    const { setIsForced } = React.useContext(ControlsLayerContext);
    const [isOpen, setIsOpen] = React.useState(false);
    const colorLabels = getColorLabels();

    const handleSelect = (color: string): void => {
        setIsOpen(false);
        onColorSelect(color);
    };

    // The options portal outside the auto-hiding ControlsLayer, so pin the layer open while they are up
    React.useEffect(() => {
        setIsForced(isOpen);
        return (): void => setIsForced(false);
    }, [isOpen, setIsForced]);

    return (
        <div className="bp-ColorPickerControlV2" data-testid="bp-color-picker-control">
            <Popover.Root modal={false} onOpenChange={setIsOpen} open={isOpen}>
                <Tooltip content={__('drawing_color')}>
                    <Popover.Trigger>
                        <Toolbar.DropdownTriggerButton
                            aria-label={__('drawing_color')}
                            backgroundColor={activeColor}
                            data-resin-target="colorPickerOpen"
                            data-testid="bp-ColorPickerControl-toggle"
                            selected
                        >
                            <Toolbar.DropdownIndicator direction={isOpen ? 'up' : 'down'} />
                        </Toolbar.DropdownTriggerButton>
                    </Popover.Trigger>
                </Tooltip>
                <Popover.ContentContainer
                    container={container}
                    data-testid="bp-ColorPickerControl-palette"
                    side="top"
                    sideOffset={4}
                >
                    <SelectMenu.Grid aria-label={__('drawing_color')} columns={colors.length}>
                        {colors.map(color => (
                            <SelectMenu.Option.ColorCircle
                                key={color}
                                active={color === activeColor}
                                aria-label={colorLabels[color] || color}
                                color={color}
                                data-resin-target="colorSelect"
                                onClick={(): void => handleSelect(color)}
                            />
                        ))}
                    </SelectMenu.Grid>
                </Popover.ContentContainer>
            </Popover.Root>
        </div>
    );
}
