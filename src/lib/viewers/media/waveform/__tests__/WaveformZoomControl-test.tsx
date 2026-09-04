import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WAVEFORM_ZOOM_DISMISS_MS } from '../constants';
import WaveformZoomControl from '../WaveformZoomControl';

describe('WaveformZoomControl', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    test('should expand on hover and report slider zoom changes', async () => {
        const user = userEvent.setup();
        const onZoomChange = jest.fn();
        render(<WaveformZoomControl maxZoom={4} onZoomChange={onZoomChange} zoomLevel={1} />);

        const control = screen.getByTestId('bp-waveform-zoom');
        const flyout = control.querySelector('.bp-WaveformZoomControl-flyout');
        expect(control).not.toHaveClass('bp-is-open');
        expect(flyout).not.toHaveClass('bp-is-open');
        expect(screen.getByRole('button', { name: __('zoom_in') })).toHaveAttribute(
            'data-resin-target',
            'waveformZoomIn',
        );

        await user.hover(control);
        expect(control).toHaveClass('bp-is-open');
        expect(flyout).toHaveClass('bp-is-open');
        expect(screen.getByRole('button', { name: __('zoom_out') })).toHaveAttribute(
            'data-resin-target',
            'waveformZoomOut',
        );

        const slider = screen.getByRole('slider', { name: __('media_zoom_slider') });
        expect(slider).toHaveAttribute('data-resin-target', 'waveformZoomSlider');

        await user.tab();
        expect(screen.getByRole('button', { name: __('zoom_in') })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: __('zoom_out') })).toHaveFocus();
        await user.tab();
        expect(slider).toHaveFocus();
        await user.keyboard('{ArrowRight}');

        expect(onZoomChange).toHaveBeenCalled();
        expect(onZoomChange.mock.calls[0][0]).toBeGreaterThan(1);
    });

    test('should keep the slider open through the dismiss delay after mouse leave', async () => {
        jest.useFakeTimers();
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
        const onZoomChange = jest.fn();
        render(<WaveformZoomControl maxZoom={4} onZoomChange={onZoomChange} zoomLevel={1} />);

        const control = screen.getByTestId('bp-waveform-zoom');
        const flyout = control.querySelector('.bp-WaveformZoomControl-flyout');
        await user.hover(control);
        expect(control).toHaveClass('bp-is-open');
        expect(flyout).toHaveClass('bp-is-open');

        await user.unhover(control);
        expect(control).toHaveClass('bp-is-open');
        expect(flyout).toHaveClass('bp-is-open');

        act(() => {
            jest.advanceTimersByTime(WAVEFORM_ZOOM_DISMISS_MS - 1);
        });
        expect(flyout).toHaveClass('bp-is-open');

        act(() => {
            jest.advanceTimersByTime(1);
        });
        expect(flyout).not.toHaveClass('bp-is-open');
        expect(control).not.toHaveClass('bp-is-open');
    });

    test('should stay open while revealed from a trackpad zoom and follow the zoom level', () => {
        const onZoomChange = jest.fn();
        const { rerender } = render(
            <WaveformZoomControl isRevealed maxZoom={4} onZoomChange={onZoomChange} zoomLevel={1} />,
        );

        const control = screen.getByTestId('bp-waveform-zoom');
        expect(control).toHaveClass('bp-is-open');
        expect(screen.getByRole('slider', { name: __('media_zoom_slider') })).toHaveAttribute('aria-valuenow', '0');

        rerender(<WaveformZoomControl isRevealed maxZoom={4} onZoomChange={onZoomChange} zoomLevel={2.5} />);
        expect(control).toHaveClass('bp-is-open');
        expect(screen.getByRole('slider', { name: __('media_zoom_slider') })).toHaveAttribute('aria-valuenow', '50');

        rerender(<WaveformZoomControl isRevealed={false} maxZoom={4} onZoomChange={onZoomChange} zoomLevel={2.5} />);
        expect(control).not.toHaveClass('bp-is-open');
    });

    test('should keep the slider out of the tab order until the control opens', async () => {
        const user = userEvent.setup();
        render(<WaveformZoomControl maxZoom={4} onZoomChange={jest.fn()} zoomLevel={1} />);

        const zoomIn = screen.getByRole('button', { name: __('zoom_in') });
        expect(screen.queryByRole('slider', { name: __('media_zoom_slider') })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: __('zoom_out') })).not.toBeInTheDocument();

        await user.tab();

        expect(zoomIn).toHaveFocus();
        expect(screen.getByRole('slider', { name: __('media_zoom_slider') })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: __('zoom_out') })).toBeInTheDocument();

        await user.tab();
        expect(screen.getByRole('button', { name: __('zoom_out') })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('slider', { name: __('media_zoom_slider') })).toHaveFocus();
    });

    test('should zoom in and out from the icon buttons', async () => {
        const user = userEvent.setup();
        const onZoomChange = jest.fn();
        render(<WaveformZoomControl maxZoom={4} onZoomChange={onZoomChange} zoomLevel={2.5} />);

        await user.click(screen.getByRole('button', { name: __('zoom_in') }));
        expect(onZoomChange).toHaveBeenCalledWith(2.8);

        onZoomChange.mockClear();
        await user.click(screen.getByRole('button', { name: __('zoom_out') }));
        expect(onZoomChange).toHaveBeenCalledWith(2.2);
    });

    test('should ignore zoom button clicks at the slider ends', async () => {
        const user = userEvent.setup();
        const onZoomChange = jest.fn();
        const { rerender } = render(
            <WaveformZoomControl isRevealed maxZoom={4} onZoomChange={onZoomChange} zoomLevel={1} />,
        );

        await user.click(screen.getByTestId('bp-waveform-zoom-out'));
        expect(onZoomChange).not.toHaveBeenCalled();
        expect(screen.getByTestId('bp-waveform-zoom-out')).toHaveAttribute('aria-disabled', 'true');

        rerender(<WaveformZoomControl maxZoom={4} onZoomChange={onZoomChange} zoomLevel={4} />);
        const zoomIn = screen.getByTestId('bp-waveform-zoom-in');
        await user.click(zoomIn);
        expect(onZoomChange).not.toHaveBeenCalled();
        expect(zoomIn).toHaveAttribute('aria-disabled', 'true');
        expect(zoomIn).toHaveFocus();

        act(() => {
            zoomIn.blur();
        });
        await user.tab();
        expect(zoomIn).toHaveFocus();
    });
});
