import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RotateAxisControls from '../RotateAxisControls';

describe('RotateAxisControls', () => {
    const renderView = (props = {}) => render(<RotateAxisControls onRotateOnAxisChange={jest.fn()} {...props} />);

    describe('render()', () => {
        test('should return a valid wrapper', async () => {
            const onRotateOnAxisChange = jest.fn();
            renderView({ onRotateOnAxisChange });

            expect(screen.getByTestId('bp-rotate-axis-controls-label')).toHaveTextContent('Rotate Model');
            await userEvent.click(
                within(screen.getByTestId('bp-rotate-axis-control-x')!).getByTestId('bp-rotate-axis-control-left'),
            );
            await userEvent.click(
                within(screen.getByTestId('bp-rotate-axis-control-y')!).getByTestId('bp-rotate-axis-control-right'),
            );
            await userEvent.click(
                within(screen.getByTestId('bp-rotate-axis-control-z')!).getByTestId('bp-rotate-axis-control-left'),
            );

            expect(onRotateOnAxisChange.mock.calls.at(0)).toEqual([{ x: -90 }]);
            expect(onRotateOnAxisChange.mock.calls.at(1)).toEqual([{ y: 90 }]);
            expect(onRotateOnAxisChange.mock.calls.at(2)).toEqual([{ z: -90 }]);
        });
    });
});
