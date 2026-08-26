import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WAVEFORM_ZOOM_DISMISS_MS } from '../constants';
import WaveformZoomControl from '../WaveformZoomControl';

describe('WaveformZoomControl', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    test('should expand on hover and report slider zoom changes', () => {
        const onZoomChange = jest.fn();
        render(<WaveformZoomControl maxZoom={4} onZoomChange={onZoomChange} zoomLevel={1} />);

        const control = screen.getByTestId('bp-waveform-zoom');
        const flyout = control.querySelector('.bp-WaveformZoomControl-flyout');
        expect(control).not.toHaveClass('bp-is-open');
        expect(flyout).not.toHaveClass('bp-is-open');

        fireEvent.mouseEnter(control);
        expect(control).toHaveClass('bp-is-open');
        expect(flyout).toHaveClass('bp-is-open');

        const slider = screen.getByRole('slider', { name: __('media_zoom_slider') });
        fireEvent.keyDown(slider, { key: 'ArrowRight' });

        expect(onZoomChange).toHaveBeenCalled();
        expect(onZoomChange.mock.calls[0][0]).toBeGreaterThan(1);
    });

    test('should keep the slider open through the dismiss delay after mouse leave', () => {
        jest.useFakeTimers();
        const onZoomChange = jest.fn();
        render(<WaveformZoomControl maxZoom={4} onZoomChange={onZoomChange} zoomLevel={1} />);

        const control = screen.getByTestId('bp-waveform-zoom');
        const flyout = control.querySelector('.bp-WaveformZoomControl-flyout');
        fireEvent.mouseEnter(control);
        expect(control).toHaveClass('bp-is-open');
        expect(flyout).toHaveClass('bp-is-open');

        fireEvent.mouseLeave(control);
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

    test('should keep the slider out of the tab order until the control opens', () => {
        render(<WaveformZoomControl maxZoom={4} onZoomChange={jest.fn()} zoomLevel={1} />);

        const toggle = screen.getByRole('button', { name: __('media_zoom') });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('slider', { name: __('media_zoom_slider') })).not.toBeInTheDocument();

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('slider', { name: __('media_zoom_slider') })).toHaveFocus();

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('slider', { name: __('media_zoom_slider') })).not.toBeInTheDocument();
    });
});
