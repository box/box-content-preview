import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import Image360ControlsV2 from '../Image360ControlsV2';
import { Props } from '../Image360Controls';

describe('Image360ControlsV2', () => {
    const getWrapper = (props: Partial<Props> = {}) =>
        render(<Image360ControlsV2 isVrShown onFullscreenToggle={jest.fn()} onVrToggle={jest.fn()} {...props} />, {
            wrapper: BlueprintProviders,
        });

    test('should render fullscreen and VR inside the Blueprint toolbar', () => {
        getWrapper();

        const toolbar = screen.getByRole('toolbar');

        expect(toolbar).toHaveAttribute('data-testid', 'bp-ControlsBar');
        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('enter_fullscreen') }));
        expect(toolbar).toContainElement(screen.getByRole('button', { name: __('box3d_toggle_vr') }));
    });

    test('should leave out VR until it is available', () => {
        getWrapper({ isVrShown: false });

        expect(screen.getByRole('button', { name: __('enter_fullscreen') })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: __('box3d_toggle_vr') })).not.toBeInTheDocument();
    });

    test('should toggle fullscreen with the toggle so focus can return to it', async () => {
        const onFullscreenToggle = jest.fn();
        getWrapper({ onFullscreenToggle });

        const toggle = screen.getByRole('button', { name: __('enter_fullscreen') });
        await userEvent.click(toggle);

        expect(onFullscreenToggle).toHaveBeenCalledWith(true, toggle);
    });

    test('should toggle VR', async () => {
        const onVrToggle = jest.fn();
        getWrapper({ onVrToggle });

        await userEvent.click(screen.getByRole('button', { name: __('box3d_toggle_vr') }));

        expect(onVrToggle).toHaveBeenCalled();
    });
});
