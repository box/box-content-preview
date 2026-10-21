import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import ResetControlV2 from '../ResetControlV2';

describe('ResetControlV2', () => {
    const getWrapper = (onReset = jest.fn()) =>
        render(
            <Toolbar.Root aria-label="Controls">
                <ResetControlV2 onReset={onReset} />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

    test('should render a toolbar button with its resin target', () => {
        getWrapper();

        const button = screen.getByRole('button', { name: __('box3d_reset') });

        expect(screen.getByRole('toolbar')).toContainElement(button);
        expect(button).toHaveAttribute('data-resin-target', 'resetView');
    });

    test('should reset the view on click without passing the click event', async () => {
        const onReset = jest.fn();
        getWrapper(onReset);

        await userEvent.click(screen.getByRole('button', { name: __('box3d_reset') }));

        expect(onReset).toHaveBeenCalledWith();
    });
});
