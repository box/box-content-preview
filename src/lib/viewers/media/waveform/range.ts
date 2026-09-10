import { CommentRangeChange, CommentRangeDraft } from '../../controls/media/types';
import {
    WAVEFORM_RANGE_COLLAPSED_OFFSET_PX,
    WAVEFORM_RANGE_HIT_AREA_PX,
    WAVEFORM_RANGE_MIN_DURATION_MS,
    WAVEFORM_RANGE_SNAP_PX,
} from './constants';
import { WaveformViewport } from './types';
import { positionPxFromTime, timeFromPositionPx } from './viewport';

export type RangeHandle = 'start' | 'end';

export type ResolvedRange = {
    endMs: number;
    startMs: number;
};

function clampToRange(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
        return min;
    }
    return Math.min(max, Math.max(min, value));
}

/** Integer ms in `[0, durationMs]`. */
export function clampTimeMs(timeMs: number, durationMs: number): number {
    const duration = Math.max(0, durationMs);
    return Math.round(clampToRange(timeMs, 0, duration));
}

export function durationMsFromSec(durationSec: number): number {
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
        return 0;
    }
    return Math.round(durationSec * 1000);
}

export function isRangeCollapsed(range: CommentRangeDraft | null | undefined): boolean {
    return !range || range.endMs == null || range.endMs <= range.startMs;
}

/** Clamp both edges onto the file. Collapsed drafts stay a point. */
export function resolveRange(range: CommentRangeDraft, durationMs: number): ResolvedRange {
    const startMs = clampTimeMs(range.startMs, durationMs);
    if (range.endMs == null) {
        return { endMs: startMs, startMs };
    }
    const endMs = clampTimeMs(range.endMs, durationMs);
    if (endMs <= startMs) {
        return { endMs: startMs, startMs };
    }
    return { endMs, startMs };
}

/**
 * Which handle should receive this pointer. Overlapping hit areas (collapsed or
 * a span narrower than the 24px target) split at the midpoint so each edge stays reachable.
 */
export function pickRangeHandle({
    endX,
    pointerX,
    startX,
}: {
    endX: number;
    pointerX: number;
    startX: number;
}): RangeHandle {
    const mid = (startX + endX) / 2;
    if (!Number.isFinite(mid)) {
        return 'end';
    }
    return pointerX < mid ? 'start' : 'end';
}

/** Screen x of a handle. Collapsed drafts sit 1px left/right of the playhead, not on it. */
export function visualRangeHandlePx({
    handle,
    range,
    viewport,
}: {
    handle: RangeHandle;
    range: ResolvedRange;
    viewport: WaveformViewport;
}): number {
    const timeSec = (handle === 'start' ? range.startMs : range.endMs) / 1000;
    const x = positionPxFromTime(timeSec, viewport);
    if (range.startMs !== range.endMs) {
        return x;
    }
    return handle === 'start' ? x - WAVEFORM_RANGE_COLLAPSED_OFFSET_PX : x + WAVEFORM_RANGE_COLLAPSED_OFFSET_PX;
}

/** True when the pointer is over the range rectangle or its handle hit targets. */
export function isPointerOverRange({
    pointerX,
    range,
    viewport,
}: {
    pointerX: number;
    range: CommentRangeDraft;
    viewport: WaveformViewport;
}): boolean {
    const resolved = resolveRange(range, durationMsFromSec(viewport.durationSec));
    const startX = visualRangeHandlePx({ handle: 'start', range: resolved, viewport });
    const endX = visualRangeHandlePx({ handle: 'end', range: resolved, viewport });
    const pad = WAVEFORM_RANGE_HIT_AREA_PX / 2;
    return pointerX >= Math.min(startX, endX) - pad && pointerX <= Math.max(startX, endX) + pad;
}

/** Snap to the playhead when the pointer is within `WAVEFORM_RANGE_SNAP_PX`. */
export function snapTimeMs({
    pixelsPerSecond,
    playheadMs,
    timeMs,
}: {
    pixelsPerSecond: number;
    playheadMs: number;
    timeMs: number;
}): number {
    if (!(pixelsPerSecond > 0) || !Number.isFinite(playheadMs)) {
        return timeMs;
    }
    const deltaPx = (Math.abs(timeMs - playheadMs) / 1000) * pixelsPerSecond;
    if (deltaPx <= WAVEFORM_RANGE_SNAP_PX) {
        return Math.round(playheadMs);
    }
    return timeMs;
}

/**
 * Move one edge. Crossing the other edge swaps roles so a collapsed pair can
 * expand in either direction. Enforces `[0, duration]` and the minimum span
 * once the drag has actually opened a range.
 */
export function dragRangeHandle({
    durationMs,
    handle,
    pointerMs,
    range,
}: {
    durationMs: number;
    handle: RangeHandle;
    pointerMs: number;
    range: ResolvedRange;
}): { handle: RangeHandle; range: ResolvedRange } {
    const duration = Math.max(0, durationMs);
    const pointer = clampTimeMs(pointerMs, duration);
    let { startMs, endMs } = range;
    let nextHandle = handle;

    if (handle === 'start') {
        if (pointer > endMs) {
            startMs = endMs;
            endMs = pointer;
            nextHandle = 'end';
        } else {
            startMs = pointer;
        }
    } else if (pointer < startMs) {
        endMs = startMs;
        startMs = pointer;
        nextHandle = 'start';
    } else {
        endMs = pointer;
    }

    const opened = startMs !== endMs;
    if (opened && endMs - startMs < WAVEFORM_RANGE_MIN_DURATION_MS) {
        if (nextHandle === 'end') {
            endMs = clampTimeMs(startMs + WAVEFORM_RANGE_MIN_DURATION_MS, duration);
            if (endMs - startMs < WAVEFORM_RANGE_MIN_DURATION_MS) {
                startMs = clampTimeMs(endMs - WAVEFORM_RANGE_MIN_DURATION_MS, duration);
            }
        } else {
            startMs = clampTimeMs(endMs - WAVEFORM_RANGE_MIN_DURATION_MS, duration);
            if (endMs - startMs < WAVEFORM_RANGE_MIN_DURATION_MS) {
                endMs = clampTimeMs(startMs + WAVEFORM_RANGE_MIN_DURATION_MS, duration);
            }
        }
    }

    return { handle: nextHandle, range: { endMs, startMs } };
}

export function pointerTimeMs(pointerX: number, viewport: WaveformViewport): number {
    return Math.round(timeFromPositionPx(pointerX, viewport) * 1000);
}

/** Sidebar payload after mouseup. Null when the draft is still a single timestamp. */
export function commitRangeChange(range: ResolvedRange): CommentRangeChange | null {
    if (range.endMs <= range.startMs) {
        return null;
    }
    return { endMs: range.endMs, startMs: range.startMs };
}

export function rangeProgress(range: ResolvedRange, durationMs: number): { end: number; start: number } | null {
    if (!(durationMs > 0) || range.endMs <= range.startMs) {
        return null;
    }
    return { end: range.endMs / durationMs, start: range.startMs / durationMs };
}
