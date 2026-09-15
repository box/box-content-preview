import React from 'react';
import { bdlBoxBlue } from 'box-ui-elements/es/styles/variables';
import { Popover, SelectMenu, Toolbar } from '@box/blueprint-web';
import { ControlsLayerContext } from '../controls-layer';
import { Props } from './ColorPickerControl';

export default function ColorPickerControlV2({ activeColor = bdlBoxBlue, colors, onColorSelect }: Props): JSX.Element {
    const { setIsForced } = React.useContext(ControlsLayerContext);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSelect = (color: string): void => {
        setIsOpen(false);
        onColorSelect(color);
    };

    // Pin the auto-hiding ControlsLayer open while the palette is up so its hide timer cannot tear
    // the palette down when the cursor drifts off the swatches; release the pin on close or unmount.
    React.useEffect(() => {
        setIsForced(isOpen);
        return (): void => setIsForced(false);
    }, [isOpen, setIsForced]);

    return (
        <Popover.Root onOpenChange={setIsOpen} open={isOpen}>
            <Popover.Trigger asChild>
                <Toolbar.DropdownTriggerButton
                    backgroundColor={activeColor}
                    data-resin-target="colorPickerOpen"
                    data-testid="bp-ColorPickerControl-toggle"
                    selected={isOpen}
                >
                    <Toolbar.DropdownIndicator direction={isOpen ? 'up' : 'down'} />
                </Toolbar.DropdownTriggerButton>
            </Popover.Trigger>
            <Popover.ContentContainer data-testid="bp-ColorPickerControl-palette">
                <Popover.MainContent>
                    <SelectMenu.Grid columns={4}>
                        {colors.map(color => (
                            <SelectMenu.Option.ColorCircle
                                key={color}
                                active={color === activeColor}
                                aria-label={color}
                                color={color}
                                onClick={(): void => handleSelect(color)}
                            />
                        ))}
                    </SelectMenu.Grid>
                </Popover.MainContent>
            </Popover.ContentContainer>
        </Popover.Root>
    );
}
