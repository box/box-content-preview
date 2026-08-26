import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import {
    getBufferedProgress,
    getWaveformFills,
    tintWaveformTiles,
    toCanvasFill,
    WAVEFORM_COLOR_PLAYED,
    WAVEFORM_COLOR_UNPLAYED,
} from './colors';
import {
    WAVEFORM_BAR_GAP,
    WAVEFORM_BAR_MIN_HEIGHT,
    WAVEFORM_BAR_RADIUS,
    WAVEFORM_BAR_WIDTH,
    WAVEFORM_HEIGHT,
    WAVEFORM_ZOOM_MIN,
} from './constants';
import { formatTime, morphPeaks, toChannels, WAVEFORM_PEAK_TRANSITION_MS } from './peaks';
import { WaveformFills, WaveformViewProps, WaveformViewport } from './types';
import {
    clampWaveformZoom,
    createWaveformViewport,
    getViewportAtScroll,
    getWaveformZoomMax,
    getZoomedPixelsPerSecond,
    positionPxFromTime,
    timeFromPositionPx,
} from './viewport';
import './WaveformView.scss';

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

/** Monotonic clock for peak-morph animations. */
function timestampMs(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
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

/** CSS left % of the playhead from the left of the visible window. */
function timeLeftPercent(timeSec: number, durationSec: number, viewport: WaveformViewport): string {
    if (viewport.widthPx > 0 && viewport.pixelsPerSecond > 0) {
        return `${(positionPxFromTime(timeSec, viewport) / viewport.widthPx) * 100}%`;
    }
    const progress = durationSec > 0 ? Math.min(1, Math.max(0, timeSec / durationSec)) : 0;
    return `${progress * 100}%`;
}

function applyPeaks(wavesurfer: WaveSurfer, peaks: ArrayLike<number>, durationSec: number): void {
    if (!wavesurfer.load) {
        return;
    }
    wavesurfer.load('', toChannels(peaks), durationSec);
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

/**
 * Renders V1 peaks with wavesurfer. Does not fetch audio or attach a media element.
 */
export default function WaveformView({
    bufferedRange,
    currentTime = 0,
    durationSec,
    height = WAVEFORM_HEIGHT,
    interactive = true,
    mediaEl,
    onSeek,
    onViewportChange,
    onZoomChange,
    peaks,
    zoomLevel: zoomLevelProp,
}: WaveformViewProps): JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const playheadRef = useRef<HTMLDivElement>(null);
    const playheadAnimationRef = useRef(0);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const onSeekRef = useRef(onSeek);
    const interactiveRef = useRef(interactive);
    const hasZoomHandlersRef = useRef(false);
    const currentTimeRef = useRef(currentTime);
    const peaksRef = useRef(peaks);
    const displayedPeaksRef = useRef<ArrayLike<number> | null>(null);
    const peakTransitionAnimationRef = useRef(0);
    const durationSecRef = useRef(durationSec);
    const zoomOriginRef = useRef<ZoomOrigin | null>(null);
    const pinchStartRef = useRef<{ distance: number; zoom: number } | null>(null);
    const bufferProgressRef = useRef(0);
    const hoverProgressRef = useRef<number | null>(null);
    const programmaticScrollRef = useRef(false);
    const onViewportChangeRef = useRef(onViewportChange);
    onSeekRef.current = onSeek;
    interactiveRef.current = interactive;
    currentTimeRef.current = currentTime;
    peaksRef.current = peaks;
    durationSecRef.current = durationSec;
    onViewportChangeRef.current = onViewportChange;

    const [internalZoom, setInternalZoom] = useState(WAVEFORM_ZOOM_MIN);
    const [hoverProgress, setHoverProgress] = useState<number | null>(null);
    const [canvasWidthPx, setCanvasWidthPx] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const isControlled = typeof zoomLevelProp === 'number';
    const maxZoom = getWaveformZoomMax({
        durationSec,
        peakCount: peaks.length,
        viewWidthPx: canvasWidthPx,
    });
    hasZoomHandlersRef.current =
        maxZoom > WAVEFORM_ZOOM_MIN && (typeof onZoomChange === 'function' || typeof zoomLevelProp !== 'number');
    const zoomLevel = clampWaveformZoom(isControlled ? zoomLevelProp : internalZoom, maxZoom);
    const zoomRef = useRef(zoomLevel);
    zoomRef.current = zoomLevel;
    const prevZoomRef = useRef<number | null>(null);
    const isZoomed = zoomLevel > WAVEFORM_ZOOM_MIN;
    const bufferProgress = getBufferedProgress(bufferedRange, durationSec);
    bufferProgressRef.current = bufferProgress;
    hoverProgressRef.current = hoverProgress;

    const viewport = useMemo(
        () =>
            createWaveformViewport({
                durationSec,
                heightPx: height,
                maxZoom,
                scrollLeftPx: scrollLeft,
                widthPx: canvasWidthPx,
                zoomLevel,
            }),
        [canvasWidthPx, durationSec, height, maxZoom, scrollLeft, zoomLevel],
    );
    const viewportRef = useRef(viewport);
    viewportRef.current = viewport;

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

    const syncViewport = useCallback(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer) {
            return;
        }
        const scrollLeftPx = getScrollLeft(wavesurfer);
        viewportRef.current = getViewportAtScroll(viewportRef.current, scrollLeftPx);
        onViewportChangeRef.current?.(viewportRef.current);
        setScrollLeft(scrollLeftPx);
    }, []);

    const updatePlayheadPosition = useCallback((timeSec: number): void => {
        const playhead = playheadRef.current;
        if (!playhead) {
            return;
        }

        playhead.style.left = timeLeftPercent(timeSec, durationSecRef.current, viewportRef.current);

        const wavesurfer = wavesurferRef.current;
        if (wavesurfer && wavesurfer.setTime) {
            wavesurfer.setTime(timeSec);
        }
    }, []);

    const applyScrollLeft = useCallback((scrollLeftPx: number, shouldCommitState: boolean): void => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setScroll) {
            return;
        }
        programmaticScrollRef.current = true;
        wavesurfer.setScroll(scrollLeftPx);
        viewportRef.current = getViewportAtScroll(viewportRef.current, getScrollLeft(wavesurfer, scrollLeftPx));
        window.requestAnimationFrame(() => {
            // Keep the flag through delayed `scroll` after a zoom setScroll.
            programmaticScrollRef.current = false;
        });
        if (shouldCommitState) {
            onViewportChangeRef.current?.(viewportRef.current);
            setScrollLeft(getScrollLeft(wavesurfer, scrollLeftPx));
        }
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
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
            height,
            hideScrollbar: true,
            interact: interactiveRef.current,
            normalize: false,
            peaks: toChannels(peaksRef.current),
            progressColor: WAVEFORM_COLOR_PLAYED,
            waveColor: WAVEFORM_COLOR_UNPLAYED,
        });

        const unsubscribeClick = wavesurfer.on('click', (relativeX: number) => {
            if (!interactiveRef.current) {
                return;
            }
            onSeekRef.current?.(relativeX * durationSecRef.current);
        });
        const unsubscribeScroll = wavesurfer.on('scroll', () => {
            if (programmaticScrollRef.current) {
                viewportRef.current = getViewportAtScroll(viewportRef.current, getScrollLeft(wavesurfer));
                return;
            }
            syncViewport();
        });
        const unsubscribeZoom = wavesurfer.on('zoom', () => {
            syncViewport();
        });
        const unsubscribeRedraw = wavesurfer.on('redrawcomplete', () => {
            if (!(zoomRef.current > WAVEFORM_ZOOM_MIN)) {
                return;
            }
            tintZoomedWaveform(
                wavesurfer,
                getWaveformFills({
                    bufferProgress: bufferProgressRef.current,
                    hoverProgress: hoverProgressRef.current,
                }),
                true,
            );
        });

        wavesurferRef.current = wavesurfer;
        displayedPeaksRef.current = peaksRef.current;
        syncViewport();

        return () => {
            window.cancelAnimationFrame(peakTransitionAnimationRef.current);
            unsubscribeClick();
            unsubscribeScroll();
            unsubscribeZoom();
            unsubscribeRedraw();
            wavesurfer.destroy();
            wavesurferRef.current = null;
            displayedPeaksRef.current = null;
        };
    }, [height, syncViewport]);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) {
            return undefined;
        }

        setCanvasWidthPx(el.clientWidth);

        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                setCanvasWidthPx(entry.contentRect.width);
            });
            syncViewport();
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
        onZoomChange?.(clamped);
    }, [internalZoom, isControlled, maxZoom, onZoomChange, zoomLevelProp]);

    useEffect(() => {
        onViewportChange?.(viewport);
    }, [onViewportChange, viewport]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        if (!wavesurfer || !wavesurfer.setOptions) {
            return;
        }
        wavesurfer.setOptions({ interact: interactive });
    }, [interactive]);

    useEffect(() => {
        const wavesurfer = wavesurferRef.current;
        const container = containerRef.current;
        if (!wavesurfer || !wavesurfer.setOptions || !container) {
            return;
        }

        const viewWidthPx = wavesurfer.getWidth ? wavesurfer.getWidth() : container.clientWidth;
        const minPxPerSec = getZoomedPixelsPerSecond({ durationSec, maxZoom, viewWidthPx, zoomLevel });
        wavesurfer.setOptions({
            autoScroll: false,
            minPxPerSec,
            ...(zoomLevel > WAVEFORM_ZOOM_MIN
                ? {
                      progressColor: WAVEFORM_COLOR_PLAYED,
                      waveColor: WAVEFORM_COLOR_UNPLAYED,
                  }
                : {}),
        });

        const origin = zoomOriginRef.current;
        zoomOriginRef.current = null;
        const didZoomChange = prevZoomRef.current !== zoomLevel;
        prevZoomRef.current = zoomLevel;
        if (minPxPerSec > 0) {
            if (origin) {
                applyScrollLeft(origin.timeSec * minPxPerSec - origin.pointerX, true);
            } else if (didZoomChange) {
                const maxScroll = Math.max(0, durationSec * minPxPerSec - viewWidthPx);
                applyScrollLeft(
                    Math.min(maxScroll, Math.max(0, currentTimeRef.current * minPxPerSec - viewWidthPx / 2)),
                    true,
                );
            }
        }

        wavesurfer.setTime(currentTimeRef.current);
        syncViewport();
    }, [applyScrollLeft, durationSec, maxZoom, syncViewport, zoomLevel]);

    useLayoutEffect(() => {
        if (mediaEl && !mediaEl.paused) {
            updatePlayheadPosition(mediaEl.currentTime);
            return;
        }
        updatePlayheadPosition(currentTime);
    }, [currentTime, durationSec, mediaEl, updatePlayheadPosition, viewport]);

    useEffect(() => {
        const media = mediaEl;
        if (!media) {
            return undefined;
        }

        const tick = (): void => {
            if (!media.paused) {
                updatePlayheadPosition(media.currentTime);
            }
            playheadAnimationRef.current = window.requestAnimationFrame(tick);
        };

        const startLoop = (): void => {
            window.cancelAnimationFrame(playheadAnimationRef.current);
            playheadAnimationRef.current = window.requestAnimationFrame(tick);
        };

        const stopLoop = (): void => {
            window.cancelAnimationFrame(playheadAnimationRef.current);
            updatePlayheadPosition(media.currentTime);
        };

        const handleSeeked = (): void => {
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
            media.removeEventListener('play', startLoop);
            media.removeEventListener('playing', startLoop);
            media.removeEventListener('pause', stopLoop);
            media.removeEventListener('seeked', handleSeeked);
        };
    }, [mediaEl, updatePlayheadPosition]);

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

        const start = timestampMs();
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

        const fills = getWaveformFills({ bufferProgress, hoverProgress });
        if (isZoomed) {
            tintZoomedWaveform(wavesurfer, fills);
            return;
        }

        wavesurfer.setOptions({
            progressColor: toCanvasFill(fills.progressColor, devicePixelWidth(canvasWidthPx)),
            waveColor: toCanvasFill(fills.waveColor, devicePixelWidth(canvasWidthPx)),
        });
        wavesurfer.setTime(currentTimeRef.current);
    }, [bufferProgress, canvasWidthPx, hoverProgress, isZoomed]);

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
        };

        const onTouchMove = (event: TouchEvent): void => {
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
            zoomOriginRef.current = zoomOriginFromPinch(event.touches);
            setZoomLevel(pinch.zoom * (touchDistance(event.touches) / pinch.distance));
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
            track.removeEventListener('wheel', onZoomWheel);
            track.removeEventListener('touchstart', onTouchStart);
            track.removeEventListener('touchmove', onTouchMove);
            track.removeEventListener('touchend', onTouchEnd);
            track.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [durationSec, setZoomLevel]);

    const onHoverMove = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            if (!interactive) {
                return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            if (!(rect.width > 0) || !(durationSec > 0)) {
                return;
            }
            const pointerX = event.clientX - rect.left;
            if (!Number.isFinite(pointerX)) {
                return;
            }
            const vp = viewportRef.current;
            if (vp.pixelsPerSecond > 0) {
                setHoverProgress(Math.min(1, Math.max(0, timeFromPositionPx(pointerX, vp) / durationSec)));
                return;
            }
            setHoverProgress(Math.min(1, Math.max(0, pointerX / rect.width)));
        },
        [durationSec, interactive],
    );

    const onHoverLeave = useCallback(() => {
        setHoverProgress(null);
    }, []);

    const hoverLeft =
        hoverProgress == null ? null : timeLeftPercent(hoverProgress * durationSec, durationSec, viewportRef.current);

    return (
        <div
            className={`bp-WaveformView${interactive ? '' : ' bp-WaveformView--inert'}${
                isZoomed ? ' bp-WaveformView--zoomed' : ''
            }`}
            data-testid="bp-waveform-view"
        >
            <div
                ref={trackRef}
                className="bp-WaveformView-track"
                onMouseLeave={interactive ? onHoverLeave : undefined}
                onMouseMove={interactive ? onHoverMove : undefined}
            >
                <div ref={containerRef} className="bp-WaveformView-canvas" />
                <div
                    ref={playheadRef}
                    aria-hidden="true"
                    className="bp-WaveformView-playhead"
                    data-testid="bp-waveform-playhead"
                />
                {hoverLeft != null && hoverProgress != null && (
                    <div className="bp-WaveformView-hover" data-testid="bp-waveform-hover" style={{ left: hoverLeft }}>
                        <div className="bp-WaveformView-hoverTime" data-testid="bp-waveform-hover-time">
                            {formatTime(hoverProgress * durationSec)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
