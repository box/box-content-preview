import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RotateAxisControlsV2 from '../RotateAxisControlsV2';

describe('RotateAxisControlsV2', () => {
    describe('render', () => {
        test('should render a labelled group with a control for each axis', () => {
            render(<RotateAxisControlsV2 onRotateOnAxisChange={jest.fn()} />);

            const group = screen.getByRole('group', { name: 'Rotate Model' });

            expect(within(group).getByTestId('bp-rotate-axis-controls-label')).toHaveTextContent('Rotate Model');
            expect(within(group).getByTestId('bp-rotate-axis-control-x')).toBeInTheDocument();
            expect(within(group).getByTestId('bp-rotate-axis-control-y')).toBeInTheDocument();
            expect(within(group).getByTestId('bp-rotate-axis-control-z')).toBeInTheDocument();
        });
    });

    describe('onRotateOnAxisChange()', () => {
        test.each`
            name                            | change
            ${'Rotate left around X axis'}  | ${{ x: -90 }}
            ${'Rotate right around Y axis'} | ${{ y: 90 }}
            ${'Rotate left around Z axis'}  | ${{ z: -90 }}
        `('should pass $change when "$name" is clicked', async ({ change, name }) => {
            const user = userEvent.setup();
            const onRotateOnAxisChange = jest.fn();
            render(<RotateAxisControlsV2 onRotateOnAxisChange={onRotateOnAxisChange} />);

            await user.click(screen.getByRole('button', { name }));

            expect(onRotateOnAxisChange).toHaveBeenCalledTimes(1);
            expect(onRotateOnAxisChange).toHaveBeenCalledWith(change);
        });
    });
});
