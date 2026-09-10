import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { WAVEFORM_RANGE_COLLAPSED_OFFSET_PX, WAVEFORM_RANGE_HANDLE_LINE_PX } from '../constants';
import { createWaveformViewport } from '../viewport';
import WaveformRangeSelection from '../WaveformRangeSelection';

if (typeof PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
        pointerId: number;

        constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
            super(type, init);
            this.pointerId = init.pointerId ?? 0;
        }
    }
    ((global as unknown) as {
        PointerEvent: typeof PointerEvent;
    }).PointerEvent = (PointerEventPolyfill as unknown) as typeof PointerEvent;
}

function mockTrackRect(width = 200): void {
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        bottom: 140,
        height: 140,
        left: 0,
        right: width,
        toJSON: () => ({}),
        top: 0,
        width,
        x: 0,
        y: 0,
    });
}

function dispatchPointer(el: EventTarget, type: string, clientX: number, pointerId = 1): void {
    const event = new PointerEvent(type, {
        bubbles: true,
        button: 0,
        clientX,
        pointerId,
    });
    if (event.clientX !== clientX) {
        Object.defineProperty(event, 'clientX', { configurable: true, value: clientX });
    }
    if (event.pointerId !== pointerId) {
        Object.defineProperty(event, 'pointerId', { configurable: true, value: pointerId });
    }
    act(() => {
        el.dispatchEvent(event);
    });
}

function pointerCaptureStub(): void {
    if (!HTMLElement.prototype.setPointerCapture) {
        HTMLElement.prototype.setPointerCapture = jest.fn();
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
        HTMLElement.prototype.releasePointerCapture = jest.fn();
    }
    if (!HTMLElement.prototype.hasPointerCapture) {
        HTMLElement.prototype.hasPointerCapture = jest.fn(() => true);
    }
}

describe('WaveformRangeSelection', () => {
    const viewport = createWaveformViewport({
        durationSec: 8,
        heightPx: 140,
        maxZoom: 4,
        scrollLeftPx: 0,
        widthPx: 200,
        zoomLevel: 1,
    });

    beforeEach(() => {
        pointerCaptureStub();
        mockTrackRect();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should draw collapsed handles 1px left and right of the timestamp', () => {
        render(<WaveformRangeSelection durationSec={8} range={{ endMs: null, startMs: 2000 }} viewport={viewport} />);

        expect(screen.getByTestId('bp-waveform-range')).toHaveAttribute('data-collapsed', 'true');
        expect(screen.getByTestId('bp-waveform-range')).toHaveAttribute('data-highlighted', 'true');
        expect(screen.getByTestId('bp-waveform-range')).toHaveClass('bp-WaveformRange--highlight');
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toHaveStyle({
            left: `calc(25% - ${WAVEFORM_RANGE_COLLAPSED_OFFSET_PX}px)`,
        });
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({
            left: `calc(25% + ${WAVEFORM_RANGE_COLLAPSED_OFFSET_PX}px)`,
        });
        expect(screen.getByTestId('bp-waveform-range-region')).toHaveStyle({
            left: `calc(25% - ${WAVEFORM_RANGE_COLLAPSED_OFFSET_PX + WAVEFORM_RANGE_HANDLE_LINE_PX / 2}px)`,
            width: `${(WAVEFORM_RANGE_COLLAPSED_OFFSET_PX + WAVEFORM_RANGE_HANDLE_LINE_PX / 2) * 2}px`,
        });
    });

    test('should stretch the region between start and end', () => {
        render(<WaveformRangeSelection durationSec={8} range={{ endMs: 4000, startMs: 2000 }} viewport={viewport} />);

        expect(screen.getByTestId('bp-waveform-range')).toHaveAttribute('data-collapsed', 'false');
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toHaveStyle({ left: '25%' });
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({ left: '50%' });
        expect(screen.getByTestId('bp-waveform-range-region')).toHaveStyle({
            left: 'calc(25% - 1px)',
            width: 'calc(50% - 25% + 2px)',
        });
    });

    test('should mark the range highlighted when asked', () => {
        const { rerender } = render(
            <WaveformRangeSelection durationSec={8} range={{ endMs: 4000, startMs: 2000 }} viewport={viewport} />,
        );
        expect(screen.getByTestId('bp-waveform-range')).toHaveAttribute('data-highlighted', 'false');

        rerender(
            <WaveformRangeSelection
                durationSec={8}
                isHighlighted
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={viewport}
            />,
        );
        expect(screen.getByTestId('bp-waveform-range')).toHaveAttribute('data-highlighted', 'true');
        expect(screen.getByTestId('bp-waveform-range')).toHaveClass('bp-WaveformRange--highlight');
    });

    test('should keep times glued under zoom and pan', () => {
        const { rerender } = render(
            <WaveformRangeSelection durationSec={8} range={{ endMs: 4000, startMs: 2000 }} viewport={viewport} />,
        );

        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });
        rerender(<WaveformRangeSelection durationSec={8} range={{ endMs: 4000, startMs: 2000 }} viewport={zoomed} />);
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toHaveStyle({ left: '50%' });
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({ left: '100%' });

        const panned = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 200,
            widthPx: 200,
            zoomLevel: 2,
        });
        rerender(<WaveformRangeSelection durationSec={8} range={{ endMs: 4000, startMs: 2000 }} viewport={panned} />);
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toHaveStyle({ left: '-50%' });
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({ left: '0%' });
    });

    test('should keep the 1px playhead gap under zoom', () => {
        const { rerender } = render(
            <WaveformRangeSelection durationSec={8} range={{ endMs: null, startMs: 2000 }} viewport={viewport} />,
        );
        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });
        rerender(<WaveformRangeSelection durationSec={8} range={{ endMs: null, startMs: 2000 }} viewport={zoomed} />);
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toHaveStyle({
            left: `calc(50% - ${WAVEFORM_RANGE_COLLAPSED_OFFSET_PX}px)`,
        });
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({
            left: `calc(50% + ${WAVEFORM_RANGE_COLLAPSED_OFFSET_PX}px)`,
        });
    });

    test('should emit comment range change on pointerup only', () => {
        const onRangeChange = jest.fn();
        const onDragChange = jest.fn();
        render(
            <WaveformRangeSelection
                durationSec={8}
                onDragChange={onDragChange}
                onRangeChange={onRangeChange}
                range={{ endMs: null, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        const endHandle = screen.getByTestId('bp-waveform-range-handle-end');
        dispatchPointer(endHandle, 'pointerdown', 50);
        expect(onDragChange).toHaveBeenCalledWith(true);
        expect(onRangeChange).not.toHaveBeenCalled();
        expect(screen.getByTestId('bp-waveform-range-tooltip')).toHaveTextContent('0:02.00');

        dispatchPointer(window, 'pointermove', 100);
        expect(onRangeChange).not.toHaveBeenCalled();
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({ left: '50%' });
        expect(screen.getByTestId('bp-waveform-range-tooltip')).toHaveTextContent('0:04.00');

        dispatchPointer(window, 'pointerup', 100);
        expect(onRangeChange).toHaveBeenCalledTimes(1);
        expect(onRangeChange).toHaveBeenCalledWith({ endMs: 4000, startMs: 2000 });
        expect(onDragChange).toHaveBeenCalledWith(false);
    });

    test('should snap a dragging handle to the playhead', () => {
        const onRangeChange = jest.fn();
        render(
            <WaveformRangeSelection
                currentTimeSec={4}
                durationSec={8}
                getPlayheadSec={() => 4}
                onRangeChange={onRangeChange}
                range={{ endMs: null, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        dispatchPointer(screen.getByTestId('bp-waveform-range-handle-end'), 'pointerdown', 50);
        dispatchPointer(window, 'pointermove', 96);
        dispatchPointer(window, 'pointerup', 96);

        expect(onRangeChange).toHaveBeenCalledWith({ endMs: 4000, startMs: 2000 });
    });

    test('should not emit when a collapsed drag never opens', () => {
        const onRangeChange = jest.fn();
        render(
            <WaveformRangeSelection
                durationSec={8}
                onRangeChange={onRangeChange}
                range={{ endMs: null, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        dispatchPointer(screen.getByTestId('bp-waveform-range-handle-end'), 'pointerdown', 50);
        dispatchPointer(window, 'pointerup', 50);

        expect(onRangeChange).not.toHaveBeenCalled();
    });
});
