import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import RotateControlV2 from '../RotateControlV2';

jest.mock('@box/blueprint-web-assets/icons/Medium/RotateLeft', () => ({
    __esModule: true,
    default: () => <svg data-testid="RotateLeft" />,
}));

describe('RotateControlV2', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BlueprintProviders>
            <Toolbar.Root>{children}</Toolbar.Root>
        </BlueprintProviders>
    );
    const getWrapper = (props = {}) => render(<RotateControlV2 onRotateLeft={jest.fn()} {...props} />, { wrapper });
    const getButton = () => screen.getByRole('button', { name: __('rotate_left') });

    describe('event handlers', () => {
        test('should invoke onRotateLeft prop on click', async () => {
            const onRotateLeft = jest.fn();
            getWrapper({ onRotateLeft });

            await userEvent.click(getButton());

            expect(onRotateLeft).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            getWrapper();

            expect(getButton()).toHaveAttribute('data-resin-target', 'rotate');
            expect(screen.getByTestId('RotateLeft')).toBeInTheDocument();
        });

        test('should show the label as a tooltip on focus', async () => {
            getWrapper();

            await userEvent.tab();

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__('rotate_left'));
        });
    });
});
