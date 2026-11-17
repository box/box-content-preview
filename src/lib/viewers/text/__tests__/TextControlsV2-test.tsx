import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../BlueprintProviders';
import TextControlsV2 from '../TextControlsV2';
import { Props } from '../TextControls';

describe('TextControlsV2', () => {
    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <TextControlsV2 onFullscreenToggle={jest.fn()} onZoomIn={jest.fn()} onZoomOut={jest.fn()} {...props} />,
            {
                wrapper: BlueprintProviders,
            },
        );

    describe('render', () => {
        test('should render zoom and fullscreen inside the Blueprint toolbar', () => {
            getWrapper();

            const toolbar = screen.getByRole('toolbar');

            expect(toolbar).toHaveAttribute('data-testid', 'bp-ControlsBar');
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('zoom_out') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('zoom_in') }));
            expect(toolbar).toContainElement(screen.getByRole('button', { name: __('enter_fullscreen') }));
        });

        test('should show the current scale', () => {
            getWrapper({ scale: 1.5 });

            expect(screen.getByTestId('bp-ZoomControls-current')).toHaveTextContent('150%');
        });

        test('should disable zooming past the limits', () => {
            getWrapper({ maxScale: 10, minScale: 0.1, scale: 10 });

            expect(screen.getByRole('button', { name: __('zoom_in') })).toBeDisabled();
            expect(screen.getByRole('button', { name: __('zoom_out') })).toBeEnabled();
        });
    });

    describe('event handlers', () => {
        test('should zoom in and out', async () => {
            const onZoomIn = jest.fn();
            const onZoomOut = jest.fn();
            getWrapper({ onZoomIn, onZoomOut });

            await userEvent.click(screen.getByRole('button', { name: __('zoom_in') }));
            await userEvent.click(screen.getByRole('button', { name: __('zoom_out') }));

            expect(onZoomIn).toHaveBeenCalled();
            expect(onZoomOut).toHaveBeenCalled();
        });

        test('should toggle fullscreen with the toggle so focus can return to it', async () => {
            const onFullscreenToggle = jest.fn();
            getWrapper({ onFullscreenToggle });

            const toggle = screen.getByRole('button', { name: __('enter_fullscreen') });

            await userEvent.click(toggle);

            expect(onFullscreenToggle).toHaveBeenCalledWith(true, toggle);
        });
    });
});
