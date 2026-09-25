import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WAVEFORM_RANGE_COLLAPSED_OFFSET_PX, WAVEFORM_RANGE_HANDLE_LINE_PX } from '../constants';
import { createWaveformViewport } from '../viewport';
import WaveformRangeSelection, { WaveformRangeSelectionHandle } from '../WaveformRangeSelection';

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

    test('should place a Comment button above an open range and omit it when collapsed', () => {
        const onDragCreate = jest.fn();
        const { rerender } = render(
            <WaveformRangeSelection
                durationSec={8}
                onDragCreate={onDragCreate}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        const button = screen.getByTestId('bp-waveform-range-comment');
        expect(button).toHaveTextContent(__('media_range_comment'));
        expect(button).toHaveStyle({ left: '37.5%' });

        fireEvent.click(button);
        expect(onDragCreate).toHaveBeenCalledTimes(1);

        rerender(
            <WaveformRangeSelection
                durationSec={8}
                onDragCreate={onDragCreate}
                range={{ endMs: null, startMs: 2000 }}
                viewport={viewport}
            />,
        );
        expect(screen.queryByTestId('bp-waveform-range-comment')).not.toBeInTheDocument();
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
        const rangeRef = React.createRef<WaveformRangeSelectionHandle>();
        const { rerender } = render(
            <WaveformRangeSelection
                ref={rangeRef}
                durationSec={8}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });
        rerender(
            <WaveformRangeSelection
                ref={rangeRef}
                durationSec={8}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={zoomed}
            />,
        );
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
        act(() => {
            rangeRef.current?.applyViewport(panned);
        });
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toHaveStyle({ left: '-50%' });
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({ left: '0%' });
    });

    test('should keep handles on the live viewport when React scroll is stale', () => {
        const rangeRef = React.createRef<WaveformRangeSelectionHandle>();
        const { rerender } = render(
            <WaveformRangeSelection
                ref={rangeRef}
                durationSec={8}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        const zoomed = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 2,
        });
        rerender(
            <WaveformRangeSelection
                ref={rangeRef}
                durationSec={8}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={zoomed}
            />,
        );

        const panned = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 200,
            widthPx: 200,
            zoomLevel: 2,
        });
        act(() => {
            rangeRef.current?.applyViewport(panned);
        });
        expect(screen.getByTestId('bp-waveform-range-handle-start')).toHaveStyle({ left: '-50%' });
        expect(screen.getByTestId('bp-waveform-range-handle-end')).toHaveStyle({ left: '0%' });

        rerender(
            <WaveformRangeSelection
                ref={rangeRef}
                durationSec={8}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={zoomed}
            />,
        );
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

    test('should not start a drag when the waveform is not interactive', () => {
        const onRangeChange = jest.fn();
        const onDragChange = jest.fn();
        render(
            <WaveformRangeSelection
                durationSec={8}
                interactive={false}
                onDragChange={onDragChange}
                onRangeChange={onRangeChange}
                range={{ endMs: null, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        dispatchPointer(screen.getByTestId('bp-waveform-range-handle-end'), 'pointerdown', 50);
        dispatchPointer(window, 'pointermove', 100);
        dispatchPointer(window, 'pointerup', 100);

        expect(onDragChange).not.toHaveBeenCalled();
        expect(onRangeChange).not.toHaveBeenCalled();
        expect(screen.queryByTestId('bp-waveform-range-tooltip')).not.toBeInTheDocument();
    });

    test('should not emit when an open range is clicked without a drag', () => {
        const onRangeChange = jest.fn();
        const onDragChange = jest.fn();
        render(
            <WaveformRangeSelection
                durationSec={8}
                onDragChange={onDragChange}
                onRangeChange={onRangeChange}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        dispatchPointer(screen.getByTestId('bp-waveform-range-handle-end'), 'pointerdown', 100);
        dispatchPointer(window, 'pointerup', 100);

        expect(onDragChange).toHaveBeenCalledWith(true);
        expect(onDragChange).toHaveBeenCalledWith(false);
        expect(onRangeChange).not.toHaveBeenCalled();
    });

    test('should draw a read-only range without handles', () => {
        const onRangeChange = jest.fn();
        const onDragCreate = jest.fn();
        render(
            <WaveformRangeSelection
                durationSec={8}
                onDragCreate={onDragCreate}
                onRangeChange={onRangeChange}
                range={{ endMs: 4000, startMs: 2000 }}
                readOnly
                viewport={viewport}
            />,
        );

        expect(screen.getByTestId('bp-waveform-range')).toHaveAttribute('data-readonly', 'true');
        expect(screen.getByTestId('bp-waveform-range-region')).toBeInTheDocument();
        expect(screen.queryByTestId('bp-waveform-range-handle-start')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bp-waveform-range-handle-end')).not.toBeInTheDocument();
        expect(screen.queryByTestId('bp-waveform-range-comment')).not.toBeInTheDocument();
        expect(onRangeChange).not.toHaveBeenCalled();
    });

    test('should end the drag when the range layer unmounts', () => {
        const onDragChange = jest.fn();
        const onRangeChange = jest.fn();
        const { unmount } = render(
            <WaveformRangeSelection
                durationSec={8}
                onDragChange={onDragChange}
                onRangeChange={onRangeChange}
                range={{ endMs: 4000, startMs: 2000 }}
                viewport={viewport}
            />,
        );

        dispatchPointer(screen.getByTestId('bp-waveform-range-handle-end'), 'pointerdown', 100);
        expect(onDragChange).toHaveBeenCalledWith(true);

        unmount();

        expect(onDragChange).toHaveBeenCalledWith(false);
        expect(onRangeChange).not.toHaveBeenCalled();
    });
});
