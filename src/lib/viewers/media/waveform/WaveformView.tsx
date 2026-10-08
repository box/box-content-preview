import classNames from 'classnames';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import WaveSurfer from 'wavesurfer.js';
import { getCurrentTimeMs } from '../../../util';
import {
    getBufferedProgress,
    getPlayedWaveformColor,
    getWaveformFills,
    tintWaveformTiles,
    toCanvasFill,
    WAVEFORM_COLOR_UNPLAYED,
} from './colors';
import {
    WAVEFORM_BAR_GAP,
    WAVEFORM_BAR_MIN_HEIGHT,
    WAVEFORM_BAR_RADIUS,
    WAVEFORM_BAR_WIDTH,
    WAVEFORM_FOLLOW_SCROLL_SETTLE_MS,
    WAVEFORM_RANGE_CREATE_DRAG_PX,
    WAVEFORM_RANGE_EDGE_SCROLL_MAX_FRAME_SEC,
    WAVEFORM_HEIGHT,
    WAVEFORM_TAPE_CLICK_SUPPRESS_MS,
    WAVEFORM_RESIN_GESTURE_GAP_MS,
    WAVEFORM_TAPE_RANGE_LONG_PRESS_MS,
    WAVEFORM_TAPE_RANGE_LONG_PRESS_CANCEL_PX,
    WAVEFORM_ZOOM_DISMISS_MS,
    WAVEFORM_ZOOM_MIN,
} from './constants';
import IconComment24 from '../../controls/icons/IconComment24';
import { formatTime, morphPeaks, toChannels, WAVEFORM_PEAK_TRANSITION_MS } from './peaks';
import {
    clampTimeMs,
    commitRangeChange,
    durationMsFromSec,
    isPointerOverRange,
    isRangeCollapsed,
    pointerTimeMs,
    rangeFromCreateDrag,
    rangeProgress,
    resolveRange,
    snapTimeMs,
} from './range';
import { WaveformFills, WaveformViewProps, WaveformViewport } from './types';
import usePlayheadCamera from './usePlayheadCamera';
import WaveformRangeSelection, { WaveformRangeSelectionHandle } from './WaveformRangeSelection';
import {
    clampWaveformZoom,
    createWaveformViewport,
    getCenteredScrollLeft,
    getRangeEdgeScrollDeltaPx,
    getTapeGutterPx,
    getTapePinnedPlayheadLeft,
    getViewportAtScroll,
    getWaveformZoomMax,
    getZoomedPixelsPerSecond,
    maxScrollLeft,
    positionPxFromTime,
    timeFromPositionPx,
    timeLeftPercent,
} from './viewport';
import './WaveformView.scss';

function recordGestureSession(
    lastAtRef: { current: number },
    target: string,
    record: ((target: string) => void) | undefined,
): void {
    const currentTime = Date.now();
    if (currentTime - lastAtRef.current > WAVEFORM_RESIN_GESTURE_GAP_MS) {
        record?.(target);
    }
    lastAtRef.current = currentTime;
}

/** Pointer X in the view and the media time under it; zoom keeps this point fixed. */
type ZoomOrigin = {
    pointerX: number;
    timeSec: number;
};

/** CSS width × devicePixelRatio, for canvas gradient fills. */
function devicePixelWidth(widthCssPx: number): number {
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return widthCssPx * pixelRatio;
}

/** Dragged time while media is still at the pre-drag position. */
function pinnedPlayheadSec(pin: { fromSec: number; sec: number } | null, mediaTimeSec: number): number | null {
    if (pin && Math.abs(mediaTimeSec - pin.fromSec) <= 0.001 && Math.abs(mediaTimeSec - pin.sec) > 0.001) {
        return pin.sec;
    }
    return null;
}

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

function getScrollLeft(wavesurfer: WaveSurfer | null, fallback = 0): number {
    return wavesurfer && wavesurfer.getScroll ? wavesurfer.getScroll() : fallback;
}

function applyPeaks(wavesurfer: WaveSurfer, peaks: ArrayLike<number>, durationSec: number): void {
    if (!wavesurfer.load) {
        return;
    }
    wavesurfer.load('', toChannels(peaks), durationSec);
}

/** Stop the zoomed waveform from bouncing on trackpad overscroll. WaveSurfer's scroller is inside a shadow root, so SCSS uses `::part(scroll)` while zoomed and this sets the same property as soon as WaveSurfer exists. */
function disableScrollOverscroll(container: HTMLElement): void {
    const host = container.firstElementChild;
    const scroll = host instanceof HTMLElement ? host.shadowRoot?.querySelector('.scroll') : null;
    if (scroll instanceof HTMLElement) {
        scroll.style.overscrollBehaviorX = 'none';
    }
}

/** Half-view margins so t=0 and duration can sit under the center pin. */
function applyWaveformGutters(wavesurfer: WaveSurfer, gutterPx: number): void {
    const wrapper = wavesurfer.getWrapper ? wavesurfer.getWrapper() : null;
    if (!wrapper || !wrapper.style) {
        return;
    }
    const pad = gutterPx > 0 ? `${gutterPx}px` : '';
    wrapper.style.marginLeft = pad;
    wrapper.style.marginRight = pad;
    // WaveSurfer sets overflow-x:hidden when duration * minPxPerSec <= view width
    // (tape 1x). Gutters live in these margins, so the scroller must stay pan-able.
    const scroll = wrapper.parentElement;
    if (scroll && scroll.style) {
        const scrollStyle = scroll.style as CSSStyleDeclaration & { scrollbarWidth?: string };
        scrollStyle.overflowX = gutterPx > 0 ? 'auto' : '';
        scrollStyle.scrollbarWidth = gutterPx > 0 ? 'none' : '';
    }
}

/** Tint WaveSurfer's zoomed tiles with played/unplayed/hover/buffer colors. */
function tintZoomedWaveform(wavesurfer: WaveSurfer, fills: WaveformFills, replaceSnapshot = false): void {
    const wrapper = wavesurfer.getWrapper ? wavesurfer.getWrapper() : null;
    if (!wrapper || !(wrapper.clientWidth > 0)) {
        return;
    }
    tintWaveformTiles({
        fills,
        host: wrapper,
        replaceSnapshot,
        totalWidthCss: wrapper.clientWidth,
    });
}

/** Touch (and the compatibility mouse events Chrome sends after a tap) must not drive hover fills. */
function isTouchHoverInput(event: { nativeEvent: Event; pointerType?: string }): boolean {
    if (event.pointerType === 'touch') {
        return true;
    }
    const native = event.nativeEvent as MouseEvent & {
        sourceCapabilities?: { firesTouchEvents?: boolean };
    };
    return !!native.sourceCapabilities?.firesTouchEvents;
}

function touchDistance(touches: TouchList): number {
    if (touches.length < 2) {
        return 0;
    }
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
}

/** Time under the pointer, plus its X in the view, so zoom can keep that point fixed. */
function zoomOriginAtPointer(
    pointerX: number,
    wavesurfer: WaveSurfer | null,
    durationSec: number,
    fallbackWidth: number,
): ZoomOrigin | null {
    if (!(fallbackWidth > 0) || !(durationSec > 0) || !Number.isFinite(pointerX)) {
        return null;
    }
    const wrapper = wavesurfer && wavesurfer.getWrapper ? wavesurfer.getWrapper() : null;
    const fullWidth = wrapper && wrapper.clientWidth ? wrapper.clientWidth : fallbackWidth;
    if (!(fullWidth > 0)) {
        return null;
    }
    return { pointerX, timeSec: ((getScrollLeft(wavesurfer) + pointerX) / fullWidth) * durationSec };
}

type RangeCreateDrag = {
    active: boolean;
    originMs: number;
    originX: number;
    pointerId: number;
    range: { endMs: number; startMs: number } | null;
};

/** Null when the press should stay a click-to-seek or is not on an empty span of the track. */
function rangeCreateDragFromEvent(
    event: React.PointerEvent<HTMLDivElement>,
    source: {
        durationSec: number;
        range: WaveformViewProps['range'];
        track: HTMLDivElement | null;
        viewport: WaveformViewport;
    },
): RangeCreateDrag | null {
    const { track } = source;
    if (!track || !(source.durationSec > 0) || !Number.isFinite(event.clientX)) {
        return null;
    }
    const rect = track.getBoundingClientRect();
    if (!(rect.width > 0)) {
        return null;
    }
    const pointerX = event.clientX - rect.left;
    if (
        source.range &&
        !isRangeCollapsed(source.range) &&
        isPointerOverRange({ pointerX, range: source.range, viewport: source.viewport })
    ) {
        return null;
    }
    return {
        active: false,
        originMs: clampTimeMs(pointerTimeMs(pointerX, source.viewport), durationMsFromSec(source.durationSec)),
        originX: event.clientX,
        pointerId: event.pointerId,
        range: null,
    };
}

function drawnRangeFromMove(
    drag: RangeCreateDrag,
    clientX: number,
    track: HTMLDivElement,
    viewport: WaveformViewport,
    playheadSec: number,
    durationSec: number,
): { endMs: number; startMs: number } {
    const pointerMs = snapTimeMs({
        pixelsPerSecond: viewport.pixelsPerSecond,
        playheadMs: playheadSec * 1000,
        timeMs: pointerTimeMs(clientX - track.getBoundingClientRect().left, viewport),
    });
    return rangeFromCreateDrag({
        durationMs: durationMsFromSec(durationSec),
        originMs: drag.originMs,
        pointerMs,
    });
}

/**
 * Renders V1 peaks with wavesurfer. Does not fetch audio or attach a media element.
 */
function WaveformView({
    bufferedRange,
    cameraMode = 'desktop',
    currentTime = 0,
    durationSec,
    height = WAVEFORM_HEIGHT,
    interactive = true,
    isPlaying = false,
    mediaEl,
    onPlayPause,
    onPlayheadComment,
    onRangeChange,
    onRangeClear,
    onRangeDragCreate,
    onRangeDragChange,
    onResinAction,
    onSeek,
    onViewportChange,
    onZoomChange,
    peaks,
    range = null,
    rangeReadOnly = false,
    zoomLevel: zoomLevelProp,
}: WaveformViewProps): JSX.Element {
    // DOM / WaveSurfer
    const containerRef = useRef<HTMLDivElement>(null); // WaveSurfer canvas host
    const playheadAnimationRef = useRef(0); // animation frame id while the playhead follows playback
    const playheadRef = useRef<HTMLDivElement>(null); // playhead element the camera positions
    const rangeLayerRef = useRef<WaveformRangeSelectionHandle>(null);
    const trackRef = useRef<HTMLDivElement>(null); // hover / tap target around the canvas
    const wavesurferRef = useRef<WaveSurfer | null>(null); // WaveSurfer instance

    // Latest props for WaveSurfer + media listeners that must not re-subscribe each render.
    const cameraModeRef = useRef(cameraMode); // latest tape/desktop; WaveSurfer create() deps stay empty
    const currentTimeRef = useRef(currentTime); // latest media time; zoom recenter reads this
    const durationSecRef = useRef(durationSec); // latest duration; click-to-seek reads this
    const hasZoomHandlersRef = useRef(false); // parent can zoom; wheel/pinch check this
    const interactiveRef = useRef(interactive); // latest interactive; WaveSurfer listeners read this
    const isPlayingRef = useRef(isPlaying); // latest isPlaying; tape tap toggles from this
    const mediaElRef = useRef(mediaEl); // latest <audio>/<video>; camera + playhead tick read this
    const onPlayPauseRef = useRef(onPlayPause); // latest play/pause; tape tap must not re-bind
    const onRangeChangeRef = useRef(onRangeChange); // latest range commit; drag-create must not re-bind
    const onRangeClearRef = useRef(onRangeClear); // latest click-outside clear; WaveSurfer click must not re-bind
    const onRangeDragChangeRef = useRef(onRangeDragChange); // latest drag flag; unmount must not re-bind
    const onResinActionRef = useRef(onResinAction); // latest resin callback; gesture listeners must not re-bind
    const onSeekRef = useRef(onSeek); // latest onSeek; click/scroll handlers must not re-bind
    const onViewportChangeRef = useRef(onViewportChange); // latest viewport callback; camera commits here
    const peaksRef = useRef(peaks); // latest peaks; WaveSurfer create() + morph read this

    const displayedPeaksRef = useRef<ArrayLike<number> | null>(null); // peaks currently drawn (for morph)
    const peakTransitionAnimationRef = useRef(0); // animation frame id while peaks morph in
    // Zoom / pinch / tile tint (read from pointer + WaveSurfer handlers)
    const applyZoomWindowRef = useRef<(() => void) | null>(null); // latest applyZoomWindow; resize observer calls this
    const bufferProgressRef = useRef(0); // latest buffer fill; zoomed tile tint reads this
    const hideScrubTimeChipTimerRef = useRef(0); // hides the tape scrub time chip after scroll settles
    const hoverProgressRef = useRef<number | null>(null); // latest hover fill; zoomed tile tint reads this
    const isPlayheadDraggingRef = useRef(false); // playhead drag owns position until pointerup
    const lastObservedWidthRef = useRef(0); // last ResizeObserver width; skip no-op resizes
    const liveHeightRef = useRef(height); // canvas height last applied to WaveSurfer
    const lastPinchResinAtRef = useRef(0); // last pinch resin time; one zoomIn/zoomOut per WAVEFORM_RESIN_GESTURE_GAP_MS
    const lastSwipeResinAtRef = useRef(0); // last tape-swipe resin time; one waveformSwipe per burst
    const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null); // two-finger distance and zoom at pinch start
    const playheadDragRef = useRef<{ fromSec: number; pointerId: number } | null>(null); // active playhead drag; pointerup seeks
    const playheadPinRef = useRef<{ fromSec: number; sec: number } | null>(null); // dragged time until media/props catch up
    const pointerZoomClearTimerRef = useRef(0); // clears pointerZoomRef after WAVEFORM_ZOOM_DISMISS_MS
    const pointerZoomRef = useRef(false); // pinch/wheel in progress; skip play/pause and tape recenter
    const queuedTapeSeekTimeSecRef = useRef<number | null>(null); // seek time waiting for the next animation frame
    const rangeProgressRef = useRef<ReturnType<typeof rangeProgress>>(null); // latest range progress; zoomed tile tint reads this
    const suppressNextTapPlayPauseRef = useRef(false); // swallow play/pause after a swipe or pinch
    const suppressNextTapPlayPauseTimerRef = useRef(0); // clears suppressNextTapPlayPauseRef
    const suppressViewportSyncRef = useRef(false); // ignore WaveSurfer zoom/scroll while we setOptions
    const tapeSeekAnimationRef = useRef(0); // coalesces swipe seeks to one seek per animation frame
    const toggleTapePlaybackRef = useRef<(() => void) | null>(null); // latest tap play/pause; click/pointerup call this
    const zoomOriginRef = useRef<ZoomOrigin | null>(null); // pointer+time so zoom keeps that point fixed

    cameraModeRef.current = cameraMode;
    if (!isPlayheadDraggingRef.current && playheadPinRef.current == null) {
        currentTimeRef.current = currentTime;
    }
    durationSecRef.current = durationSec;
    interactiveRef.current = interactive;
    isPlayingRef.current = isPlaying;
    mediaElRef.current = mediaEl;
    onPlayPauseRef.current = onPlayPause;
    onRangeChangeRef.current = onRangeChange;
    onRangeClearRef.current = onRangeClear;
    onRangeDragChangeRef.current = onRangeDragChange;
    onResinActionRef.current = onResinAction;
    onSeekRef.current = onSeek;
    onViewportChangeRef.current = onViewportChange;
    peaksRef.current = peaks;

    const [internalZoom, setInternalZoom] = useState(WAVEFORM_ZOOM_MIN);
    const [hoverProgress, setHoverProgress] = useState<number | null>(null);
    const [scrubPreviewTimeSec, setScrubPreviewTimeSec] = useState<number | null>(null);
    const [overlayPortalHost, setOverlayPortalHost] = useState<HTMLElement | null>(null);
    const [canvasWidthPx, setCanvasWidthPx] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [previewRange, setPreviewRange] = useState<WaveformViewProps['range']>(null);
    const [createRange, setCreateRange] = useState<WaveformViewProps['range']>(null);
    const [isRangeDragging, setIsRangeDragging] = useState(false);
    const [isPlayheadDragging, setIsPlayheadDragging] = useState(false);
    const createDragRef = useRef<RangeCreateDrag | null>(null);
    const isRangeDraggingRef = useRef(false);
    const lastSetTimeSecRef = useRef<number | null>(null);
    const rangeDragPointerXRef = useRef<number | null>(null); // clientX while a handle or create-drag is down
    const rangeRef = useRef(range); // latest committed draft; drag-create must not start on top of an open span
    const removeCreateDragListenersRef = useRef<(() => void) | null>(null);
    const removeTapeContextMenuRef = useRef<(() => void) | null>(null);
    const skipNextSeekRef = useRef(false); // ignore the click fired when a handle is released
    const tapeRangeHoldRef = useRef(false); // a tape long-press is waiting to draw; touch must not scroll
    const [isRangeHovered, setIsRangeHovered] = useState(false);
    const isControlled = typeof zoomLevelProp === 'number';
    const maxZoom = getWaveformZoomMax({
        durationSec,
        peakCount: peaks.length,
        viewWidthPx: canvasWidthPx,
    });
    hasZoomHandlersRef.current =
        maxZoom > WAVEFORM_ZOOM_MIN && (typeof onZoomChange === 'function' || typeof zoomLevelProp !== 'number');
    const zoomLevel = clampWaveformZoom(isControlled ? zoomLevelProp : internalZoom, maxZoom);
    const zoomRef = useRef(zoomLevel); // latest zoom for WaveSurfer redraw/zoom handlers
    zoomRef.current = zoomLevel;
    const prevZoomRef = useRef<number | null>(null); // last applied zoom; tape recenters only when this changes
    const isTape = cameraMode === 'tape';
    const isZoomed = zoomLevel > WAVEFORM_ZOOM_MIN;
    const isScrollableWindow = isZoomed || isTape;
    const bufferProgress = getBufferedProgress(bufferedRange, durationSec);
    bufferProgressRef.current = bufferProgress;
    hoverProgressRef.current = isRangeDragging ? null : hoverProgress;
    rangeRef.current = range;
    const activeRange = (isRangeDragging ? previewRange ?? createRange : createRange) ?? range;
    const activeRangeRef = useRef(activeRange);
    activeRangeRef.current = activeRange;
    const viewedRangeRef = useRef(false);
    viewedRangeRef.current = rangeReadOnly && createRange == null;
    const durationMs = durationMsFromSec(durationSec);
    const rangeStartMs = activeRange?.startMs;
    const rangeEndMs = activeRange?.endMs;
    const activeRangeProgress = useMemo(() => {
        if (rangeStartMs == null || !Number.isFinite(rangeStartMs)) {
            return null;
        }
        return rangeProgress(
            resolveRange({ endMs: rangeEndMs ?? null, startMs: rangeStartMs }, durationMs),
            durationMs,
        );
    }, [durationMs, rangeEndMs, rangeStartMs]);
    rangeProgressRef.current = activeRangeProgress;

    const viewport = useMemo(
        () =>
            createWaveformViewport({
                durationSec,
                gutterPx: isTape ? getTapeGutterPx(canvasWidthPx) : 0,
                heightPx: height,
                maxZoom,
                scrollLeftPx: scrollLeft,
                widthPx: canvasWidthPx,
                zoomLevel,
            }),
        [canvasWidthPx, durationSec, height, isTape, maxZoom, scrollLeft, zoomLevel],
    );
    const viewportRef = useRef(viewport); // live scroll window; prefer this over render-state while the camera is moving
    const onViewportCommit = useCallback(
        (scrollLeftPx: number, nextViewport: WaveformViewport, commitReactState = true): void => {
            rangeLayerRef.current?.applyViewport(nextViewport);
            onViewportChangeRef.current?.(nextViewport);
            if (commitReactState) {
                setScrollLeft(scrollLeftPx);
            }
        },
        [],
    );
    const {
        apply: applyPlayheadCamera,
        applyScrollLeft,
        cancelJump,
        clearFollowPin,
        handleScroll: handleCameraScroll,
        isFollowPinned,
        isUserPanning,
        onSeek: onPlayheadSeek,
        onZoom,
        releaseUserPanHold,
        seekTo,
    } = usePlayheadCamera({
        cameraMode,
        mediaElRef,
        onViewportCommit,
        playheadRef,
        viewportRef,
        wavesurferRef,
    });

    const suppressTapToPlayPause = useCallback((): void => {
        suppressNextTapPlayPauseRef.current = true;
        window.clearTimeout(suppressNextTapPlayPauseTimerRef.current);
        suppressNextTapPlayPauseTimerRef.current = window.setTimeout(() => {
            suppressNextTapPlayPauseRef.current = false;
            suppressNextTapPlayPauseTimerRef.current = 0;
        }, WAVEFORM_TAPE_CLICK_SUPPRESS_MS);
    }, []);

    const toggleTapePlayback = useCallback(() => {
        if (!interactiveRef.current) {
            return;
        }
        if (isUserPanning() || pointerZoomRef.current || isRangeDraggingRef.current) {
            return;
        }
        if (suppressNextTapPlayPauseRef.current) {
            suppressNextTapPlayPauseRef.current = false;
            window.clearTimeout(suppressNextTapPlayPauseTimerRef.current);
            suppressNextTapPlayPauseTimerRef.current = 0;
            return;
        }
        onResinActionRef.current?.('playPause');
        onPlayPauseRef.current?.(!isPlayingRef.current);
        suppressTapToPlayPause();
    }, [isUserPanning, suppressTapToPlayPause]);
    toggleTapePlaybackRef.current = toggleTapePlayback;

    useLayoutEffect(() => {
        viewportRef.current = createWaveformViewport({
            durationSec: viewport.durationSec,
            gutterPx: viewport.gutterPx,
            heightPx: viewport.heightPx,
            maxZoom: viewport.maxZoom,
            scrollLeftPx: viewportRef.current.scrollLeftPx,
            widthPx: viewport.widthPx,
            zoomLevel: viewport.zoomLevel,
        });
        const drag = createDragRef.current;
        const clientX = rangeDragPointerXRef.current;
        const track = trackRef.current;
        if (!drag?.active || clientX == null || !track) {
            return;
        }
        const playheadSec = mediaElRef.current ? mediaElRef.current.currentTime : currentTimeRef.current;
        const drawn = drawnRangeFromMove(
            drag,
            clientX,
            track,
            viewportRef.current,
            playheadSec,
            durationSecRef.current,
        );
        if (drawn.startMs === drag.range?.startMs && drawn.endMs === drag.range?.endMs) {
            return;
        }
        drag.range = drawn;
        setCreateRange(drawn);
        setPreviewRange(drawn);
    }, [viewport]);

    const setZoomLevel = useCallback(
        (nextZoom: number) => {
            const zoom = clampWaveformZoom(nextZoom, maxZoom);
            if (!isControlled) {
                setInternalZoom(zoom);
            }
            onZoomChange?.(zoom);
        },
        [isControlled, maxZoom, onZoomChange],
    );

    const markPointerZoom = useCallback((): void => {
        pointerZoomRef.current = true;
        window.clearTimeout(pointerZoomClearTimerRef.current);
        pointerZoomClearTimerRef.current = window.setTimeout(() => {
            pointerZoomRef.current = false;
            pointerZoomClearTimerRef.current = 0;
        }, WAVEFORM_ZOOM_DISMISS_MS);
    }, []);

    /**
     * Seek the time under the pin (one seek per frame). Swallow the delayed iOS click;
     * show the scrub chip until the swipe settles.
     */
    const handleTapeSwipe = useCallback((timeSec: number): void => {
        recordGestureSession(lastSwipeResinAtRef, 'waveformSwipe', onResinActionRef.current);
        // Swallow the click WaveSurfer/iOS fires after a swipe or pinch.
        suppressNextTapPlayPauseRef.current = true;
        window.clearTimeout(suppressNextTapPlayPauseTimerRef.current);
        suppressNextTapPlayPauseTimerRef.current = window.setTimeout(() => {
            suppressNextTapPlayPauseRef.current = false;
            suppressNextTapPlayPauseTimerRef.current = 0;
        }, WAVEFORM_TAPE_CLICK_SUPPRESS_MS);
        queuedTapeSeekTimeSecRef.current = timeSec;
        if (!tapeSeekAnimationRef.current) {
            // One seek per frame; later scrolls just update the queued time.
            tapeSeekAnimationRef.current = window.requestAnimationFrame(() => {
                tapeSeekAnimationRef.current = 0;
                const next = queuedTapeSeekTimeSecRef.current;
                queuedTapeSeekTimeSecRef.current = null;
                if (next != null) {
                    onSeekRef.current?.(next);
                }
            });
        }
        if (interactiveRef.current) {
            // Show the time under the pin; hide once scrolling has settled.
            setScrubPreviewTimeSec(timeSec);
            window.clearTimeout(hideScrubTimeChipTimerRef.current);
            hideScrubTimeChipTimerRef.current = window.setTimeout(() => {
                setScrubPreviewTimeSec(null);
                hideScrubTimeChipTimerRef.current = 0;
            }, WAVEFORM_FOLLOW_SCROLL_SETTLE_MS);
        }
    }, []);

    const syncViewport = useCallback(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer) {
            return;
        }
        const scrollLeftPx = getScrollLeft(wavesurfer);
        viewportRef.current = getViewportAtScroll(viewportRef.current, scrollLeftPx);
        rangeLayerRef.current?.applyViewport(viewportRef.current);
        onViewportChangeRef.current?.(viewportRef.current);
        setScrollLeft(scrollLeftPx);
    }, []);

    const updatePlayheadPosition = useCallback(
        (timeSec: number): void => {
            const playhead = playheadRef.current;
            if (!playhead) {
                return;
            }

            if (isTape) {
                playhead.style.left = getTapePinnedPlayheadLeft();
            } else if (!isFollowPinned()) {
                playhead.style.left = timeLeftPercent(timeSec, durationSecRef.current, viewportRef.current);
            }
            rangeLayerRef.current?.applyViewport(viewportRef.current);

            const wavesurfer = wavesurferRef.current;
            if (wavesurfer && wavesurfer.setTime && lastSetTimeSecRef.current !== timeSec) {
                lastSetTimeSecRef.current = timeSec;
                wavesurfer.setTime(timeSec);
            }
        },
        [isFollowPinned, isTape],
    );

    // Same zoom-window body as the zoom effect; extracted so resize can call it too.
    const applyZoomWindow = useCallback((): void => {
        const wavesurfer = wavesurferRef.current;
        const container = containerRef.current;
        if (!wavesurfer || !wavesurfer.setOptions || !container) {
            return;
        }

        const viewWidthPx = wavesurfer.getWidth ? wavesurfer.getWidth() : container.clientWidth;
        const minPxPerSec = getZoomedPixelsPerSecond({
            durationSec,
            isTape,
            maxZoom,
            viewWidthPx,
            zoomLevel,
        });
        const gutterPx = isTape ? getTapeGutterPx(viewWidthPx) : 0;
        const origin = isTape ? null : zoomOriginRef.current;
        zoomOriginRef.current = null;
        const didZoomChange = prevZoomRef.current !== zoomLevel;
        if (origin || didZoomChange) {
            onZoom();
        }

        suppressViewportSyncRef.current = true;
        try {
            wavesurfer.setOptions({
                autoScroll: false,
                fillParent: !isTape,
                minPxPerSec,
                ...(isScrollableWindow
                    ? {
                          progressColor: getPlayedWaveformColor(isTape),
                          waveColor: WAVEFORM_COLOR_UNPLAYED,
                      }
                    : {}),
            });
            applyWaveformGutters(wavesurfer, gutterPx);
            if (minPxPerSec > 0) {
                const windowViewport = createWaveformViewport({
                    durationSec,
                    gutterPx,
                    heightPx: liveHeightRef.current || height,
                    maxZoom,
                    scrollLeftPx: 0,
                    widthPx: viewWidthPx,
                    zoomLevel,
                });
                if (origin) {
                    applyScrollLeft(origin.timeSec * minPxPerSec + gutterPx - origin.pointerX, true);
                } else if (didZoomChange && (isTape || !pointerZoomRef.current)) {
                    applyScrollLeft(getCenteredScrollLeft(currentTimeRef.current, windowViewport), true);
                }
            }
            lastSetTimeSecRef.current = currentTimeRef.current;
            wavesurfer.setTime(currentTimeRef.current);
        } finally {
            suppressViewportSyncRef.current = false;
            prevZoomRef.current = zoomLevel;
        }

        syncViewport();
        updatePlayheadPosition(currentTimeRef.current);
    }, [
        applyScrollLeft,
        durationSec,
        height,
        isScrollableWindow,
        isTape,
        maxZoom,
        onZoom,
        syncViewport,
        updatePlayheadPosition,
        zoomLevel,
    ]);
    applyZoomWindowRef.current = applyZoomWindow;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const measuredHeight =
            cameraModeRef.current === 'tape' && container.clientHeight > 0
                ? Math.round(container.clientHeight)
                : height;
        if (cameraModeRef.current === 'tape' && measuredHeight > 0) {
            liveHeightRef.current = measuredHeight;
        }

        const wavesurfer = WaveSurfer.create({
            autoScroll: false,
            barGap: WAVEFORM_BAR_GAP,
            barMinHeight: WAVEFORM_BAR_MIN_HEIGHT,
            barRadius: WAVEFORM_BAR_RADIUS,
            barWidth: WAVEFORM_BAR_WIDTH,
            container,
            cursorWidth: 0,
            duration: durationSecRef.current,
            fillParent: true,
            height: measuredHeight,
            hideScrollbar: true,
            dragToSeek: false,
            interact: interactiveRef.current && cameraModeRef.current !== 'tape',
            normalize: false,
            peaks: toChannels(peaksRef.current),
            progressColor: getPlayedWaveformColor(cameraModeRef.current === 'tape'),
            waveColor: WAVEFORM_COLOR_UNPLAYED,
        });

        const unsubscribeClick = wavesurfer.on('click', (relativeX: number) => {
            if (skipNextSeekRef.current) {
                skipNextSeekRef.current = false;
                return;
            }
            if (!interactiveRef.current || isRangeDraggingRef.current) {
                return;
            }
            const rangeDraft = activeRangeRef.current;
            const timeSec = relativeX * durationSecRef.current;
            // A tape draft dismisses from the pill. A viewed range, and desktop, still clear on click-outside.
            if (
                (cameraModeRef.current !== 'tape' || viewedRangeRef.current) &&
                rangeDraft &&
                !isRangeCollapsed(rangeDraft)
            ) {
                const pointerX = positionPxFromTime(timeSec, viewportRef.current);
                if (!isPointerOverRange({ pointerX, range: rangeDraft, viewport: viewportRef.current })) {
                    onRangeClearRef.current?.();
                    onResinActionRef.current?.('waveformRangeDismiss');
                }
            }
            if (cameraModeRef.current === 'tape') {
                toggleTapePlaybackRef.current?.();
                return;
            }
            onResinActionRef.current?.('waveformSeek');
            onSeekRef.current?.(timeSec);
        });
        const unsubscribeScroll = wavesurfer.on('scroll', () => {
            if (suppressViewportSyncRef.current || isRangeDraggingRef.current) {
                // A handle drag scrolls from its own frame loop. A pan settle would pull it back.
                return;
            }
            // User pan: map scroll to the time under the playhead, then tape seeks it.
            handleCameraScroll(timeSec => {
                if (cameraModeRef.current === 'tape' && !pointerZoomRef.current && !createDragRef.current) {
                    handleTapeSwipe(timeSec);
                }
                syncViewport();
            });
            rangeLayerRef.current?.applyViewport(viewportRef.current);
        });
        const unsubscribeZoom = wavesurfer.on('zoom', () => {
            if (suppressViewportSyncRef.current) {
                return;
            }
            syncViewport();
        });
        const unsubscribeRedraw = wavesurfer.on('redrawcomplete', () => {
            if (!(zoomRef.current > WAVEFORM_ZOOM_MIN) && cameraModeRef.current !== 'tape') {
                return;
            }
            tintZoomedWaveform(
                wavesurfer,
                getWaveformFills({
                    bufferProgress: bufferProgressRef.current,
                    hoverProgress: cameraModeRef.current === 'tape' ? null : hoverProgressRef.current,
                    isTape: cameraModeRef.current === 'tape',
                    rangeProgress: rangeProgressRef.current,
                }),
                true,
            );
        });

        wavesurferRef.current = wavesurfer;
        displayedPeaksRef.current = peaksRef.current;
        lastSetTimeSecRef.current = null;
        disableScrollOverscroll(container);
        syncViewport();
        applyZoomWindowRef.current?.();

        return () => {
            releaseUserPanHold();
            cancelJump();
            window.clearTimeout(hideScrubTimeChipTimerRef.current);
            window.clearTimeout(suppressNextTapPlayPauseTimerRef.current);
            window.cancelAnimationFrame(tapeSeekAnimationRef.current);
            window.cancelAnimationFrame(peakTransitionAnimationRef.current);
            unsubscribeClick();
            unsubscribeScroll();
            unsubscribeZoom();
            unsubscribeRedraw();
            wavesurfer.destroy();
            wavesurferRef.current = null;
            displayedPeaksRef.current = null;
            lastSetTimeSecRef.current = null;
        };
    }, [cancelJump, handleCameraScroll, handleTapeSwipe, height, isUserPanning, releaseUserPanHold, syncViewport]);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return undefined;
        }

        setCanvasWidthPx(el.clientWidth);
        lastObservedWidthRef.current = el.clientWidth;
        const mountedHeight = Math.round(el.clientHeight);
        if (cameraModeRef.current === 'tape' && mountedHeight > 0) {
            liveHeightRef.current = mountedHeight;
        }

        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const nextWidth = entry.contentRect.width;
                const widthChanged = nextWidth !== lastObservedWidthRef.current;
                lastObservedWidthRef.current = nextWidth;
                setCanvasWidthPx(nextWidth);
                const nextHeight = Math.round(entry.contentRect.height);
                if (
                    cameraModeRef.current === 'tape' &&
                    Number.isFinite(nextHeight) &&
                    nextHeight > 0 &&
                    nextHeight !== liveHeightRef.current
                ) {
                    liveHeightRef.current = nextHeight;
                    const wavesurfer = wavesurferRef.current;
                    if (wavesurfer && wavesurfer.setOptions) {
                        wavesurfer.setOptions({ height: nextHeight });
                    }
                }
                syncViewport();
                if (widthChanged) {
                    applyZoomWindowRef.current?.();
                }
            });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [syncViewport]);

    useEffect(() => {
        const rawZoom = isControlled ? zoomLevelProp : internalZoom;
        const clamped = clampWaveformZoom(typeof rawZoom === 'number' ? rawZoom : WAVEFORM_ZOOM_MIN, maxZoom);
        if (clamped === rawZoom) {
            return;
        }
        if (!isControlled) {
            setInternalZoom(clamped);
        }
    }, [internalZoom, isControlled, maxZoom, zoomLevelProp]);

    useEffect(() => {
        // Follow skips React scrollLeft; emit the layout-refreshed live window instead.
        onViewportChange?.(viewportRef.current);
    }, [onViewportChange, viewport]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setOptions) {
            return;
        }
        wavesurfer.setOptions({ interact: interactive && cameraModeRef.current !== 'tape' });
    }, [interactive]);

    useLayoutEffect(() => {
        applyZoomWindow();
    }, [applyZoomWindow]);

    useLayoutEffect(() => {
        if (isPlayheadDraggingRef.current) {
            return;
        }
        const mediaTimeSec = mediaEl ? mediaEl.currentTime : currentTime;
        const draggedTimeSec = pinnedPlayheadSec(playheadPinRef.current, mediaTimeSec);
        if (draggedTimeSec != null) {
            updatePlayheadPosition(draggedTimeSec);
            return;
        }
        playheadPinRef.current = null;
        updatePlayheadPosition(mediaTimeSec);
    }, [currentTime, durationSec, mediaEl, updatePlayheadPosition, viewport]);

    useEffect(() => {
        const media = mediaEl;
        if (!media) {
            return undefined;
        }

        const tick = (): void => {
            if (!media.paused && !isPlayheadDraggingRef.current) {
                const mediaTimeSec = media.currentTime;
                const draggedTimeSec = pinnedPlayheadSec(playheadPinRef.current, mediaTimeSec);
                if (draggedTimeSec == null) {
                    playheadPinRef.current = null;
                }
                updatePlayheadPosition(draggedTimeSec ?? mediaTimeSec);
                if (draggedTimeSec == null && !isRangeDraggingRef.current) {
                    applyPlayheadCamera(mediaTimeSec, false);
                }
            }
            playheadAnimationRef.current = window.requestAnimationFrame(tick);
        };

        const startLoop = (): void => {
            window.cancelAnimationFrame(playheadAnimationRef.current);
            releaseUserPanHold();
            if (!isRangeDraggingRef.current && !isPlayheadDraggingRef.current) {
                applyPlayheadCamera(media.currentTime, true);
            }
            playheadAnimationRef.current = window.requestAnimationFrame(tick);
        };

        const stopLoop = (): void => {
            window.cancelAnimationFrame(playheadAnimationRef.current);
            cancelJump();
            releaseUserPanHold();
            if (cameraModeRef.current !== 'tape') {
                clearFollowPin();
            }
            syncViewport();
            if (!isPlayheadDraggingRef.current) {
                updatePlayheadPosition(media.currentTime);
            }
        };

        const handleSeeked = (): void => {
            if (isPlayheadDraggingRef.current) {
                return;
            }
            playheadPinRef.current = null;
            onPlayheadSeek(media.currentTime);
            if (!isUserPanning() && !isRangeDraggingRef.current) {
                seekTo(media.currentTime);
            }
            updatePlayheadPosition(media.currentTime);
        };

        if (!media.paused) {
            startLoop();
        }

        media.addEventListener('play', startLoop);
        media.addEventListener('playing', startLoop);
        media.addEventListener('pause', stopLoop);
        media.addEventListener('seeked', handleSeeked);

        return () => {
            window.cancelAnimationFrame(playheadAnimationRef.current);
            cancelJump();
            releaseUserPanHold();
            media.removeEventListener('play', startLoop);
            media.removeEventListener('playing', startLoop);
            media.removeEventListener('pause', stopLoop);
            media.removeEventListener('seeked', handleSeeked);
        };
    }, [
        applyPlayheadCamera,
        cancelJump,
        clearFollowPin,
        isUserPanning,
        mediaEl,
        onPlayheadSeek,
        releaseUserPanHold,
        seekTo,
        syncViewport,
        updatePlayheadPosition,
    ]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setOptions || !(durationSec > 0)) {
            return undefined;
        }

        window.cancelAnimationFrame(peakTransitionAnimationRef.current);

        const fromPeaks = displayedPeaksRef.current;
        if (!fromPeaks || fromPeaks === peaks || prefersReducedMotion()) {
            displayedPeaksRef.current = peaks;
            applyPeaks(wavesurfer, peaks, durationSec);
            return undefined;
        }

        const start = getCurrentTimeMs();
        const tick = (now: number): void => {
            const elapsedMs = now - start;
            const framePeaks = morphPeaks(fromPeaks, peaks, elapsedMs);
            displayedPeaksRef.current = framePeaks;
            applyPeaks(wavesurfer, framePeaks, durationSec);
            if (elapsedMs < WAVEFORM_PEAK_TRANSITION_MS) {
                peakTransitionAnimationRef.current = window.requestAnimationFrame(tick);
            } else {
                displayedPeaksRef.current = peaks;
            }
        };
        peakTransitionAnimationRef.current = window.requestAnimationFrame(tick);

        return () => window.cancelAnimationFrame(peakTransitionAnimationRef.current);
    }, [durationSec, peaks]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setOptions) {
            return;
        }

        const fills = getWaveformFills({
            bufferProgress,
            hoverProgress: isTape ? null : hoverProgress,
            isTape,
            rangeProgress: activeRangeProgress,
        });
        if (isScrollableWindow) {
            tintZoomedWaveform(wavesurfer, fills);
        } else {
            wavesurfer.setOptions({
                progressColor: toCanvasFill(fills.progressColor, devicePixelWidth(canvasWidthPx)),
                waveColor: toCanvasFill(fills.waveColor, devicePixelWidth(canvasWidthPx)),
            });
        }
        if (!isScrollableWindow || isPlayheadDragging) {
            // WaveSurfer clips progressColor left of this time.
            const playedUntilSec =
                isPlayheadDragging && hoverProgress != null
                    ? hoverProgress * durationSecRef.current
                    : currentTimeRef.current;
            lastSetTimeSecRef.current = playedUntilSec;
            wavesurfer.setTime(playedUntilSec);
        }
    }, [
        activeRangeProgress,
        bufferProgress,
        canvasWidthPx,
        hoverProgress,
        isPlayheadDragging,
        isRangeDragging,
        isScrollableWindow,
        isTape,
        isZoomed,
    ]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return undefined;
        }

        /** Remember the time under this pointer so pinch/wheel zoom stays anchored. */
        const captureZoomOrigin = (clientX: number): void => {
            const rect = track.getBoundingClientRect();
            zoomOriginRef.current = zoomOriginAtPointer(
                clientX - rect.left,
                wavesurferRef.current,
                durationSec,
                rect.width,
            );
            markPointerZoom();
        };

        /** Zoom origin at the midpoint of a two-finger pinch. */
        const zoomOriginFromPinch = (touches: TouchList): ZoomOrigin | null => {
            if (touches.length < 2) {
                return null;
            }
            const rect = track.getBoundingClientRect();
            const pointerX = (touches[0].clientX + touches[1].clientX) / 2 - rect.left;
            return zoomOriginAtPointer(pointerX, wavesurferRef.current, durationSec, rect.width);
        };

        /** Ctrl/meta + wheel zooms around the pointer. */
        const onZoomWheel = (event: WheelEvent): void => {
            if (!interactiveRef.current || !hasZoomHandlersRef.current || (!event.ctrlKey && !event.metaKey)) {
                return;
            }
            event.preventDefault();
            recordGestureSession(
                lastPinchResinAtRef,
                event.deltaY > 0 ? 'zoomOut' : 'zoomIn',
                onResinActionRef.current,
            );
            captureZoomOrigin(event.clientX);
            setZoomLevel(zoomRef.current * Math.exp(-event.deltaY * 0.01));
        };

        const onTouchStart = (event: TouchEvent): void => {
            if (!interactiveRef.current || !hasZoomHandlersRef.current || event.touches.length !== 2) {
                pinchStartRef.current = null;
                return;
            }
            zoomOriginRef.current = zoomOriginFromPinch(event.touches);
            pinchStartRef.current = { distance: touchDistance(event.touches), zoom: zoomRef.current };
            markPointerZoom();
        };

        const onTouchMove = (event: TouchEvent): void => {
            // A tape hold or range drag owns the touch. A desktop press can still scroll.
            if (cameraModeRef.current === 'tape' && (tapeRangeHoldRef.current || createDragRef.current)) {
                event.preventDefault();
            }
            const pinch = pinchStartRef.current;
            if (
                !interactiveRef.current ||
                !hasZoomHandlersRef.current ||
                !pinch ||
                event.touches.length !== 2 ||
                !(pinch.distance > 0)
            ) {
                return;
            }
            event.preventDefault();
            const distance = touchDistance(event.touches);
            if (distance !== pinch.distance) {
                recordGestureSession(
                    lastPinchResinAtRef,
                    distance > pinch.distance ? 'zoomIn' : 'zoomOut',
                    onResinActionRef.current,
                );
            }
            zoomOriginRef.current = zoomOriginFromPinch(event.touches);
            markPointerZoom();
            setZoomLevel(pinch.zoom * (distance / pinch.distance));
        };

        const onTouchEnd = (event: TouchEvent): void => {
            if (event.touches.length < 2) {
                pinchStartRef.current = null;
            }
        };

        track.addEventListener('wheel', onZoomWheel, { passive: false });
        track.addEventListener('touchstart', onTouchStart, { passive: true });
        track.addEventListener('touchmove', onTouchMove, { passive: false });
        track.addEventListener('touchend', onTouchEnd);
        track.addEventListener('touchcancel', onTouchEnd);
        return () => {
            window.clearTimeout(pointerZoomClearTimerRef.current);
            track.removeEventListener('wheel', onZoomWheel);
            track.removeEventListener('touchstart', onTouchStart);
            track.removeEventListener('touchmove', onTouchMove);
            track.removeEventListener('touchend', onTouchEnd);
            track.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [durationSec, markPointerZoom, setZoomLevel]);

    const onHoverMove = useCallback(
        (event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
            if (isTape || isTouchHoverInput(event)) {
                return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            if (!(rect.width > 0)) {
                return;
            }
            const pointerX = event.clientX - rect.left;
            if (!Number.isFinite(pointerX)) {
                return;
            }
            const vp = viewportRef.current;
            const rangeDraft = activeRangeRef.current;
            setIsRangeHovered(!!rangeDraft && isPointerOverRange({ pointerX, range: rangeDraft, viewport: vp }));
            if (!interactive || isRangeDraggingRef.current || !(durationSec > 0)) {
                return;
            }
            if (vp.pixelsPerSecond > 0) {
                setHoverProgress(Math.min(1, Math.max(0, timeFromPositionPx(pointerX, vp) / durationSec)));
                return;
            }
            setHoverProgress(Math.min(1, Math.max(0, pointerX / rect.width)));
        },
        [durationSec, interactive, isTape],
    );

    const onHoverLeave = useCallback(() => {
        if (isPlayheadDraggingRef.current) {
            return;
        }
        setHoverProgress(null);
        setIsRangeHovered(false);
    }, []);

    const handleRangeDragChange = useCallback(
        (isDragging: boolean) => {
            isRangeDraggingRef.current = isDragging;
            setIsRangeDragging(isDragging);
            suppressTapToPlayPause();
            cancelJump();
            if (isDragging) {
                setHoverProgress(null);
            } else {
                rangeDragPointerXRef.current = null;
                skipNextSeekRef.current = true;
                window.setTimeout(() => {
                    skipNextSeekRef.current = false;
                }, 0);
                setPreviewRange(null);
            }
            onRangeDragChange?.(isDragging);
        },
        [cancelJump, onRangeDragChange, suppressTapToPlayPause],
    );

    useEffect(() => {
        if (!isTape || !isRangeDragging) {
            return undefined;
        }
        let frameId = 0;
        let previousFrameMs = 0;
        let hasPreviousFrame = false;
        let pendingScrollPx = 0;
        const getPointerInTrack = (): { width: number; x: number } | null => {
            const track = trackRef.current;
            const pointerClientX = rangeDragPointerXRef.current;
            if (!track || pointerClientX == null || !Number.isFinite(pointerClientX)) {
                return null;
            }
            const rect = track.getBoundingClientRect();
            return { width: rect.width, x: pointerClientX - rect.left };
        };
        const scrollWhileHandleAtEdge = (frameMs: number): void => {
            const rawElapsedSec = hasPreviousFrame ? Math.max(0, (frameMs - previousFrameMs) / 1000) : 0;
            const elapsedSec = Math.min(rawElapsedSec, WAVEFORM_RANGE_EDGE_SCROLL_MAX_FRAME_SEC);
            hasPreviousFrame = true;
            previousFrameMs = frameMs;
            const pointer = getPointerInTrack();
            const currentViewport = viewportRef.current;
            const scrollDeltaPx = pointer
                ? getRangeEdgeScrollDeltaPx({
                      elapsedSec,
                      pixelsPerSecond: currentViewport.pixelsPerSecond,
                      pointerX: pointer.x,
                      widthPx: pointer.width,
                  })
                : null;
            if (scrollDeltaPx == null) {
                pendingScrollPx = 0;
            } else {
                pendingScrollPx += scrollDeltaPx;
                const nextScroll = Math.min(
                    maxScrollLeft(currentViewport),
                    Math.max(0, currentViewport.scrollLeftPx + pendingScrollPx),
                );
                const scrolledPx = nextScroll - currentViewport.scrollLeftPx;
                pendingScrollPx = scrolledPx === 0 ? 0 : pendingScrollPx - scrolledPx;
                if (scrolledPx !== 0) {
                    applyScrollLeft(nextScroll, true);
                    const nextViewport = viewportRef.current;
                    onSeekRef.current?.(timeFromPositionPx(nextViewport.widthPx / 2, nextViewport));
                }
            }
            frameId = window.requestAnimationFrame(scrollWhileHandleAtEdge);
        };
        frameId = window.requestAnimationFrame(scrollWhileHandleAtEdge);
        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [applyScrollLeft, isRangeDragging, isTape]);

    const getPlayheadSec = useCallback(() => {
        return mediaElRef.current ? mediaElRef.current.currentTime : currentTimeRef.current;
    }, []);

    useEffect(() => {
        return () => {
            removeCreateDragListenersRef.current?.();
            removeTapeContextMenuRef.current?.();
            if (createDragRef.current?.active) {
                createDragRef.current = null;
                onRangeDragChangeRef.current?.(false);
            }
            isPlayheadDraggingRef.current = false;
            playheadDragRef.current = null;
            playheadPinRef.current = null;
        };
    }, []);

    useLayoutEffect(() => {
        if (isRangeDraggingRef.current) {
            return;
        }
        setCreateRange(current => (current == null ? current : null));
    }, [range]);

    const startRangeCreateDrag = useCallback(
        (drag: RangeCreateDrag, capture: boolean) => {
            createDragRef.current = drag;
            rangeDragPointerXRef.current = drag.originX;
            const track = trackRef.current;
            if (capture && track && typeof track.setPointerCapture === 'function') {
                try {
                    track.setPointerCapture(drag.pointerId);
                } catch (error) {
                    const lostPointer =
                        error instanceof DOMException &&
                        (error.name === 'NotFoundError' || error.name === 'InvalidStateError');
                    if (!lostPointer) {
                        console.warn('Pointer capture failed', error); // eslint-disable-line no-console
                    }
                }
            }

            const onMove = (moveEvent: PointerEvent): void => {
                if (createDragRef.current !== drag || moveEvent.pointerId !== drag.pointerId) {
                    return;
                }
                if (!Number.isFinite(moveEvent.clientX)) {
                    return;
                }
                // Capture runs before WaveSurfer's document drag, which stops the event after a few pixels.
                if (capture) {
                    moveEvent.preventDefault();
                    moveEvent.stopPropagation();
                }
                rangeDragPointerXRef.current = moveEvent.clientX;
                if (!drag.active && Math.abs(moveEvent.clientX - drag.originX) < WAVEFORM_RANGE_CREATE_DRAG_PX) {
                    return;
                }
                const moveTrack = trackRef.current;
                if (!moveTrack) {
                    return;
                }
                if (!capture) {
                    moveEvent.preventDefault();
                }
                const playheadSec = mediaElRef.current ? mediaElRef.current.currentTime : currentTimeRef.current;
                drag.range = drawnRangeFromMove(
                    drag,
                    moveEvent.clientX,
                    moveTrack,
                    viewportRef.current,
                    playheadSec,
                    durationSecRef.current,
                );
                if (!drag.active) {
                    drag.active = true;
                    onResinActionRef.current?.('waveformRangeCreate');
                    handleRangeDragChange(true);
                }
                setCreateRange(drag.range);
                setPreviewRange(drag.range);
            };
            let onUp: (upEvent: PointerEvent) => void = () => undefined;
            const removeListeners = (): void => {
                window.removeEventListener('pointermove', onMove, capture);
                window.removeEventListener('pointerup', onUp, capture);
                window.removeEventListener('pointercancel', onUp, capture);
                const captured = trackRef.current;
                if (
                    capture &&
                    captured &&
                    typeof captured.hasPointerCapture === 'function' &&
                    captured.hasPointerCapture(drag.pointerId)
                ) {
                    captured.releasePointerCapture(drag.pointerId);
                }
                if (removeCreateDragListenersRef.current === removeListeners) {
                    removeCreateDragListenersRef.current = null;
                }
            };
            onUp = (upEvent: PointerEvent): void => {
                if (createDragRef.current !== drag || (upEvent.pointerId && upEvent.pointerId !== drag.pointerId)) {
                    return;
                }
                const wasActive = drag.active;
                const drawn = drag.range;
                createDragRef.current = null;
                removeListeners();
                if (!wasActive || !drawn) {
                    // This pointerup still reaches the tape track. Swallow it so a still hold does not play.
                    suppressTapToPlayPause();
                    return;
                }
                const committed = commitRangeChange(drawn);
                if (committed) {
                    setCreateRange(committed);
                    onRangeChangeRef.current?.(committed);
                }
                handleRangeDragChange(false);
            };
            removeCreateDragListenersRef.current = removeListeners;
            window.addEventListener('pointermove', onMove, capture);
            window.addEventListener('pointerup', onUp, capture);
            window.addEventListener('pointercancel', onUp, capture);
        },
        [handleRangeDragChange, suppressTapToPlayPause],
    );

    const onTrackPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (
                !interactiveRef.current ||
                event.button > 0 ||
                event.ctrlKey ||
                event.metaKey ||
                isRangeDraggingRef.current ||
                createDragRef.current
            ) {
                return;
            }
            const { target } = event;
            if (
                target instanceof Element &&
                target.closest(
                    '.bp-WaveformRange-handle, .bp-WaveformRange-comment, .bp-WaveformView-playhead--draggable',
                )
            ) {
                return;
            }
            const drag = rangeCreateDragFromEvent(event, {
                durationSec: durationSecRef.current,
                range: rangeRef.current,
                track: trackRef.current,
                viewport: viewportRef.current,
            });
            if (!drag) {
                return;
            }
            if (cameraModeRef.current !== 'tape') {
                startRangeCreateDrag(drag, false);
                return;
            }

            const suppressContextMenu = (menuEvent: Event): void => {
                menuEvent.preventDefault();
            };
            let endPointer: (endEvent: PointerEvent) => void = () => undefined;
            const removeContextMenu = (): void => {
                window.removeEventListener('contextmenu', suppressContextMenu, true);
                window.removeEventListener('pointerup', endPointer, true);
                window.removeEventListener('pointercancel', endPointer, true);
                if (removeTapeContextMenuRef.current === removeContextMenu) {
                    removeTapeContextMenuRef.current = null;
                }
            };
            endPointer = (endEvent: PointerEvent): void => {
                if (endEvent.pointerId !== drag.pointerId) {
                    return;
                }
                removeContextMenu();
            };
            removeTapeContextMenuRef.current = removeContextMenu;
            window.addEventListener('contextmenu', suppressContextMenu, true);
            window.addEventListener('pointerup', endPointer, true);
            window.addEventListener('pointercancel', endPointer, true);

            const originY = event.clientY;
            let holdPending = true;
            let longPressTimer = 0;
            let onHoldMove: (moveEvent: PointerEvent) => void = () => undefined;
            let onHoldEnd: (upEvent: PointerEvent) => void = () => undefined;
            const cancelHold = (): void => {
                if (!holdPending) {
                    return;
                }
                holdPending = false;
                tapeRangeHoldRef.current = false;
                window.clearTimeout(longPressTimer);
                window.removeEventListener('pointermove', onHoldMove, true);
                window.removeEventListener('pointerup', onHoldEnd, true);
                window.removeEventListener('pointercancel', onHoldEnd, true);
                if (removeCreateDragListenersRef.current === cancelHold) {
                    removeCreateDragListenersRef.current = null;
                }
            };
            onHoldMove = (moveEvent: PointerEvent): void => {
                if (!holdPending || moveEvent.pointerId !== drag.pointerId) {
                    return;
                }
                const moved = Math.hypot(moveEvent.clientX - drag.originX, moveEvent.clientY - originY);
                if (moved >= WAVEFORM_TAPE_RANGE_LONG_PRESS_CANCEL_PX) {
                    cancelHold();
                    return;
                }
                // A smaller drift must not scroll the tape. The move that cancels the hold stays a swipe.
                moveEvent.preventDefault();
                moveEvent.stopPropagation();
            };
            onHoldEnd = (upEvent: PointerEvent): void => {
                if (upEvent.pointerId !== drag.pointerId) {
                    return;
                }
                cancelHold();
            };
            tapeRangeHoldRef.current = true;
            longPressTimer = window.setTimeout(() => {
                if (!holdPending) {
                    return;
                }
                cancelHold();
                suppressTapToPlayPause();
                startRangeCreateDrag(drag, true);
            }, WAVEFORM_TAPE_RANGE_LONG_PRESS_MS);
            removeCreateDragListenersRef.current = cancelHold;
            window.addEventListener('pointermove', onHoldMove, true);
            window.addEventListener('pointerup', onHoldEnd, true);
            window.addEventListener('pointercancel', onHoldEnd, true);
        },
        [suppressTapToPlayPause, startRangeCreateDrag],
    );

    const bindOverlayPortalHost = useCallback((node: HTMLDivElement | null) => {
        const host = node?.parentElement ?? null;
        setOverlayPortalHost(prev => (prev === host ? prev : host));
    }, []);

    const hoverLeft =
        isRangeDragging || hoverProgress == null
            ? null
            : timeLeftPercent(hoverProgress * durationSec, durationSec, viewportRef.current);

    const overlayRange = createRange ?? range;
    const isOverlayReadOnly = rangeReadOnly && createRange == null;
    const showPlayheadComment =
        interactive && !isPlaying && !isRangeDragging && isRangeCollapsed(overlayRange) && Boolean(onPlayheadComment);
    const showRangeOverlay =
        Boolean(overlayRange) && (isRangeDragging || !isPlaying || !isRangeCollapsed(overlayRange));
    const canDragPlayhead = interactive && !isTape;

    /** Media time under a pointer X on the waveform track. */
    const mediaTimeFromClientX = (clientX: number): number | null => {
        const track = trackRef.current;
        if (!track || !(durationSecRef.current > 0) || !Number.isFinite(clientX)) {
            return null;
        }
        const rect = track.getBoundingClientRect();
        if (!(rect.width > 0)) {
            return null;
        }
        const pointerX = clientX - rect.left;
        const currentViewport = viewportRef.current;
        const unclampedTimeSec =
            currentViewport.pixelsPerSecond > 0
                ? timeFromPositionPx(pointerX, currentViewport)
                : (pointerX / rect.width) * durationSecRef.current;
        return Number.isFinite(unclampedTimeSec)
            ? Math.min(durationSecRef.current, Math.max(0, unclampedTimeSec))
            : null;
    };

    /** CSS playhead + hover fills at timeSec; media seek waits for pointerup. */
    const showDraggedPlayhead = (timeSec: number): void => {
        const playhead = playheadRef.current;
        if (!playhead) {
            return;
        }
        const drag = playheadDragRef.current;
        playheadPinRef.current = { fromSec: drag?.fromSec ?? timeSec, sec: timeSec };
        playhead.style.left = timeLeftPercent(timeSec, durationSecRef.current, viewportRef.current);
        setHoverProgress(timeSec / durationSecRef.current);
    };

    const onPlayheadPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
        if (event.target instanceof Element && event.target.closest('.bp-WaveformView-playheadComment')) {
            return;
        }
        if (!canDragPlayhead || event.button > 0 || event.ctrlKey || event.metaKey || isRangeDraggingRef.current) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            return; // Don't start a drag we cannot track after the pointer leaves.
        }
        onResinActionRef.current?.('waveformPlayheadDrag');
        const fromSec = mediaElRef.current ? mediaElRef.current.currentTime : currentTimeRef.current;
        playheadDragRef.current = { fromSec, pointerId: event.pointerId };
        playheadPinRef.current = { fromSec, sec: fromSec };
        isPlayheadDraggingRef.current = true;
        setIsPlayheadDragging(true);
        setHoverProgress(durationSecRef.current > 0 ? fromSec / durationSecRef.current : null);
        clearFollowPin();
        cancelJump();
    };

    const onPlayheadPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
        const drag = playheadDragRef.current;
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const timeSec = mediaTimeFromClientX(event.clientX);
        if (timeSec == null) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        showDraggedPlayhead(timeSec);
    };

    const onPlayheadPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
        const drag = playheadDragRef.current;
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const timeSec = mediaTimeFromClientX(event.clientX) ?? playheadPinRef.current?.sec;
        if (timeSec != null) {
            playheadPinRef.current = { fromSec: drag.fromSec, sec: timeSec };
            currentTimeRef.current = timeSec;
        }
        playheadDragRef.current = null;
        isPlayheadDraggingRef.current = false;
        setIsPlayheadDragging(false);
        if (event.type !== 'lostpointercapture') {
            try {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
            } catch {
                // Capture was never set or already lost.
            }
        }
        if (timeSec == null) {
            return;
        }
        onPlayheadSeek(timeSec);
        updatePlayheadPosition(timeSec);
        onSeekRef.current?.(timeSec);
    };

    const scrubTimeChip =
        isTape && scrubPreviewTimeSec != null ? (
            <div className="bp-WaveformView-hover bp-WaveformView-hover--tape" data-testid="bp-waveform-hover">
                <div className="bp-WaveformView-hoverTime" data-testid="bp-waveform-hover-time">
                    {formatTime(scrubPreviewTimeSec)}
                </div>
            </div>
        ) : null;

    return (
        <div
            ref={bindOverlayPortalHost}
            className={classNames('bp-WaveformView', {
                'bp-WaveformView--inert': !interactive,
                'bp-WaveformView--playheadDragging': isPlayheadDragging,
                'bp-WaveformView--tape': isTape,
                'bp-WaveformView--zoomed': isZoomed,
            })}
            data-testid="bp-waveform-view"
        >
            <div
                ref={trackRef}
                className="bp-WaveformView-track"
                onMouseLeave={interactive && !isTape ? onHoverLeave : undefined}
                onMouseMove={interactive && !isTape ? onHoverMove : undefined}
                onPointerDown={onTrackPointerDown}
                onPointerMove={
                    interactive && !isTape
                        ? event => {
                              if (event.pointerType === 'touch') {
                                  onHoverLeave();
                                  return;
                              }
                              onHoverMove(event);
                          }
                        : undefined
                }
                onPointerUp={
                    isTape
                        ? event => {
                              if (event.button > 0) {
                                  return;
                              }
                              toggleTapePlaybackRef.current?.();
                          }
                        : undefined
                }
            >
                <div ref={containerRef} className="bp-WaveformView-canvas" />
                <div
                    ref={playheadRef}
                    className={classNames('bp-WaveformView-playhead', {
                        'bp-WaveformView-playhead--draggable': canDragPlayhead,
                    })}
                    data-target-id={canDragPlayhead ? 'Waveform-dragPlayhead' : undefined}
                    data-testid="bp-waveform-playhead"
                    onLostPointerCapture={onPlayheadPointerUp}
                    onPointerCancel={onPlayheadPointerUp}
                    onPointerDown={onPlayheadPointerDown}
                    onPointerMove={onPlayheadPointerMove}
                    onPointerUp={onPlayheadPointerUp}
                >
                    {showPlayheadComment && (
                        <button
                            className="bp-WaveformRange-comment bp-WaveformView-playheadComment"
                            data-resin-target="waveformPlayheadComment"
                            data-target-id="Waveform-commentAtTime"
                            data-testid="bp-waveform-playhead-comment"
                            onClick={event => {
                                event.stopPropagation();
                                onPlayheadComment?.();
                            }}
                            onPointerDown={event => event.stopPropagation()}
                            onPointerUp={event => event.stopPropagation()}
                            type="button"
                        >
                            <IconComment24 aria-hidden="true" className="bp-WaveformRange-commentIcon" />
                            {__('media_range_comment')}
                        </button>
                    )}
                </div>
                {showRangeOverlay && overlayRange && (
                    <WaveformRangeSelection
                        ref={rangeLayerRef}
                        currentTimeSec={currentTime}
                        durationSec={durationSec}
                        getPlayheadSec={getPlayheadSec}
                        interactive={interactive && !isOverlayReadOnly}
                        isHighlighted={isRangeDragging || isRangeHovered}
                        isSwiping={isTape && scrubPreviewTimeSec != null}
                        keepHighlight
                        onDragChange={handleRangeDragChange}
                        onDragCreate={
                            interactive && !isRangeDragging && !isOverlayReadOnly ? onRangeDragCreate : undefined
                        }
                        onDragPointerX={clientX => {
                            rangeDragPointerXRef.current = clientX;
                        }}
                        onResinAction={onResinAction}
                        onPreviewChange={setPreviewRange}
                        onRangeChange={interactive && !isOverlayReadOnly ? onRangeChange : undefined}
                        onRangeClear={isTape && !isRangeDragging ? onRangeClear : undefined}
                        range={overlayRange}
                        readOnly={isOverlayReadOnly}
                        viewport={viewport}
                    />
                )}
                {hoverLeft != null && hoverProgress != null && !isRangeDragging && (
                    <div className="bp-WaveformView-hover" data-testid="bp-waveform-hover" style={{ left: hoverLeft }}>
                        <div className="bp-WaveformView-hoverTime" data-testid="bp-waveform-hover-time">
                            {formatTime(hoverProgress * durationSec)}
                        </div>
                    </div>
                )}
            </div>
            {scrubTimeChip && overlayPortalHost ? createPortal(scrubTimeChip, overlayPortalHost) : null}
        </div>
    );
}

export default React.memo(WaveformView);
