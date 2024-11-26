import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RotateControl from '../RotateControl';

describe('RotateControl', () => {
    const getWrapper = (props = {}) => render(<RotateControl onRotateLeft={jest.fn()} {...props} />);
    const getButton = async () => screen.findByRole('button', { name: __('rotate_left') });

    describe('event handlers', () => {
        test('should invoke onRotateLeft prop on click', async () => {
            const onRotateLeft = jest.fn();
            getWrapper({ onRotateLeft });
            const button = await getButton();

            await userEvent.click(button);

            expect(onRotateLeft).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const button = await getButton();
            const icon = await screen.findByTestId('IconRotate24');

            expect(button).toBeInTheDocument();
            expect(icon).toBeInTheDocument();
        });
    });
});
