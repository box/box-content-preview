import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ZoomControls from '../ZoomControls';

describe('ZoomControls', () => {
    const getWrapper = (props = {}) => render(<ZoomControls onZoomIn={jest.fn()} onZoomOut={jest.fn()} {...props} />);
    const getZoomIn = async () => screen.findByRole('button', { name: __('zoom_in') });
    const getZoomOut = async () => screen.findByRole('button', { name: __('zoom_out') });

    describe('event handlers', () => {
        test('should handle zoom in click', async () => {
            const onZoomIn = jest.fn();
            getWrapper({ onZoomIn });
            const zoomIn = await getZoomIn();

            await userEvent.click(zoomIn);

            expect(onZoomIn).toHaveBeenCalled();
        });

        test('should handle zoom out click', async () => {
            const onZoomOut = jest.fn();
            getWrapper({ onZoomOut });
            const zoomOut = await getZoomOut();

            await userEvent.click(zoomOut);

            expect(onZoomOut).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test.each`
            minScale | scale     | disabled
            ${null}  | ${1}      | ${false}
            ${0.5}   | ${1}      | ${false}
            ${0.5}   | ${0.5005} | ${true}
            ${0.5}   | ${0.5}    | ${true}
            ${-50}   | ${0.1}    | ${true}
            ${-50}   | ${0.2}    | ${false}
        `(
            'should set disabled for zoom out to $disabled for $scale / $minScale',
            async ({ disabled, minScale, scale }) => {
                getWrapper({ minScale, scale });
                const zoomOut = await getZoomOut();

                if (disabled) {
                    expect(zoomOut).toBeDisabled();
                } else {
                    expect(zoomOut).not.toBeDisabled();
                }

                expect(screen.getByTestId('IconMinusMedium24')).toBeVisible();
                expect(screen.getByTestId('IconPlusMedium24')).toBeVisible();
            },
        );

        test.each`
            maxScale | scale      | disabled
            ${null}  | ${1}       | ${false}
            ${10}    | ${1}       | ${false}
            ${50}    | ${49.9999} | ${true}
            ${50}    | ${50}      | ${true}
            ${500}   | ${100}     | ${true}
            ${500}   | ${99}      | ${false}
        `(
            'should set disabled for zoom in to $disabled for $scale / $maxScale',
            async ({ disabled, maxScale, scale }) => {
                getWrapper({ maxScale, scale });
                const zoomIn = await getZoomIn();

                if (disabled) {
                    expect(zoomIn).toBeDisabled();
                } else {
                    expect(zoomIn).not.toBeDisabled();
                }
            },
        );

        test.each`
            scale    | zoom
            ${1}     | ${'100%'}
            ${1.49}  | ${'149%'}
            ${1.499} | ${'150%'}
            ${10}    | ${'1000%'}
            ${100}   | ${'10000%'}
        `('should format $scale to $zoom properly', async ({ scale, zoom }) => {
            getWrapper({ scale });
            const currentZoom = await screen.findByText(zoom);

            expect(currentZoom).toBeInTheDocument();
        });

        test('should return a valid wrapper', async () => {
            getWrapper({ scale: 1 });
            const zoomIn = await getZoomIn();
            const zoomOut = await getZoomOut();
            const currentZoom = await screen.findByText('100%');

            expect(zoomIn).toBeInTheDocument();
            expect(zoomOut).toBeInTheDocument();
            expect(currentZoom).toBeInTheDocument();
        });
    });
});
