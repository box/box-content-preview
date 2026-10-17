import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import FindBarToggleV2 from '../FindBarToggleV2';

jest.mock('@box/blueprint-web-assets/icons/Medium/Search', () => ({
    __esModule: true,
    default: () => <svg data-testid="Search" />,
}));

describe('FindBarToggleV2', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <Toolbar.Root>{children}</Toolbar.Root>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) => render(<FindBarToggleV2 {...props} />, { wrapper });
    const getButton = () => screen.getByRole('button', { name: __('toggle_findbar') });

    describe('event handlers', () => {
        test('should forward the click from the button', async () => {
            const onToggle = jest.fn();
            getWrapper({ onFindBarToggle: onToggle });
            const button = getButton();

            await userEvent.click(button);

            expect(onToggle).toHaveBeenCalledWith(button);
        });

        test('should forward the button even if the click lands on the icon', async () => {
            const onToggle = jest.fn();
            getWrapper({ onFindBarToggle: onToggle });

            await userEvent.click(screen.getByTestId('Search'));

            expect(onToggle).toHaveBeenCalledWith(getButton());
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            getWrapper({ onFindBarToggle: jest.fn() });

            expect(getButton()).toHaveAttribute('data-resin-target', 'findBar');
            expect(screen.getByTestId('Search')).toBeInTheDocument();
        });

        test('should return an empty wrapper if no callback is defined', () => {
            getWrapper();

            expect(screen.queryByRole('button')).toBeNull();
            expect(screen.queryByTestId('Search')).toBeNull();
        });

        test('should show the label as a tooltip on focus', async () => {
            getWrapper({ onFindBarToggle: jest.fn() });

            await userEvent.tab();

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('toggle_findbar'));
        });
    });
});
