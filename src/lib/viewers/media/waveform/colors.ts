/**
 * Figma Audio Player waveform tokens as opaque fills.
 * Wavesurfer paints progress with canvas `source-in`, which multiplies alpha against
 * the unplayed bars — rgba whites would make the played region darker, not brighter.
 */

import { GradientStop, WaveformFills } from './types';

function whiteOnBlack(alpha: number): string {
    const channel = Math.round(255 * alpha);
    return `rgb(${channel}, ${channel}, ${channel})`;
}

export const WAVEFORM_COLOR_PLAYED = whiteOnBlack(0.6);
export const WAVEFORM_COLOR_UNPLAYED = whiteOnBlack(0.3);
export const WAVEFORM_COLOR_BUFFER = whiteOnBlack(0.16);
export const WAVEFORM_COLOR_HOVER_PLAYED = whiteOnBlack(0.9);
export const WAVEFORM_COLOR_HOVER_AREA = whiteOnBlack(0.6);
export const WAVEFORM_COLOR_HOVER_UNPLAYED = whiteOnBlack(0.3);
export const WAVEFORM_COLOR_HOVER_BUFFER = whiteOnBlack(0.16);

type ColorRange = {
    color: string;
    end: number;
    start: number;
};

/** Pin a value to the closed interval [0, 1]. */
function clampTo0And1(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
        return 0;
    }
    if (value > 1) {
        return 1;
    }
    return value;
}

function solidColorIfUniform(stops: GradientStop[]): string | null {
    if (!stops.length) {
        return null;
    }
    const { color } = stops[0];
    return stops.every(stop => stop.color === color) ? color : null;
}

/**
 * Turn colored 0–1 ranges into canvas gradient stops.
 * Each range becomes a pair of stops at start and end so the color is flat (no blend).
 * If every stop is the same color, return that solid string instead.
 */
function gradientStopsFromColorRanges(ranges: ColorRange[]): string | GradientStop[] {
    const stops: GradientStop[] = [];

    ranges.forEach(range => {
        const start = clampTo0And1(range.start);
        const end = clampTo0And1(range.end);
        if (end <= start) {
            return;
        }
        stops.push({ color: range.color, offset: start });
        stops.push({ color: range.color, offset: end });
    });

    const color = solidColorIfUniform(stops);
    if (color) {
        return color;
    }
    if (!stops.length) {
        return WAVEFORM_COLOR_UNPLAYED;
    }
    return stops;
}

/** Last buffered edge as a 0–1 fraction of duration. Missing range is treated as fully loaded. */
export function getBufferedProgress(bufferedRange: TimeRanges | undefined, durationSec: number): number {
    if (!bufferedRange || !bufferedRange.length || !(durationSec > 0)) {
        return 1;
    }

    return clampTo0And1(bufferedRange.end(bufferedRange.length - 1) / durationSec);
}

/**
 * progressColor paints left of the playhead (clipped by wavesurfer).
 * waveColor paints right of the playhead, including buffered vs not-yet-buffered.
 */
export function getWaveformFills({
    bufferProgress,
    hoverProgress,
}: {
    bufferProgress: number;
    hoverProgress: number | null;
}): WaveformFills {
    const buffer = clampTo0And1(bufferProgress);

    if (hoverProgress == null) {
        return {
            progressColor: WAVEFORM_COLOR_PLAYED,
            waveColor: gradientStopsFromColorRanges([
                { color: WAVEFORM_COLOR_UNPLAYED, end: buffer, start: 0 },
                { color: WAVEFORM_COLOR_BUFFER, end: 1, start: buffer },
            ]),
        };
    }

    const hover = clampTo0And1(hoverProgress);

    return {
        progressColor: gradientStopsFromColorRanges([
            { color: WAVEFORM_COLOR_HOVER_PLAYED, end: hover, start: 0 },
            { color: WAVEFORM_COLOR_HOVER_AREA, end: 1, start: hover },
        ]),
        waveColor: gradientStopsFromColorRanges([
            { color: WAVEFORM_COLOR_HOVER_AREA, end: hover, start: 0 },
            { color: WAVEFORM_COLOR_HOVER_UNPLAYED, end: buffer, start: hover },
            { color: WAVEFORM_COLOR_HOVER_BUFFER, end: 1, start: Math.max(hover, buffer) },
        ]),
    };
}

/** Solid string, or a canvas linear gradient from stops, sized to the waveform width. */
export function toCanvasFill(color: string | GradientStop[], widthPx: number): string | CanvasGradient {
    if (typeof color === 'string') {
        return color;
    }
    if (!(widthPx > 0) || typeof document === 'undefined') {
        return color[0] ? color[0].color : WAVEFORM_COLOR_UNPLAYED;
    }

    const context = document.createElement('canvas').getContext('2d');
    if (!context || !context.createLinearGradient) {
        return color[0] ? color[0].color : WAVEFORM_COLOR_UNPLAYED;
    }

    const gradient = context.createLinearGradient(0, 0, widthPx, 0);
    let lastOffset = -1;
    color.forEach(stop => {
        let offset = clampTo0And1(stop.offset);
        if (offset <= lastOffset) {
            offset = Math.min(1, lastOffset + 1e-6);
        }
        lastOffset = offset;
        gradient.addColorStop(offset, stop.color);
    });

    return gradient;
}

/** Untinted bar pixels for each WaveSurfer tile, so hover can re-tint without stacking. */
const tileBarSnapshots = new WeakMap<HTMLCanvasElement, ImageData>();

/** Restore the last bar snapshot, or take a new one after WaveSurfer redraws. */
function restoreOrSnapshotTile(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    replaceSnapshot: boolean,
): void {
    if (!(canvas.width > 0) || !(canvas.height > 0) || !context.getImageData) {
        return;
    }

    const stored = tileBarSnapshots.get(canvas);
    if (!replaceSnapshot && stored && context.putImageData) {
        context.putImageData(stored, 0, 0);
        return;
    }

    try {
        tileBarSnapshots.set(canvas, context.getImageData(0, 0, canvas.width, canvas.height));
    } catch {
        // Tainted or zero-size canvases cannot snapshot; tint in place.
    }
}

/** CSS width of a tile canvas (style.width, then clientWidth, then bitmap width). */
function tileWidthCss(canvas: HTMLCanvasElement): number {
    const styled = parseFloat(canvas.style.width);
    if (styled > 0) {
        return styled;
    }
    if (canvas.clientWidth > 0) {
        return canvas.clientWidth;
    }
    return canvas.width;
}

/** Solid color, or a gradient aligned to the full waveform and shifted to this tile. */
export function fillForTile(
    context: CanvasRenderingContext2D,
    color: string | GradientStop[],
    totalWidthCss: number,
    offsetCss: number,
    canvas: HTMLCanvasElement,
): string | CanvasGradient {
    if (typeof color === 'string') {
        return color;
    }
    const cssWidth = tileWidthCss(canvas);
    const scale = cssWidth > 0 ? canvas.width / cssWidth : 1;
    if (!(totalWidthCss > 0) || !(scale > 0)) {
        return color[0] ? color[0].color : WAVEFORM_COLOR_UNPLAYED;
    }

    const x0 = -offsetCss * scale || 0;
    const x1 = (totalWidthCss - offsetCss) * scale;
    const gradient = context.createLinearGradient(x0, 0, x1, 0);
    let lastOffset = -1;
    color.forEach(stop => {
        let offset = clampTo0And1(stop.offset);
        if (offset <= lastOffset) {
            offset = Math.min(1, lastOffset + 1e-6);
        }
        lastOffset = offset;
        gradient.addColorStop(offset, stop.color);
    });
    return gradient;
}

/**
 * Wavesurfer splits a zoomed waveform into viewport-sized tiles and paints each
 * from x=0. Re-tint with a gradient in global waveform space so hover/buffer
 * colors do not repeat on the last tile.
 */
export function tintWaveformTiles({
    fills,
    host,
    replaceSnapshot = false,
    totalWidthCss,
}: {
    fills: WaveformFills;
    host: HTMLElement;
    replaceSnapshot?: boolean;
    totalWidthCss: number;
}): void {
    if (!(totalWidthCss > 0) || !host.querySelectorAll) {
        return;
    }

    const groups: Array<{ canvases: NodeListOf<HTMLCanvasElement>; color: string | GradientStop[] }> = [
        { canvases: host.querySelectorAll('.canvases canvas'), color: fills.waveColor },
        { canvases: host.querySelectorAll('.progress canvas'), color: fills.progressColor },
    ];

    groups.forEach(({ canvases, color }) => {
        canvases.forEach(canvas => {
            const context = canvas.getContext('2d');
            if (!context) {
                return;
            }
            restoreOrSnapshotTile(canvas, context, replaceSnapshot);
            const offsetCss = parseFloat(canvas.style.left) || 0;
            context.save();
            context.globalCompositeOperation = 'source-in';
            context.fillStyle = fillForTile(context, color, totalWidthCss, offsetCss, canvas);
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.restore();
        });
    });
}
