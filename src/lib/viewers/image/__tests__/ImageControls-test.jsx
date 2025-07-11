import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageControls from '../ImageControls';

describe('ImageControls', () => {
    const getWrapper = (props = {}) =>
        render(
            <ImageControls
                onAnnotationColorChange={jest.fn()}
                onFullscreenToggle={jest.fn()}
                onRotateLeft={jest.fn()}
                onZoomIn={jest.fn()}
                onZoomOut={jest.fn()}
                {...props}
            />,
        );
    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const controlBars = await screen.findAllByTestId('bp-ControlsBar');

            expect(controlBars.length).toBe(2);
        });

        test('should pass down props to FullscreenToggle', async () => {
            const onFullscreenToggle = jest.fn();
            getWrapper({ onFullscreenToggle });
            const toggle = await screen.findByTitle(__('enter_fullscreen'));

            await userEvent.click(toggle);

            expect(onFullscreenToggle).toHaveBeenCalled();
        });

        test('should pass down props to RotateControl', async () => {
            const onRotateLeft = jest.fn();
            getWrapper({ onRotateLeft });
            const toggle = await screen.findByTitle(__('rotate_left'));

            await userEvent.click(toggle);

            expect(onRotateLeft).toHaveBeenCalled();
        });

        test('should pass down props to ZoomControls', async () => {
            const onZoomIn = jest.fn();
            const onZoomOut = jest.fn();
            getWrapper({ onZoomIn, onZoomOut });
            const zoomIn = await screen.findByTitle(__('zoom_in'));
            const zoomOut = await screen.findByTitle(__('zoom_out'));

            await userEvent.click(zoomIn);
            await userEvent.click(zoomOut);

            expect(onZoomIn).toHaveBeenCalled();
            expect(onZoomOut).toHaveBeenCalled();
        });
    });
});
