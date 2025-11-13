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

        test('should apply modernized class when modernizationEnabled is true', async () => {
            getWrapper({ onFindBarToggle: jest.fn(), modernizationEnabled: true });
            const button = await screen.findByRole('button');

            expect(button).toHaveClass('bp-FindBarToggle--modernized');
        });

        test('should not apply modernized class when modernizationEnabled is false', async () => {
            getWrapper({ onFindBarToggle: jest.fn(), modernizationEnabled: false });
            const button = await screen.findByRole('button');

            expect(button).not.toHaveClass('bp-FindBarToggle--modernized');
        });

        test('should render IconSearchMedium24 when modernizationEnabled is true', async () => {
            getWrapper({ onFindBarToggle: jest.fn(), modernizationEnabled: true });

            expect(await screen.findByTestId('IconSearchMedium24')).toBeInTheDocument();
            expect(screen.queryByTestId('IconSearch24')).not.toBeInTheDocument();
        });

        test('should render IconSearch24 when modernizationEnabled is false', async () => {
            getWrapper({ onFindBarToggle: jest.fn(), modernizationEnabled: false });

            expect(await screen.findByTestId('IconSearch24')).toBeInTheDocument();
            expect(screen.queryByTestId('IconSearchMedium24')).not.toBeInTheDocument();
        });
    });
});
