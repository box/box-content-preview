export const PLACEHOLDER_PEAK_AMPLITUDE = 0;
export const PLACEHOLDER_PEAK_COUNT = 2000;
/** Stand-in timeline length (seconds) until media metadata supplies real duration. */
export const PLACEHOLDER_DURATION_SEC = 1;
/** How long one peak takes to morph from placeholder to decoded. */
export const WAVEFORM_PEAK_MORPH_MS = 400;
/** How long it takes for the morph start to sweep from the first peak to the last. */
export const WAVEFORM_PEAK_STAGGER_MS = 200;
/** First peak starts at 0; last peak starts after the stagger and then morphs. */
export const WAVEFORM_PEAK_TRANSITION_MS = WAVEFORM_PEAK_MORPH_MS + WAVEFORM_PEAK_STAGGER_MS;

/**
 * Flat unit peaks used until client decode or Conversion supplies a payload.
 * Visual stand-in only; real duration comes from the media element once known.
 */
export function placeholderPeaks(peakCount: number = PLACEHOLDER_PEAK_COUNT): number[] {
    const count = Math.max(1, peakCount);
    return new Array(count).fill(PLACEHOLDER_PEAK_AMPLITUDE);
}

/** Convert in-viewer unit peaks to wavesurfer channels. Duplicate for a mirrored envelope. */
export function toChannels(peaks: ArrayLike<number>): number[][] {
    const channel = Array.from(peaks);
    return [channel, channel.slice()];
}

/**
 * Hover scrub time: m:ss.cc (or h:mm:ss.cc when over an hour).
 */
export function formatTime(time: number): string {
    const totalCs = Number.isFinite(time) ? Math.max(0, Math.round(time * 100)) : 0;
    const hours = Math.floor(totalCs / 360000);
    const minutes = Math.floor((totalCs % 360000) / 6000);
    const seconds = Math.floor((totalCs % 6000) / 100);
    const centiseconds = totalCs % 100;
    const paddedSeconds = `${seconds < 10 ? '0' : ''}${seconds}.${centiseconds < 10 ? '0' : ''}${centiseconds}`;

    if (hours > 0) {
        const paddedMinutes = minutes < 10 ? `0${minutes}` : String(minutes);
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }

    return `${minutes}:${paddedSeconds}`;
}

function easeOutCubic(t: number): number {
    return 1 - (1 - t) ** 3;
}

/** Resize a peak array to `length` by interpolating between neighboring samples. */
export function resizePeaks(peaks: ArrayLike<number>, length: number): Float32Array {
    const out = new Float32Array(length);
    const sourceLength = peaks.length;
    if (!(length > 0) || !(sourceLength > 0)) {
        return out;
    }
    if (sourceLength === length) {
        for (let index = 0; index < length; index += 1) {
            out[index] = Number(peaks[index]) || 0;
        }
        return out;
    }
    if (length === 1) {
        out[0] = Number(peaks[0]) || 0;
        return out;
    }

    for (let index = 0; index < length; index += 1) {
        const position = (index / (length - 1)) * (sourceLength - 1);
        const left = Math.floor(position);
        const right = Math.min(sourceLength - 1, left + 1);
        const fraction = position - left;
        const from = Number(peaks[left]) || 0;
        const to = Number(peaks[right]) || 0;
        out[index] = from + (to - from) * fraction;
    }

    return out;
}

/**
 * Staggered morph from `from` toward `to` after `elapsedMs`.
 * Each bar eases over WAVEFORM_PEAK_MORPH_MS; start times sweep left-to-right over WAVEFORM_PEAK_STAGGER_MS.
 */
export function morphPeaks(from: ArrayLike<number>, to: ArrayLike<number>, elapsedMs: number): Float32Array {
    const { length } = to;
    const source = resizePeaks(from, length);
    const out = new Float32Array(length);
    const stagger = length > 1 ? WAVEFORM_PEAK_STAGGER_MS : 0;
    const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

    for (let index = 0; index < length; index += 1) {
        const delay = stagger === 0 ? 0 : (index / (length - 1)) * stagger;
        const localT = Math.min(1, Math.max(0, (elapsed - delay) / WAVEFORM_PEAK_MORPH_MS));
        const dest = Number(to[index]) || 0;
        out[index] = source[index] + (dest - source[index]) * easeOutCubic(localT);
    }

    return out;
}
