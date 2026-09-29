import classNames from 'classnames';
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import IconComment24 from '../../controls/icons/IconComment24';
import IconExit24 from '../../controls/icons/IconExit24';
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
import { PlayheadCameraMode, WaveformViewport } from './types';
import { createWaveformViewport, timeLeftPercent } from './viewport';
import './WaveformRangeSelection.scss';

export type WaveformRangeSelectionHandle = {
    applyViewport: (viewport: WaveformViewport) => void;
};

export type WaveformRangeSelectionProps = {
    cameraMode?: PlayheadCameraMode;
    currentTimeSec?: number;
    durationSec: number;
    getPlayheadSec?: () => number;
    isSwiping?: boolean;
    interactive?: boolean;
    isHighlighted?: boolean;
    keepHighlight?: boolean;
    onDragChange?: (isDragging: boolean) => void;
    onDragCreate?: () => void;
    /** Pointer clientX during a handle drag, including the press that started it. */
    onDragPointerX?: (clientX: number) => void;
    onPreviewChange?: (range: CommentRangeDraft) => void;
    onRangeChange?: (range: { endMs: number; startMs: number }) => void;
    onRangeClear?: () => void;
    range: CommentRangeDraft;
    /** Viewed comment span. Same chrome as a draft, without handles or edge edits. */
    readOnly?: boolean;
    viewport: WaveformViewport;
};

type DragState = {
    handle: RangeHandle;
    lastClientX: number;
    originMs: number;
    originRange: ResolvedRange;
    pointerId: number;
    range: ResolvedRange;
};

function stopRangeEvent(event: React.SyntheticEvent): void {
    event.stopPropagation();
}

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
            cameraMode = 'desktop',
            currentTimeSec = 0,
            durationSec,
            getPlayheadSec,
            isSwiping = false,
            interactive = true,
            isHighlighted = false,
            keepHighlight = true,
            onDragChange,
            onDragCreate,
            onDragPointerX,
            onPreviewChange,
            onRangeChange,
            onRangeClear,
            range,
            readOnly = false,
            viewport,
        },
        ref,
    ): JSX.Element | null {
        const rootRef = useRef<HTMLDivElement>(null);
        const regionRef = useRef<HTMLDivElement>(null);
        const startHandleRef = useRef<HTMLDivElement>(null);
        const endHandleRef = useRef<HTMLDivElement>(null);
        const tooltipRef = useRef<HTMLDivElement>(null);
        const commentRef = useRef<HTMLElement>(null);
        const commentButtonRef = commentRef as React.Ref<HTMLButtonElement>;
        const commentPillRef = commentRef as React.Ref<HTMLDivElement>;
        const dragRef = useRef<DragState | null>(null);
        const replayDragRef = useRef<(clientX: number) => void>(() => undefined);
        const rangeRef = useRef(range);
        const displayedRef = useRef<ResolvedRange>(resolveRange(range, durationMsFromSec(durationSec)));
        const viewportRef = useRef(viewport);
        const durationSecRef = useRef(durationSec);
        const onDragChangeRef = useRef(onDragChange);
        const onDragPointerXRef = useRef(onDragPointerX);
        const onPreviewChangeRef = useRef(onPreviewChange);
        const onRangeChangeRef = useRef(onRangeChange);
        const getPlayheadSecRef = useRef(getPlayheadSec);
        const [dragRange, setDragRange] = useState<ResolvedRange | null>(null);
        const [activeHandle, setActiveHandle] = useState<RangeHandle | null>(null);
        const activeHandleRef = useRef<RangeHandle | null>(null);

        rangeRef.current = range;
        durationSecRef.current = durationSec;
        onDragChangeRef.current = onDragChange;
        onDragPointerXRef.current = onDragPointerX;
        onPreviewChangeRef.current = onPreviewChange;
        onRangeChangeRef.current = onRangeChange;
        getPlayheadSecRef.current = getPlayheadSec;
        activeHandleRef.current = activeHandle;

        const durationMs = durationMsFromSec(durationSec);
        const displayed = dragRange ?? resolveRange(range, durationMs);
        displayedRef.current = displayed;
        const isRangeOpen = displayed.startMs !== displayed.endMs && activeHandle == null;
        const isCommentButtonVisible = !readOnly && Boolean(onDragCreate) && isRangeOpen;
        const isClearOnlyVisible = cameraMode === 'tape' && readOnly && onRangeClear != null && isRangeOpen;

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
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    const tooltipHandle = activeHandleRef.current ?? 'end';
                    const tooltipMs = tooltipHandle === 'start' ? next.startMs : next.endMs;
                    tooltip.style.left = timeLeftPercent(tooltipMs / 1000, nextDurationSec, nextViewport);
                }
                const comment = commentRef.current;
                if (comment && next.startMs !== next.endMs) {
                    comment.style.left = timeLeftPercent(
                        (next.startMs + next.endMs) / 2000,
                        nextDurationSec,
                        nextViewport,
                    );
                }
            },
            [],
        );

        const refreshRangePositions = useCallback((): void => {
            const drag = dragRef.current;
            if (!drag) {
                syncPositions(displayedRef.current, viewportRef.current, durationSecRef.current);
                return;
            }
            replayDragRef.current(drag.lastClientX);
        }, [syncPositions]);

        useImperativeHandle(
            ref,
            () => ({
                applyViewport: (nextViewport: WaveformViewport) => {
                    viewportRef.current = nextViewport;
                    refreshRangePositions();
                },
            }),
            [refreshRangePositions],
        );

        useLayoutEffect(() => {
            syncPositions(displayedRef.current, viewportRef.current, durationSec);
        }, [
            activeHandle,
            displayed.endMs,
            displayed.startMs,
            durationSec,
            isClearOnlyVisible,
            isCommentButtonVisible,
            syncPositions,
        ]);
        useLayoutEffect(() => {
            const next = createWaveformViewport({
                durationSec: viewport.durationSec,
                gutterPx: viewport.gutterPx,
                heightPx: viewport.heightPx,
                maxZoom: viewport.maxZoom,
                scrollLeftPx: viewportRef.current.scrollLeftPx,
                widthPx: viewport.widthPx,
                zoomLevel: viewport.zoomLevel,
            });
            viewportRef.current = next;
            refreshRangePositions();
        }, [
            refreshRangePositions,
            viewport.durationSec,
            viewport.gutterPx,
            viewport.heightPx,
            viewport.maxZoom,
            viewport.widthPx,
            viewport.zoomLevel,
        ]);

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
            event.stopPropagation();
            const didChange =
                drag.range.startMs !== drag.originRange.startMs || drag.range.endMs !== drag.originRange.endMs;
            if (!didChange) {
                return;
            }
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
                drag.lastClientX = event.clientX;
                onDragPointerXRef.current?.(event.clientX);
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
                    syncPositions(drag.range, vp, durationSecRef.current);
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
        replayDragRef.current = (clientX: number): void => {
            const drag = dragRef.current;
            if (!drag || !Number.isFinite(clientX)) {
                return;
            }
            moveDrag({ clientX, pointerId: drag.pointerId } as PointerEvent);
        };

        const startDrag = useCallback(
            (handle: RangeHandle, event: React.PointerEvent<HTMLDivElement>): void => {
                if (readOnly || !interactive || event.button > 1 || event.ctrlKey || event.metaKey) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                const resolved = resolveRange(rangeRef.current, durationMsFromSec(durationSecRef.current));
                dragRef.current = {
                    handle,
                    lastClientX: event.clientX,
                    originMs: handle === 'start' ? resolved.startMs : resolved.endMs,
                    originRange: { endMs: resolved.endMs, startMs: resolved.startMs },
                    pointerId: event.pointerId,
                    range: resolved,
                };
                onDragPointerXRef.current?.(event.clientX);
                event.currentTarget.setPointerCapture(event.pointerId);
                setActiveHandle(handle);
                setDragRange(resolved);
                onDragChangeRef.current?.(true);
                onPreviewChangeRef.current?.({
                    endMs: isRangeCollapsed(rangeRef.current) ? null : resolved.endMs,
                    startMs: resolved.startMs,
                });
            },
            [interactive, readOnly],
        );

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

        useEffect(() => {
            return () => {
                if (!dragRef.current) {
                    return;
                }
                dragRef.current = null;
                onDragChangeRef.current?.(false);
            };
        }, []);

        if (!(durationSec > 0) || !(durationMs >= 0)) {
            return null;
        }

        const tooltipHandle = activeHandle ?? 'end';
        const tooltipMs = tooltipHandle === 'start' ? displayed.startMs : displayed.endMs;
        const collapsed = displayed.startMs === displayed.endMs;
        const highlight = isHighlighted || collapsed;
        const commentLabel = (
            <>
                <IconComment24 aria-hidden="true" className="bp-WaveformRange-commentIcon" />
                {__('media_range_comment')}
            </>
        );
        const isTapeClearAvailable = cameraMode === 'tape' && onRangeClear != null;
        let commentButton: JSX.Element | null = null;
        if (isClearOnlyVisible && onRangeClear) {
            commentButton = (
                <button
                    ref={commentButtonRef}
                    aria-label={__('media_range_clear')}
                    className="bp-WaveformRange-comment bp-WaveformRange-comment--clearOnly"
                    data-testid="bp-waveform-range-clear"
                    onClick={event => {
                        stopRangeEvent(event);
                        onRangeClear();
                    }}
                    onPointerDown={stopRangeEvent}
                    onPointerUp={stopRangeEvent}
                    type="button"
                >
                    <IconExit24 aria-hidden="true" className="bp-WaveformRange-commentIcon" />
                </button>
            );
        } else if (isCommentButtonVisible && onDragCreate) {
            const commentAction = (
                <button
                    ref={isTapeClearAvailable ? undefined : commentButtonRef}
                    className={isTapeClearAvailable ? 'bp-WaveformRange-commentLabel' : 'bp-WaveformRange-comment'}
                    data-testid="bp-waveform-range-comment"
                    onClick={event => {
                        stopRangeEvent(event);
                        onDragCreate();
                    }}
                    onPointerDown={stopRangeEvent}
                    onPointerUp={stopRangeEvent}
                    type="button"
                >
                    {commentLabel}
                </button>
            );
            commentButton = isTapeClearAvailable ? (
                <div
                    ref={commentPillRef}
                    className="bp-WaveformRange-comment bp-WaveformRange-comment--withClear"
                    data-testid="bp-waveform-range-comment-pill"
                    onPointerDown={stopRangeEvent}
                    onPointerUp={stopRangeEvent}
                >
                    {commentAction}
                    <span aria-hidden="true" className="bp-WaveformRange-commentDivider" />
                    <button
                        aria-label={__('media_range_clear')}
                        className="bp-WaveformRange-commentClear"
                        data-testid="bp-waveform-range-clear"
                        onClick={event => {
                            stopRangeEvent(event);
                            onRangeClear();
                        }}
                        onPointerDown={stopRangeEvent}
                        onPointerUp={stopRangeEvent}
                        type="button"
                    >
                        <IconExit24 aria-hidden="true" className="bp-WaveformRange-commentIcon" />
                    </button>
                </div>
            ) : (
                commentAction
            );
        }

        return (
            <div
                ref={rootRef}
                className={classNames('bp-WaveformRange', {
                    'bp-WaveformRange--highlight': highlight,
                    'bp-WaveformRange--persist': keepHighlight,
                    'bp-WaveformRange--swiping': collapsed && isSwiping,
                })}
                data-collapsed={collapsed ? 'true' : 'false'}
                data-highlighted={highlight ? 'true' : 'false'}
                data-readonly={readOnly ? 'true' : 'false'}
                data-testid="bp-waveform-range"
            >
                <div ref={regionRef} className="bp-WaveformRange-region" data-testid="bp-waveform-range-region" />
                {!readOnly && (
                    <div
                        ref={startHandleRef}
                        className={classNames('bp-WaveformRange-handle', 'bp-WaveformRange-handle--start', {
                            'bp-WaveformRange-handle--dragging': activeHandle === 'start',
                        })}
                        data-testid="bp-waveform-range-handle-start"
                        onMouseMove={event => event.stopPropagation()}
                        onPointerDown={onHandlePointerDown}
                    >
                        <div className="bp-WaveformRange-handleGrip" />
                    </div>
                )}
                {!readOnly && (
                    <div
                        ref={endHandleRef}
                        className={classNames('bp-WaveformRange-handle', 'bp-WaveformRange-handle--end', {
                            'bp-WaveformRange-handle--dragging': activeHandle === 'end',
                        })}
                        data-testid="bp-waveform-range-handle-end"
                        onMouseMove={event => event.stopPropagation()}
                        onPointerDown={onHandlePointerDown}
                    >
                        <div className="bp-WaveformRange-handleGrip" />
                    </div>
                )}
                {activeHandle && (
                    <div ref={tooltipRef} className="bp-WaveformRange-tooltip" data-testid="bp-waveform-range-tooltip">
                        <div className="bp-WaveformRange-tooltipTime">{formatTime(tooltipMs / 1000)}</div>
                    </div>
                )}
                {commentButton}
            </div>
        );
    },
);

export default React.memo(WaveformRangeSelection);
