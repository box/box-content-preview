import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FindBarToggle from '../FindBarToggle';
import IconSearch24 from '../../icons/IconSearch24';

describe('FindBarToggle', () => {
    const getWrapper = (props = {}) => render(<FindBarToggle {...props} />);

    describe('event handlers', () => {
        test('should forward the click from the button', async () => {
            const onToggle = jest.fn();
            getWrapper({ onFindBarToggle: onToggle });
            const button = await screen.findByRole('button');

            await userEvent.click(button);

            expect(onToggle).toHaveBeenCalledWith(button);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper({ onFindBarToggle: jest.fn() });
            const button = await screen.findByRole('button');
            const icon = await screen.findByTestId('IconSearch24');

            expect(button).toBeInTheDocument();
            expect(icon).toBeInTheDocument();
        });

        test('should return an empty wrapper if no callback is defined', () => {
            getWrapper();
            const button = screen.queryByRole('button');
            const icon = screen.queryByTestId('IconSearch24');

            expect(button).toBeNull();
            expect(icon).toBeNull();
        });

        test('should render IconSearchMedium24', async () => {
            getWrapper({ onFindBarToggle: jest.fn() });

            expect(await screen.findByTestId('IconSearchMedium24')).toBeInTheDocument();
        });
    });
});
