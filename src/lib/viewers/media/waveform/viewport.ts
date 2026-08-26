import {
    WAVEFORM_MIN_VIEW_WINDOW_SEC,
    WAVEFORM_ZOOM_MAX,
    WAVEFORM_ZOOM_MIN,
    WAVEFORM_ZOOM_SLIDER_MAX,
} from './constants';
import { WaveformViewport, WaveformViewportInput } from './types';

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
