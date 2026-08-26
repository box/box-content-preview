import {
    WAVEFORM_FOLLOW_INSET_PX,
    WAVEFORM_MIN_VIEW_WINDOW_SEC,
    WAVEFORM_ZOOM_MAX,
    WAVEFORM_ZOOM_MIN,
    WAVEFORM_ZOOM_SLIDER_MAX,
} from './constants';
import { PlayheadCameraAction, WaveformViewport, WaveformViewportInput } from './types';

/** Visible window: start/end times, pixels-per-second, and the current zoom. */
export function createWaveformViewport({
    durationSec,
    heightPx,
    maxZoom,
    scrollLeftPx,
    widthPx,
    zoomLevel,
}: WaveformViewportInput): WaveformViewport {
    const zoom = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : WAVEFORM_ZOOM_MIN;
    const viewDurationSec = durationSec > 0 ? durationSec / zoom : 0; // seconds visible at this zoom
    const pixelsPerSecond = viewDurationSec > 0 && widthPx > 0 ? widthPx / viewDurationSec : 0;
    const maxStartSec = Math.max(0, durationSec - viewDurationSec); // last start that still fills the window
    const startSec = pixelsPerSecond > 0 ? Math.min(maxStartSec, Math.max(0, scrollLeftPx / pixelsPerSecond)) : 0;

    return {
        durationSec,
        endSec: startSec + viewDurationSec,
        heightPx,
        maxZoom,
        pixelsPerSecond,
        scrollLeftPx,
        startSec,
        widthPx,
        zoomLevel: zoom,
    };
}

/** Same viewport with a different scroll, so start/end times update. */
export function getViewportAtScroll(viewport: WaveformViewport, scrollLeftPx: number): WaveformViewport {
    return createWaveformViewport({ ...viewport, scrollLeftPx });
}

/** How many CSS pixels from the left of the visible window this time sits. */
export function positionPxFromTime(timeSec: number, viewport: WaveformViewport): number {
    return (timeSec - viewport.startSec) * viewport.pixelsPerSecond;
}

/** Media time under a point this many CSS pixels from the left of the visible window. */
export function timeFromPositionPx(positionPx: number, viewport: WaveformViewport): number {
    if (!(viewport.pixelsPerSecond > 0)) {
        return viewport.startSec;
    }
    return viewport.startSec + positionPx / viewport.pixelsPerSecond;
}

/** True when this time sits inside the visible window. */
export function isTimeInView(timeSec: number, viewport: WaveformViewport): boolean {
    return timeSec >= viewport.startSec && timeSec <= viewport.endSec;
}

/** UI max zoom: 24×, ~1 peak per CSS pixel, and a minimum visible window. */
export function getWaveformZoomMax({
    durationSec,
    peakCount,
    viewWidthPx,
}: {
    durationSec: number;
    peakCount: number;
    viewWidthPx: number;
}): number {
    if (!(peakCount > 0) || !(viewWidthPx > 0)) {
        return WAVEFORM_ZOOM_MIN;
    }
    const peakLimitedMax = Math.floor(peakCount / viewWidthPx);
    const durationLimitedMax = durationSec > 0 ? durationSec / WAVEFORM_MIN_VIEW_WINDOW_SEC : WAVEFORM_ZOOM_MIN;
    return Math.max(WAVEFORM_ZOOM_MIN, Math.min(WAVEFORM_ZOOM_MAX, peakLimitedMax, durationLimitedMax));
}

/** Keep zoom between 1× and this file's max. */
export function clampWaveformZoom(zoomLevel: number, maxZoom: number = WAVEFORM_ZOOM_MIN): number {
    const max = Math.max(WAVEFORM_ZOOM_MIN, maxZoom);
    if (!Number.isFinite(zoomLevel)) {
        return WAVEFORM_ZOOM_MIN;
    }
    return Math.min(max, Math.max(WAVEFORM_ZOOM_MIN, zoomLevel));
}

/** WaveSurfer zoom density. 0 = fit the whole file in the view. */
export function getZoomedPixelsPerSecond({
    durationSec,
    maxZoom = WAVEFORM_ZOOM_MIN,
    viewWidthPx,
    zoomLevel,
}: {
    durationSec: number;
    maxZoom?: number;
    viewWidthPx: number;
    zoomLevel: number;
}): number {
    const zoom = clampWaveformZoom(zoomLevel, maxZoom);
    if (zoom <= WAVEFORM_ZOOM_MIN || !(durationSec > 0) || !(viewWidthPx > 0)) {
        return 0;
    }
    return (viewWidthPx / durationSec) * zoom;
}

/** Map zoom (1…max) onto the 0–100 slider. */
export function sliderValueFromZoom(zoomLevel: number, maxZoom: number = WAVEFORM_ZOOM_MIN): number {
    const max = Math.max(WAVEFORM_ZOOM_MIN, maxZoom);
    const zoom = clampWaveformZoom(zoomLevel, max);
    if (max <= WAVEFORM_ZOOM_MIN) {
        return 0;
    }
    return ((zoom - WAVEFORM_ZOOM_MIN) / (max - WAVEFORM_ZOOM_MIN)) * WAVEFORM_ZOOM_SLIDER_MAX;
}

/** Inverse of sliderValueFromZoom. */
export function zoomFromSliderValue(value: number, maxZoom: number = WAVEFORM_ZOOM_MIN): number {
    const max = Math.max(WAVEFORM_ZOOM_MIN, maxZoom);
    if (max <= WAVEFORM_ZOOM_MIN) {
        return WAVEFORM_ZOOM_MIN;
    }
    const t = Math.min(WAVEFORM_ZOOM_SLIDER_MAX, Math.max(0, value)) / WAVEFORM_ZOOM_SLIDER_MAX;
    return clampWaveformZoom(WAVEFORM_ZOOM_MIN + t * (max - WAVEFORM_ZOOM_MIN), max);
}

/** Scroll offset that still shows a full window (no overscroll). */
function clampScrollLeft(scrollLeftPx: number, viewport: WaveformViewport): number {
    const maxScroll = Math.max(0, viewport.durationSec * viewport.pixelsPerSecond - viewport.widthPx);
    if (!Number.isFinite(scrollLeftPx)) {
        return 0;
    }
    return Math.min(maxScroll, Math.max(0, scrollLeftPx));
}

/** Follow inset in CSS px, capped at one third of the view so a narrow player still has room. */
export function getFollowInsetPx(widthPx: number, insetPx: number = WAVEFORM_FOLLOW_INSET_PX): number {
    if (!(widthPx > 0)) {
        return 0;
    }
    return Math.min(Math.max(0, insetPx), widthPx / 3);
}

/** CSS left for a playhead pinned to the follow inset. */
export function getPinnedPlayheadLeft(widthPx: number, insetPx: number = WAVEFORM_FOLLOW_INSET_PX): string {
    const inset = getFollowInsetPx(widthPx, insetPx);
    if (!(widthPx > 0)) {
        return '0%';
    }
    return `${((widthPx - inset) / widthPx) * 100}%`;
}

/** CSS left % of the playhead from the left of the visible window. */
export function timeLeftPercent(timeSec: number, durationSec: number, viewport: WaveformViewport): string {
    if (viewport.widthPx > 0 && viewport.pixelsPerSecond > 0) {
        return `${(positionPxFromTime(timeSec, viewport) / viewport.widthPx) * 100}%`;
    }
    const progress = durationSec > 0 ? Math.min(1, Math.max(0, timeSec / durationSec)) : 0;
    return `${progress * 100}%`;
}

/**
 * Walk across the view until the playhead nears the right edge, then follow.
 * Off-screen at play start jumps in; off-screen right while playing keeps following.
 */
export function getPlayheadCameraAction({
    insetPx = WAVEFORM_FOLLOW_INSET_PX,
    isPlaying,
    playJustStarted,
    timeSec,
    viewport,
}: {
    insetPx?: number;
    isPlaying: boolean;
    playJustStarted: boolean;
    timeSec: number;
    viewport: WaveformViewport;
}): PlayheadCameraAction {
    if (
        !isPlaying ||
        viewport.zoomLevel <= WAVEFORM_ZOOM_MIN ||
        !(viewport.widthPx > 0) ||
        !(viewport.pixelsPerSecond > 0)
    ) {
        return { kind: 'none' };
    }

    const inset = getFollowInsetPx(viewport.widthPx, insetPx);
    const viewX = positionPxFromTime(timeSec, viewport);
    const playheadCanvasX = timeSec * viewport.pixelsPerSecond;
    const followX = viewport.widthPx - inset;

    if (viewX < 0) {
        if (!playJustStarted) {
            return { kind: 'none' };
        }
        return { kind: 'jump', scrollLeftPx: clampScrollLeft(playheadCanvasX - inset, viewport) };
    }

    if (viewX >= followX) {
        const unclampedScroll = playheadCanvasX - followX;
        const scrollLeftPx = clampScrollLeft(unclampedScroll, viewport);
        const maxScroll = Math.max(0, viewport.durationSec * viewport.pixelsPerSecond - viewport.widthPx);
        if (playJustStarted && viewX > viewport.widthPx) {
            return { kind: 'jump', scrollLeftPx };
        }
        return {
            kind: 'followRight',
            isPlayheadPinned: unclampedScroll <= maxScroll,
            scrollLeftPx,
        };
    }

    return { kind: 'none' };
}
