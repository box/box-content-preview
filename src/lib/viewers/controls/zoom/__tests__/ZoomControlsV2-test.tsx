import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import { TABULAR_DIGIT_CLASS } from '../../../../TabularDigits';
import ControlsBarV2 from '../../controls-bar/ControlsBarV2';
import ZoomControlsV2 from '../ZoomControlsV2';

describe('ZoomControlsV2', () => {
    const getWrapper = (props = {}) =>
        render(
            <BlueprintProviders>
                <ControlsBarV2>
                    <ZoomControlsV2 onZoomIn={jest.fn()} onZoomOut={jest.fn()} {...props} />
                </ControlsBarV2>
            </BlueprintProviders>,
        );
    const getZoomIn = () => screen.getByRole('button', { name: __('zoom_in') });
    const getZoomOut = () => screen.getByRole('button', { name: __('zoom_out') });

    describe('event handlers', () => {
        test('should handle zoom in click', async () => {
            const onZoomIn = jest.fn();
            getWrapper({ onZoomIn });

            await userEvent.click(getZoomIn());

            expect(onZoomIn).toHaveBeenCalled();
        });

        test('should handle zoom out click', async () => {
            const onZoomOut = jest.fn();
            getWrapper({ onZoomOut });

            await userEvent.click(getZoomOut());

            expect(onZoomOut).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test.each`
            minScale    | scale     | disabled
            ${null}     | ${1}      | ${false}
            ${NaN}      | ${0.1}    | ${true}
            ${0.5}      | ${1}      | ${false}
            ${0.5}      | ${0.5005} | ${true}
            ${0.5}      | ${0.5}    | ${true}
            ${-50}      | ${0.1}    | ${true}
            ${-50}      | ${0.2}    | ${false}
            ${Infinity} | ${0.2}    | ${false}
        `('should set disabled for zoom out to $disabled for $scale / $minScale', ({ disabled, minScale, scale }) => {
            getWrapper({ minScale, scale });

            if (disabled) {
                expect(getZoomOut()).toBeDisabled();
            } else {
                expect(getZoomOut()).toBeEnabled();
            }
        });

        test.each`
            maxScale    | scale      | disabled
            ${null}     | ${1}       | ${false}
            ${NaN}      | ${100}     | ${true}
            ${10}       | ${1}       | ${false}
            ${50}       | ${49.9999} | ${true}
            ${50}       | ${50}      | ${true}
            ${500}      | ${100}     | ${true}
            ${500}      | ${99}      | ${false}
            ${Infinity} | ${99}      | ${false}
        `('should set disabled for zoom in to $disabled for $scale / $maxScale', ({ disabled, maxScale, scale }) => {
            getWrapper({ maxScale, scale });

            if (disabled) {
                expect(getZoomIn()).toBeDisabled();
            } else {
                expect(getZoomIn()).toBeEnabled();
            }
        });

        test.each`
            scale    | zoom
            ${1}     | ${'100%'}
            ${1.49}  | ${'149%'}
            ${1.499} | ${'150%'}
            ${10}    | ${'1000%'}
            ${100}   | ${'10000%'}
        `('should format $scale to $zoom properly', ({ scale, zoom }) => {
            getWrapper({ scale });

            expect(screen.getByTestId('bp-ZoomControls-current')).toHaveTextContent(zoom);
        });

        test('should render the controls with their test ids', () => {
            getWrapper();

            expect(getZoomOut()).toHaveAttribute('data-testid', 'bp-ZoomControls-out');
            expect(getZoomIn()).toHaveAttribute('data-testid', 'bp-ZoomControls-in');
            expect(screen.getByTestId('bp-ZoomControls-current')).toHaveAttribute('title', __('zoom_current_scale'));
        });

        test('should render the buttons and current scale inside a pill', () => {
            getWrapper();

            const pill = screen.getByTestId('bp-ControlsPill');

            expect(pill).toContainElement(getZoomOut());
            expect(pill).toContainElement(getZoomIn());
            expect(pill).toContainElement(screen.getByTestId('bp-ZoomControls-current'));
            expect(getZoomOut()).toHaveClass('bp-ControlsPillV2-button');
            expect(getZoomIn()).toHaveClass('bp-ControlsPillV2-button');
        });

        test('should default the scale to 100%', () => {
            getWrapper();

            expect(screen.getByTestId('bp-ZoomControls-current')).toHaveTextContent('100%');
        });

        test('should render the scale in the on-dark text color', () => {
            getWrapper();

            expect(screen.getByTestId('bp-ZoomControls-current').className).toMatch(/textOnDarkDefault/);
        });

        test('should give each zoom digit a fixed width so the zoom in button does not shift', () => {
            getWrapper({ scale: 1.25 });

            const current = screen.getByTestId('bp-ZoomControls-current');

            expect(current.querySelectorAll(`.${TABULAR_DIGIT_CLASS}`)).toHaveLength(3);
            expect(current.querySelector('[aria-hidden]')).toContainElement(
                current.querySelector(`.${TABULAR_DIGIT_CLASS}`),
            );
            expect(screen.getByText('125%')).toBeInTheDocument(); // The whole value, read once by screen readers
        });

        test('should default the resin targets', () => {
            getWrapper();

            expect(getZoomIn()).toHaveAttribute('data-resin-target', 'zoomIn');
            expect(getZoomOut()).toHaveAttribute('data-resin-target', 'zoomOut');
        });

        test('should allow hosts to override the resin targets', () => {
            getWrapper({ resinTargetZoomIn: 'galleryZoomIn', resinTargetZoomOut: 'galleryZoomOut' });

            expect(getZoomIn()).toHaveAttribute('data-resin-target', 'galleryZoomIn');
            expect(getZoomOut()).toHaveAttribute('data-resin-target', 'galleryZoomOut');
        });

        test.each`
            key           | getButton
            ${'zoom_in'}  | ${getZoomIn}
            ${'zoom_out'} | ${getZoomOut}
        `('should show the $key tooltip on hover', async ({ getButton, key }) => {
            getWrapper();

            await userEvent.hover(getButton());

            expect(await screen.findByRole('tooltip')).toHaveTextContent(__(key));
        });
    });
});
