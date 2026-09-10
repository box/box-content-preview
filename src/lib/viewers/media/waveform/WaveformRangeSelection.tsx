import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { CommentRangeDraft } from '../../controls/media/types';
import { WAVEFORM_RANGE_COLLAPSED_OFFSET_PX, WAVEFORM_RANGE_HANDLE_LINE_PX } from './constants';
import { formatTime } from './peaks';
import {
    commitRangeChange,
    dragRangeHandle,
    durationMsFromSec,
    isRangeCollapsed,
    pickRangeHandle,
    pointerTimeMs,
    RangeHandle,
    resolveRange,
    ResolvedRange,
    snapTimeMs,
    visualRangeHandlePx,
} from './range';
import { WaveformViewport } from './types';
import { timeLeftPercent } from './viewport';
import './WaveformRangeSelection.scss';

export type WaveformRangeSelectionHandle = {
    applyViewport: (viewport: WaveformViewport) => void;
};

export type WaveformRangeSelectionProps = {
    currentTimeSec?: number;
    durationSec: number;
    getPlayheadSec?: () => number;
    isHighlighted?: boolean;
    keepHighlight?: boolean;
    onDragChange?: (isDragging: boolean) => void;
    onPreviewChange?: (range: CommentRangeDraft) => void;
    onRangeChange?: (range: { endMs: number; startMs: number }) => void;
    range: CommentRangeDraft;
    viewport: WaveformViewport;
};

type DragState = {
    handle: RangeHandle;
    originMs: number;
    pointerId: number;
    range: ResolvedRange;
};

function offsetLeftCss(base: string, offsetPx: number): string {
    if (!offsetPx) {
        return base;
    }
    const op = offsetPx < 0 ? '-' : '+';
    return `calc(${base} ${op} ${Math.abs(offsetPx)}px)`;
}

function applyHandleLeft(
    el: HTMLElement | null,
    timeSec: number,
    durationSec: number,
    viewport: WaveformViewport,
    collapsedOffsetPx = 0,
): void {
    if (!el) {
        return;
    }
    el.style.left = offsetLeftCss(timeLeftPercent(timeSec, durationSec, viewport), collapsedOffsetPx);
}

function applyRegion(
    el: HTMLElement | null,
    startSec: number,
    endSec: number,
    durationSec: number,
    viewport: WaveformViewport,
    collapsed: boolean,
): void {
    if (!el) {
        return;
    }
    const start = timeLeftPercent(startSec, durationSec, viewport);
    const halfLine = WAVEFORM_RANGE_HANDLE_LINE_PX / 2;
    if (collapsed) {
        const extentPx = WAVEFORM_RANGE_COLLAPSED_OFFSET_PX + halfLine;
        el.style.left = offsetLeftCss(start, -extentPx);
        el.style.width = `${extentPx * 2}px`;
        return;
    }
    const end = timeLeftPercent(endSec, durationSec, viewport);
    el.style.left = offsetLeftCss(start, -halfLine);
    el.style.width = `calc(${end} - ${start} + ${WAVEFORM_RANGE_HANDLE_LINE_PX}px)`;
}

const WaveformRangeSelection = forwardRef<WaveformRangeSelectionHandle, WaveformRangeSelectionProps>(
    function WaveformRangeSelection(
        {
            currentTimeSec = 0,
            durationSec,
            getPlayheadSec,
            isHighlighted = false,
            keepHighlight = true,
            onDragChange,
            onPreviewChange,
            onRangeChange,
            range,
            viewport,
        },
        ref,
    ): JSX.Element | null {
        const rootRef = useRef<HTMLDivElement>(null);
        const regionRef = useRef<HTMLDivElement>(null);
        const startHandleRef = useRef<HTMLDivElement>(null);
        const endHandleRef = useRef<HTMLDivElement>(null);
        const dragRef = useRef<DragState | null>(null);
        const rangeRef = useRef(range);
        const displayedRef = useRef<ResolvedRange>(resolveRange(range, durationMsFromSec(durationSec)));
        const viewportRef = useRef(viewport);
        const durationSecRef = useRef(durationSec);
        const onDragChangeRef = useRef(onDragChange);
        const onPreviewChangeRef = useRef(onPreviewChange);
        const onRangeChangeRef = useRef(onRangeChange);
        const getPlayheadSecRef = useRef(getPlayheadSec);
        const [dragRange, setDragRange] = useState<ResolvedRange | null>(null);
        const [activeHandle, setActiveHandle] = useState<RangeHandle | null>(null);

        rangeRef.current = range;
        viewportRef.current = viewport;
        durationSecRef.current = durationSec;
        onDragChangeRef.current = onDragChange;
        onPreviewChangeRef.current = onPreviewChange;
        onRangeChangeRef.current = onRangeChange;
        getPlayheadSecRef.current = getPlayheadSec;

        const durationMs = durationMsFromSec(durationSec);
        const displayed = dragRange ?? resolveRange(range, durationMs);
        displayedRef.current = displayed;

        const syncPositions = useCallback(
            (next: ResolvedRange, nextViewport: WaveformViewport, nextDurationSec: number): void => {
                displayedRef.current = next;
                const collapsed = next.startMs === next.endMs;
                applyRegion(
                    regionRef.current,
                    next.startMs / 1000,
                    next.endMs / 1000,
                    nextDurationSec,
                    nextViewport,
                    collapsed,
                );
                applyHandleLeft(
                    startHandleRef.current,
                    next.startMs / 1000,
                    nextDurationSec,
                    nextViewport,
                    collapsed ? -WAVEFORM_RANGE_COLLAPSED_OFFSET_PX : 0,
                );
                applyHandleLeft(
                    endHandleRef.current,
                    next.endMs / 1000,
                    nextDurationSec,
                    nextViewport,
                    collapsed ? WAVEFORM_RANGE_COLLAPSED_OFFSET_PX : 0,
                );
            },
            [],
        );

        useImperativeHandle(
            ref,
            () => ({
                applyViewport: (nextViewport: WaveformViewport) => {
                    viewportRef.current = nextViewport;
                    syncPositions(displayedRef.current, nextViewport, durationSecRef.current);
                },
            }),
            [syncPositions],
        );

        useLayoutEffect(() => {
            syncPositions(displayed, viewport, durationSec);
        }, [displayed, durationSec, syncPositions, viewport]);

        const endDrag = useCallback((event: PointerEvent | React.PointerEvent): void => {
            const drag = dragRef.current;
            if (!drag || (event.pointerId && drag.pointerId !== event.pointerId)) {
                return;
            }
            [startHandleRef.current, endHandleRef.current].forEach(handleEl => {
                if (handleEl && handleEl.hasPointerCapture(event.pointerId)) {
                    handleEl.releasePointerCapture(event.pointerId);
                }
            });
            dragRef.current = null;
            setActiveHandle(null);
            setDragRange(null);
            onDragChangeRef.current?.(false);
            const committed = commitRangeChange(drag.range);
            if (committed) {
                onRangeChangeRef.current?.(committed);
            }
        }, []);

        const moveDrag = useCallback(
            (event: PointerEvent | React.PointerEvent): void => {
                const drag = dragRef.current;
                if (!drag || (event.pointerId && drag.pointerId !== event.pointerId)) {
                    return;
                }
                const root = rootRef.current;
                if (!root) {
                    return;
                }
                const rect = root.getBoundingClientRect();
                const pointerX = event.clientX - rect.left;
                const vp = viewportRef.current;
                const duration = durationMsFromSec(durationSecRef.current);
                const playheadSec = getPlayheadSecRef.current?.() ?? currentTimeSec;
                const pointerMs = snapTimeMs({
                    pixelsPerSecond: vp.pixelsPerSecond,
                    playheadMs: playheadSec * 1000,
                    timeMs: pointerTimeMs(pointerX, vp),
                });
                if (
                    drag.originMs === drag.range.startMs &&
                    drag.originMs === drag.range.endMs &&
                    pointerMs === drag.originMs
                ) {
                    return;
                }
                const next = dragRangeHandle({
                    durationMs: duration,
                    handle: drag.handle,
                    pointerMs,
                    range: { endMs: drag.range.endMs, startMs: drag.range.startMs },
                });
                drag.handle = next.handle;
                drag.range = next.range;
                setActiveHandle(next.handle);
                setDragRange(next.range);
                syncPositions(next.range, vp, durationSecRef.current);
                onPreviewChangeRef.current?.({ endMs: next.range.endMs, startMs: next.range.startMs });
            },
            [currentTimeSec, syncPositions],
        );

        const startDrag = useCallback((handle: RangeHandle, event: React.PointerEvent<HTMLDivElement>): void => {
            if (event.button > 1 || event.ctrlKey || event.metaKey) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const resolved = resolveRange(rangeRef.current, durationMsFromSec(durationSecRef.current));
            dragRef.current = {
                handle,
                originMs: handle === 'start' ? resolved.startMs : resolved.endMs,
                pointerId: event.pointerId,
                range: resolved,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            setActiveHandle(handle);
            setDragRange(resolved);
            onDragChangeRef.current?.(true);
            onPreviewChangeRef.current?.({
                endMs: isRangeCollapsed(rangeRef.current) ? null : resolved.endMs,
                startMs: resolved.startMs,
            });
        }, []);

        const onHandlePointerDown = useCallback(
            (event: React.PointerEvent<HTMLDivElement>): void => {
                const root = rootRef.current;
                if (!root) {
                    return;
                }
                const rect = root.getBoundingClientRect();
                const pointerX = event.clientX - rect.left;
                const vp = viewportRef.current;
                const resolved = resolveRange(rangeRef.current, durationMsFromSec(durationSecRef.current));
                const handle = pickRangeHandle({
                    endX: visualRangeHandlePx({ handle: 'end', range: resolved, viewport: vp }),
                    pointerX,
                    startX: visualRangeHandlePx({ handle: 'start', range: resolved, viewport: vp }),
                });
                startDrag(handle, event);
            },
            [startDrag],
        );

        useEffect(() => {
            const onMove = (event: PointerEvent): void => {
                if (!dragRef.current) {
                    return;
                }
                event.preventDefault();
                moveDrag(event);
            };
            const onUp = (event: PointerEvent): void => {
                if (!dragRef.current) {
                    return;
                }
                endDrag(event);
            };
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
            return () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
            };
        }, [endDrag, moveDrag]);

        if (!(durationSec > 0) || !(durationMs >= 0)) {
            return null;
        }

        const tooltipHandle = activeHandle ?? 'end';
        const tooltipMs = tooltipHandle === 'start' ? displayed.startMs : displayed.endMs;
        const tooltipLeft = timeLeftPercent(tooltipMs / 1000, durationSec, viewport);
        const collapsed = displayed.startMs === displayed.endMs;
        const highlight = isHighlighted || collapsed;

        return (
            <div
                ref={rootRef}
                className={`bp-WaveformRange${keepHighlight ? ' bp-WaveformRange--persist' : ''}${
                    highlight ? ' bp-WaveformRange--highlight' : ''
                }`}
                data-collapsed={collapsed ? 'true' : 'false'}
                data-highlighted={highlight ? 'true' : 'false'}
                data-testid="bp-waveform-range"
            >
                <div ref={regionRef} className="bp-WaveformRange-region" data-testid="bp-waveform-range-region" />
                <div
                    ref={startHandleRef}
                    className={`bp-WaveformRange-handle bp-WaveformRange-handle--start${
                        activeHandle === 'start' ? ' bp-WaveformRange-handle--dragging' : ''
                    }`}
                    data-testid="bp-waveform-range-handle-start"
                    onMouseMove={event => event.stopPropagation()}
                    onPointerDown={onHandlePointerDown}
                >
                    <div className="bp-WaveformRange-handleGrip" />
                </div>
                <div
                    ref={endHandleRef}
                    className={`bp-WaveformRange-handle bp-WaveformRange-handle--end${
                        activeHandle === 'end' ? ' bp-WaveformRange-handle--dragging' : ''
                    }`}
                    data-testid="bp-waveform-range-handle-end"
                    onMouseMove={event => event.stopPropagation()}
                    onPointerDown={onHandlePointerDown}
                >
                    <div className="bp-WaveformRange-handleGrip" />
                </div>
                {activeHandle && (
                    <div
                        className="bp-WaveformRange-tooltip"
                        data-testid="bp-waveform-range-tooltip"
                        style={{ left: tooltipLeft }}
                    >
                        <div className="bp-WaveformRange-tooltipTime">{formatTime(tooltipMs / 1000)}</div>
                    </div>
                )}
            </div>
        );
    },
);

export default React.memo(WaveformRangeSelection);
