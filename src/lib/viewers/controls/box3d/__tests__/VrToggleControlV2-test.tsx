import React from 'react';
import { Toolbar } from '@box/blueprint-web';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import VrToggleControlV2 from '../VrToggleControlV2';

describe('VrToggleControlV2', () => {
    const getWrapper = (props = {}) =>
        render(
            <Toolbar.Root aria-label="Controls">
                <VrToggleControlV2 isVrShown onVrToggle={jest.fn()} {...props} />
            </Toolbar.Root>,
            { wrapper: BlueprintProviders },
        );

    test('should render a toolbar button with its resin target', () => {
        getWrapper();

        const toggle = screen.getByRole('button', { name: __('box3d_toggle_vr') });

        expect(screen.getByRole('toolbar')).toContainElement(toggle);
        expect(toggle).toHaveAttribute('data-resin-target', 'vrToggle');
    });

    test('should toggle VR on click', async () => {
        const onVrToggle = jest.fn();
        getWrapper({ onVrToggle });

        await userEvent.click(screen.getByRole('button', { name: __('box3d_toggle_vr') }));

        expect(onVrToggle).toHaveBeenCalled();
    });

    test('should render nothing if VR is not available', () => {
        getWrapper({ isVrShown: false });

        expect(screen.queryByRole('button', { name: __('box3d_toggle_vr') })).not.toBeInTheDocument();
    });

    describe('with buttonType icon', () => {
        const getIconWrapper = (props = {}) =>
            render(<VrToggleControlV2 buttonType="icon" isVrShown onVrToggle={jest.fn()} {...props} />, {
                wrapper: BlueprintProviders,
            });

        test('should render a standalone button outside a toolbar', () => {
            getIconWrapper({ className: 'custom' });

            const toggle = screen.getByRole('button', { name: __('box3d_toggle_vr') });

            expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
            expect(toggle).toHaveClass('custom');
            expect(toggle).toHaveAttribute('data-resin-target', 'vrToggle');
            expect(toggle).toHaveAttribute('data-target-id', 'VrToggleControlV2-toggle');
        });

        test('should toggle VR on click', async () => {
            const onVrToggle = jest.fn();
            getIconWrapper({ onVrToggle });

            await userEvent.click(screen.getByRole('button', { name: __('box3d_toggle_vr') }));

            expect(onVrToggle).toHaveBeenCalled();
        });

        test('should render nothing if VR is not available', () => {
            getIconWrapper({ isVrShown: false });

            expect(screen.queryByRole('button', { name: __('box3d_toggle_vr') })).not.toBeInTheDocument();
        });
    });
});
