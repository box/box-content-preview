import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RotateAxisControlV2 from '../RotateAxisControlV2';

describe('RotateAxisControlV2', () => {
    describe('render', () => {
        test('should render the axis name between labelled rotate buttons', () => {
            render(<RotateAxisControlV2 axis="y" onRotateOnAxisChange={jest.fn()} />);

            const control = screen.getByTestId('bp-rotate-axis-control-y');

            expect(within(control).getByTestId('bp-rotate-axis-control-label')).toHaveTextContent('Y');
            expect(within(control).getByRole('button', { name: 'Rotate left around Y axis' })).toHaveAttribute(
                'data-resin-target',
                'rotateAxisLeft',
            );
            expect(within(control).getByRole('button', { name: 'Rotate right around Y axis' })).toHaveAttribute(
                'data-resin-target',
                'rotateAxisRight',
            );
        });

        test('should keep the mirrored rotate right icon out of the accessible name', () => {
            render(<RotateAxisControlV2 axis="x" onRotateOnAxisChange={jest.fn()} />);

            const icon = screen.getByTestId('bp-rotate-axis-control-right').querySelector('svg');

            expect(icon).toHaveClass('bp-RotateRight');
            expect(icon).toHaveAttribute('role', 'presentation');
            expect(screen.getByRole('button', { name: 'Rotate right around X axis' })).toBeInTheDocument();
        });
    });

    describe('onRotateOnAxisChange()', () => {
        test('should indicate a negative rotation when the left button is clicked', async () => {
            const user = userEvent.setup();
            const onRotateOnAxisChange = jest.fn();
            render(<RotateAxisControlV2 axis="x" onRotateOnAxisChange={onRotateOnAxisChange} />);

            await user.click(screen.getByTestId('bp-rotate-axis-control-left'));

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ x: -90 });
        });

        test('should indicate a positive rotation when the right button is clicked', async () => {
            const user = userEvent.setup();
            const onRotateOnAxisChange = jest.fn();
            render(<RotateAxisControlV2 axis="x" onRotateOnAxisChange={onRotateOnAxisChange} />);

            await user.click(screen.getByTestId('bp-rotate-axis-control-right'));

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ x: 90 });
        });

        test('should rotate when a button is activated with the keyboard', async () => {
            const user = userEvent.setup();
            const onRotateOnAxisChange = jest.fn();
            render(<RotateAxisControlV2 axis="z" onRotateOnAxisChange={onRotateOnAxisChange} />);

            await user.tab();
            await user.keyboard('{Enter}');

            expect(onRotateOnAxisChange).toHaveBeenCalledWith({ z: -90 });
        });
    });
});
