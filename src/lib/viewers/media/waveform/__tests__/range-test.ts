import { CommentRangeDraft } from '../../../controls/media/types';
import {
    WAVEFORM_RANGE_COLLAPSED_OFFSET_PX,
    WAVEFORM_RANGE_MIN_DURATION_MS,
    WAVEFORM_RANGE_SNAP_PX,
} from '../constants';
import {
    clampTimeMs,
    commitRangeChange,
    dragRangeHandle,
    durationMsFromSec,
    isRangeCollapsed,
    isPointerOverRange,
    pickRangeHandle,
    pointerTimeMs,
    rangeProgress,
    resolveRange,
    snapTimeMs,
    visualRangeHandlePx,
} from '../range';
import { createWaveformViewport } from '../viewport';

describe('range', () => {
    const durationMs = 8000;

    test('should treat a null end as collapsed', () => {
        const draft: CommentRangeDraft = { endMs: null, startMs: 2000 };
        expect(isRangeCollapsed(draft)).toBe(true);
        expect(resolveRange(draft, durationMs)).toEqual({ endMs: 2000, startMs: 2000 });
        expect(rangeProgress(resolveRange(draft, durationMs), durationMs)).toBeNull();
        expect(commitRangeChange(resolveRange(draft, durationMs))).toBeNull();
    });

    test('should clamp both edges onto the file', () => {
        expect(clampTimeMs(-12.4, durationMs)).toBe(0);
        expect(clampTimeMs(9000, durationMs)).toBe(8000);
        expect(resolveRange({ endMs: 9500, startMs: -5 }, durationMs)).toEqual({ endMs: 8000, startMs: 0 });
    });

    test('should place collapsed handles 1px left and right of the playhead', () => {
        const viewport = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 1,
        });
        const range = resolveRange({ endMs: null, startMs: 2000 }, durationMs);
        const playheadX = 50;

        expect(visualRangeHandlePx({ handle: 'start', range, viewport })).toBe(
            playheadX - WAVEFORM_RANGE_COLLAPSED_OFFSET_PX,
        );
        expect(visualRangeHandlePx({ handle: 'end', range, viewport })).toBe(
            playheadX + WAVEFORM_RANGE_COLLAPSED_OFFSET_PX,
        );
        expect(visualRangeHandlePx({ handle: 'end', range: { endMs: 4000, startMs: 2000 }, viewport })).toBe(100);
    });

    test('should treat the range rectangle and handle pads as the hover area', () => {
        const viewport = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 0,
            widthPx: 200,
            zoomLevel: 1,
        });
        const range = { endMs: 4000, startMs: 2000 };

        expect(isPointerOverRange({ pointerX: 75, range, viewport })).toBe(true);
        expect(isPointerOverRange({ pointerX: 150, range, viewport })).toBe(false);
        expect(isPointerOverRange({ pointerX: 38, range: { endMs: null, startMs: 2000 }, viewport })).toBe(true);
        expect(isPointerOverRange({ pointerX: 80, range: { endMs: null, startMs: 2000 }, viewport })).toBe(false);
    });

    test('should split overlapping handles at the midpoint', () => {
        expect(pickRangeHandle({ endX: 50, pointerX: 49, startX: 50 })).toBe('start');
        expect(pickRangeHandle({ endX: 50, pointerX: 50, startX: 50 })).toBe('end');
        expect(pickRangeHandle({ endX: 120, pointerX: 40, startX: 20 })).toBe('start');
        expect(pickRangeHandle({ endX: 120, pointerX: 100, startX: 20 })).toBe('end');
    });

    test('should snap to the playhead within 8px', () => {
        const pixelsPerSecond = 100;
        const playheadMs = 2000;
        const nearMs = playheadMs + ((WAVEFORM_RANGE_SNAP_PX - 1) / pixelsPerSecond) * 1000;
        const farMs = playheadMs + ((WAVEFORM_RANGE_SNAP_PX + 1) / pixelsPerSecond) * 1000;

        expect(snapTimeMs({ pixelsPerSecond, playheadMs, timeMs: nearMs })).toBe(playheadMs);
        expect(snapTimeMs({ pixelsPerSecond, playheadMs, timeMs: farMs })).toBe(farMs);
    });

    test('should expand a collapsed pair in either direction and swap when handles cross', () => {
        const collapsed = { endMs: 2000, startMs: 2000 };

        expect(dragRangeHandle({ durationMs, handle: 'end', pointerMs: 4000, range: collapsed })).toEqual({
            handle: 'end',
            range: { endMs: 4000, startMs: 2000 },
        });
        expect(dragRangeHandle({ durationMs, handle: 'start', pointerMs: 500, range: collapsed })).toEqual({
            handle: 'start',
            range: { endMs: 2000, startMs: 500 },
        });
        expect(dragRangeHandle({ durationMs, handle: 'end', pointerMs: 500, range: collapsed })).toEqual({
            handle: 'start',
            range: { endMs: 2000, startMs: 500 },
        });
    });

    test('should enforce the minimum span once a range is open', () => {
        const opened = dragRangeHandle({
            durationMs,
            handle: 'end',
            pointerMs: 2000 + WAVEFORM_RANGE_MIN_DURATION_MS - 50,
            range: { endMs: 2000, startMs: 2000 },
        });

        expect(opened.range.endMs - opened.range.startMs).toBe(WAVEFORM_RANGE_MIN_DURATION_MS);
        expect(commitRangeChange(opened.range)).toEqual({
            endMs: opened.range.endMs,
            startMs: opened.range.startMs,
        });
    });

    test('should map a pointer through the zoomed viewport into milliseconds', () => {
        const viewport = createWaveformViewport({
            durationSec: 8,
            heightPx: 140,
            maxZoom: 4,
            scrollLeftPx: 200,
            widthPx: 200,
            zoomLevel: 2,
        });

        expect(durationMsFromSec(8)).toBe(8000);
        expect(pointerTimeMs(100, viewport)).toBe(6000);
        expect(rangeProgress({ endMs: 6000, startMs: 4000 }, 8000)).toEqual({ end: 0.75, start: 0.5 });
    });
});
