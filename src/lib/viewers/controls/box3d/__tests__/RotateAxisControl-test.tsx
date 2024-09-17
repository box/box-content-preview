import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RotateAxisControl, { Props } from '../RotateAxisControl';

describe('RotateAxisControl', () => {
    const renderView = (props = {}) =>
        render(<RotateAxisControl axis="x" onRotateOnAxisChange={jest.fn()} {...props} />);

    describe('onRotateOnAxisChange()', () => {
        test('should indicate a negative rotation when the left button is clicked', async () => {
            const onRotateOnAxisChange = jest.fn();
            renderView({ onRotateOnAxisChange });

            await userEvent.click(screen.getByTestId('bp-rotate-axis-control-left'));

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ x: -90 });
        });

        test('should indicate a positive rotation when the right button is clicked', async () => {
            const onRotateOnAxisChange = jest.fn();
            renderView({ onRotateOnAxisChange });

            await userEvent.click(screen.getByTestId('bp-rotate-axis-control-right'));

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ x: 90 });
        });
    });
});
