import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorPickerPalette from '../ColorPickerPalette';

describe('ColorPickerPalette', () => {
    const defaultColor = '#fff';
    const colors = [defaultColor];

    const getWrapper = (props = {}) =>
        render(<ColorPickerPalette colors={colors} onBlur={jest.fn()} onSelect={jest.fn()} {...props} />);

    describe('render', () => {
        test('should render a single color swatch', async () => {
            getWrapper();

            const button = await screen.findByRole('button');
            expect(button).toBeInTheDocument();
        });
    });

    describe('onSelect', () => {
        test('should call onSelect with a button is clicked', async () => {
            const onSelect = jest.fn();
            getWrapper({ onSelect });

            const button = await screen.findByRole('button');
            await userEvent.click(button);

            expect(onSelect).toHaveBeenCalledWith(defaultColor);
        });
    });
});
