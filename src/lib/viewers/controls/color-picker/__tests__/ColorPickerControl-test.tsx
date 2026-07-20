import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPickerControl from '../ColorPickerControl';
import { ControlsLayerContext } from '../../controls-layer';

describe('ColorPickerControl', () => {
    const defaultColor = '#fff';

    const getWrapper = (props = {}, setIsForced = jest.fn()) =>
        render(
            <ControlsLayerContext.Provider value={{ setIsForced }}>
                <ColorPickerControl colors={[defaultColor]} onColorSelect={jest.fn()} {...props} />
            </ControlsLayerContext.Provider>,
        );

    const getColorPickerPalette = async () => screen.findByTestId('bp-ColorPickerControl-palette');

    const getToggleButton = async () => screen.findByTestId('bp-ColorPickerControl-toggle');

    describe('render', () => {
        test('should not render ColorPickerPalette open when the component is first mounted', async () => {
            getWrapper();

            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).not.toHaveClass('bp-is-open');
        });

        test('should open ColorPickerPalette when the toggle button is clicked', async () => {
            getWrapper();

            const toggleButton = await getToggleButton();
            const chevronIcon = await screen.findByTestId('IconChevronDownMedium24');
            expect(chevronIcon).toBeVisible();
            await userEvent.click(toggleButton);
            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).toHaveClass('bp-is-open');
            expect(toggleButton).toHaveClass('bp-is-active');
            expect(chevronIcon).not.toBeInTheDocument();
            expect(screen.getByTestId('IconChevronUpMedium24')).toBeVisible();
        });

        test('should toggle the palette closed when the toggle button is clicked again', async () => {
            getWrapper();

            const toggleButton = await getToggleButton();
            const colorPickerPalette = await getColorPickerPalette();

            await userEvent.click(toggleButton);
            expect(colorPickerPalette).toHaveClass('bp-is-open');

            await userEvent.click(toggleButton);
            expect(colorPickerPalette).not.toHaveClass('bp-is-open');
            expect(toggleButton).not.toHaveClass('bp-is-active');
        });
    });

    // Explicit intent closes the palette — an outside click or Escape. A mere focus change or mouse-leave
    // must NOT (mouse-leave is kept open by the ControlsLayer pin, covered in ControlsLayer-test).
    describe('close behavior', () => {
        test('should close the palette when clicking outside the control', async () => {
            getWrapper();

            const toggleButton = await getToggleButton();
            await userEvent.click(toggleButton);
            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).toHaveClass('bp-is-open');

            await userEvent.click(document.body);
            expect(colorPickerPalette).not.toHaveClass('bp-is-open');
        });

        test('should close the palette when Escape is pressed', async () => {
            getWrapper();

            const toggleButton = await getToggleButton();
            await userEvent.click(toggleButton);
            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).toHaveClass('bp-is-open');

            await userEvent.keyboard('{Escape}');
            expect(colorPickerPalette).not.toHaveClass('bp-is-open');
        });
    });

    describe('handleSelect', () => {
        test('should close the palette and call onColorSelect if a color is selected', async () => {
            const onColorSelect = jest.fn();
            getWrapper({ onColorSelect });

            const toggleButton = await getToggleButton();
            await userEvent.click(toggleButton);

            // tab to color button and select
            await userEvent.tab();
            await userEvent.keyboard('{enter}');

            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).not.toHaveClass('bp-is-open');
            expect(onColorSelect).toHaveBeenCalledWith(defaultColor);
        });
    });

    describe('controls layer pinning', () => {
        // The palette lives inside the auto-hiding ControlsLayer, so it pins the layer open
        // while up (moving the cursor off the swatches must not tear the toolbar down) and releases on close.
        test('should pin the controls layer open while open and release it on close', async () => {
            const setIsForced = jest.fn();
            getWrapper({}, setIsForced);

            const toggleButton = await getToggleButton();
            await userEvent.click(toggleButton);
            expect(setIsForced).toHaveBeenLastCalledWith(true);

            await userEvent.click(toggleButton);
            expect(setIsForced).toHaveBeenLastCalledWith(false);
        });
    });
});
