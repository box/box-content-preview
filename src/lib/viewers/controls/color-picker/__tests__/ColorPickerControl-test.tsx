import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPickerControl from '../ColorPickerControl';

describe('ColorPickerControl', () => {
    const defaultColor = '#fff';

    const getWrapper = (props = {}) =>
        render(<ColorPickerControl colors={[defaultColor]} onColorSelect={jest.fn()} {...props} />);

    const getColorPickerPalette = async () => screen.findByTestId('bp-ColorPickerControl-palette');

    const getToggleButton = async () => screen.findByTestId('bp-ColorPickerControl-toggle');

    describe('render', () => {
        test('should not render ColorPickerPalette when the component is first mounted', async () => {
            getWrapper();

            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).not.toHaveClass('bp-is-open');
        });

        test('should render ColorPickerPalette when the toggle button is clicked', async () => {
            getWrapper();

            const toggleButton = await getToggleButton();
            await userEvent.click(toggleButton);
            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).toHaveClass('bp-is-open');
        });

        test('should apply toggle background when the toggle button is clicked and remove the background when the button is blurred', async () => {
            getWrapper();

            const toggleButton = await getToggleButton();
            await userEvent.click(toggleButton);
            expect(toggleButton).toHaveClass('bp-is-active');

            // tab twice to navigate through color palette buttons
            await userEvent.tab();
            await userEvent.tab();
            expect(toggleButton).not.toHaveClass('bp-is-active');
        });

        test('should close the palette when button is blurred', async () => {
            getWrapper();
            const toggleButton = await getToggleButton();

            await userEvent.click(toggleButton);
            const colorPickerPalette = await getColorPickerPalette();
            expect(colorPickerPalette).toHaveClass('bp-is-open');

            // tab twice to navigate through color palette buttons
            await userEvent.tab();
            await userEvent.tab();
            expect(colorPickerPalette).not.toHaveClass('bp-is-open');
        });

        test('should not close the palette when palette is active', async () => {
            const wrapper = getWrapper();

            const toggleButton = await getToggleButton();
            const colorPickerPalette = await getColorPickerPalette();
            await userEvent.click(toggleButton);
            expect(colorPickerPalette).toHaveClass('bp-is-open');

            // focus on color picker button
            await userEvent.tab();
            expect(colorPickerPalette).toHaveClass('bp-is-open');
        });

        test('should call focus and stop propagation when mouse down', async () => {
            getWrapper();

            const toggleButton = await getToggleButton();
            await userEvent.click(toggleButton);

            expect(toggleButton).toHaveFocus();
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
});
