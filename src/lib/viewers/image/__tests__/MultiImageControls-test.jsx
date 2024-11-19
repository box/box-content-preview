import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MultiImageControls from '../MultiImageControls';

describe('MultiImageControls', () => {
    const getWrapper = (props = {}) =>
        render(
            <MultiImageControls
                onFullscreenToggle={jest.fn()}
                onPageChange={jest.fn()}
                onPageSubmit={jest.fn()}
                onZoomIn={jest.fn()}
                onZoomOut={jest.fn()}
                pageCount={3}
                pageNumber={1}
                {...props}
            />,
        );

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const controlBar = await screen.findByTestId('bp-ControlsBar');

            expect(controlBar).toBeInTheDocument();
        });

        test('should pass down props to FullscreenToggle', async () => {
            const onFullscreenToggle = jest.fn();
            getWrapper({ onFullscreenToggle });
            const toggle = await screen.findByTitle(__('enter_fullscreen'));

            await userEvent.click(toggle);

            expect(onFullscreenToggle).toHaveBeenCalled();
        });

        test('should pass down props to PageControls', async () => {
            const onPageChange = jest.fn();
            const onPageSubmit = jest.fn();
            getWrapper({ onPageChange, onPageSubmit });
            const pageNextButton = await screen.findByTitle(__('next_page'));
            const pageInputButton = await screen.findByTitle(__('enter_page_num'));

            await userEvent.click(pageNextButton);

            await userEvent.click(pageInputButton);
            const pageInput = await screen.findByTitle(__('enter_page_num'));
            await userEvent.clear(pageInput);
            await userEvent.type(pageInput, '2');
            await userEvent.type(pageInput, '{Enter}');

            expect(onPageChange).toHaveBeenCalled();
            expect(onPageSubmit).toHaveBeenCalled();
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
