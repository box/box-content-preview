/**
 * Portable peak extraction + canvas waveform drawing.
 * Seed for a future MP3Viewer WaveformScrubber (no WaveSurfer).
 */

export const DEFAULT_BAR_COUNT = 240;

/**
 * Downsample PCM magnitudes into normalized amplitude peaks (0..1).
 * A sample range can be given so zoomed views resolve real detail instead of
 * stretching the full-track peaks.
 *
 * @param {Float32Array} channelData
 * @param {number} barCount
 * @param {{ startSample?: number, endSample?: number, referenceMax?: number }} [options]
 * @returns {number[]}
 */
export function computePeaks(channelData, barCount = DEFAULT_BAR_COUNT, options = {}) {
    if (!channelData || channelData.length === 0 || barCount <= 0) {
        return [];
    }

    const rangeStart = Math.max(0, Math.floor(options.startSample ?? 0));
    const rangeEnd = Math.min(channelData.length, Math.ceil(options.endSample ?? channelData.length));

    if (rangeEnd <= rangeStart) {
        return [];
    }

    const peaks = new Array(barCount);
    const samplesPerBar = (rangeEnd - rangeStart) / barCount;
    let maxPeak = 0;

    for (let i = 0; i < barCount; i += 1) {
        const start = rangeStart + Math.floor(i * samplesPerBar);
        const end = Math.min(rangeStart + Math.floor((i + 1) * samplesPerBar), rangeEnd);
        let peak = 0;

        // Sub-sample ranges can round to zero width when zoomed far in.
        for (let j = start; j < Math.max(end, start + 1); j += 1) {
            const abs = Math.abs(channelData[j]);
            if (abs > peak) {
                peak = abs;
            }
        }

        peaks[i] = peak;
        if (peak > maxPeak) {
            maxPeak = peak;
        }
    }

    // Normalizing against the whole track keeps quiet passages looking quiet while zoomed.
    const reference = options.referenceMax || maxPeak;

    if (reference > 0) {
        for (let i = 0; i < barCount; i += 1) {
            peaks[i] = Math.min(1, peaks[i] / reference);
        }
    }

    return peaks;
}

/**
 * Collapse all channels to per-sample magnitudes so stereo peaks stay visible.
 * @param {AudioBuffer} audioBuffer
 * @returns {Float32Array}
 */
export function mergeChannelMagnitudes(audioBuffer) {
    const { length, numberOfChannels } = audioBuffer;
    const merged = new Float32Array(length);

    for (let ch = 0; ch < numberOfChannels; ch += 1) {
        const data = audioBuffer.getChannelData(ch);
        for (let i = 0; i < length; i += 1) {
            const abs = Math.abs(data[i]);
            if (abs > merged[i]) {
                merged[i] = abs;
            }
        }
    }

    return merged;
}

/**
 * @param {Float32Array} magnitudes
 * @returns {number}
 */
export function maxMagnitude(magnitudes) {
    let max = 0;
    for (let i = 0; i < magnitudes.length; i += 1) {
        if (magnitudes[i] > max) {
            max = magnitudes[i];
        }
    }
    return max;
}

/**
 * @param {AudioBuffer} audioBuffer
 * @returns {{ magnitudes: Float32Array, referenceMax: number, duration: number, sampleRate: number }}
 */
export function sourceFromAudioBuffer(audioBuffer) {
    const magnitudes = mergeChannelMagnitudes(audioBuffer);

    return {
        magnitudes,
        referenceMax: maxMagnitude(magnitudes),
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
    };
}

/**
 * Decode an ArrayBuffer with Web Audio and keep magnitudes for zoomed re-sampling.
 * Closes the context afterward; the decoded AudioBuffer is discarded.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ magnitudes: Float32Array, referenceMax: number, duration: number, sampleRate: number }>}
 */
export async function decodeSourceFromArrayBuffer(arrayBuffer) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    try {
        const copy = arrayBuffer.slice(0);
        const audioBuffer = await ctx.decodeAudioData(copy);
        return sourceFromAudioBuffer(audioBuffer);
    } finally {
        await ctx.close();
    }
}

const PLAYED = '#0061d5'; // bdlBoxBlue
const UNPLAYED = '#6f6f6f'; // muted gray on black
const PLAYHEAD = '#fff';

/**
 * Draw static peaks with a played/unplayed split.
 * `progress` is relative to the drawn window, not the whole track.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number[]} peaks
 * @param {number} progress
 * @param {{ showPlayhead?: boolean }} [options]
 */
export function drawWaveform(canvas, peaks, progress = 0, options = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    if (cssWidth === 0 || cssHeight === 0) {
        return;
    }

    const pixelWidth = Math.round(cssWidth * dpr);
    const pixelHeight = Math.round(cssHeight * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (!peaks.length) {
        return;
    }

    const barGap = 1;
    const barWidth = Math.max(1, (cssWidth - barGap * (peaks.length - 1)) / peaks.length);
    const midY = cssHeight / 2;
    const maxBarHeight = cssHeight * 0.9;
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const playedBars = Math.floor(clampedProgress * peaks.length);

    for (let i = 0; i < peaks.length; i += 1) {
        const amplitude = Math.max(0.04, peaks[i]); // floor so quiet sections stay visible
        const h = amplitude * maxBarHeight;
        const x = i * (barWidth + barGap);
        const y = midY - h / 2;

        ctx.fillStyle = i < playedBars ? PLAYED : UNPLAYED;
        ctx.fillRect(x, y, barWidth, h);
    }

    if (options.showPlayhead && progress > 0 && progress < 1) {
        const x = clampedProgress * cssWidth;
        ctx.fillStyle = PLAYHEAD;
        ctx.fillRect(Math.min(cssWidth - 1, Math.max(0, x - 0.5)), 0, 1, cssHeight);
    }
}

/**
 * Wire canvas pointer scrubbing to an HTMLMediaElement.
 * `getWindow` maps canvas x to the visible slice of the track when zoomed.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLMediaElement} mediaEl
 * @param {{ onScrub?: () => void, getWindow?: () => { start: number, end: number } }} [options]
 * @returns {() => void} cleanup
 */
export function attachScrubber(canvas, mediaEl, options = {}) {
    let dragging = false;

    const seekFromEvent = event => {
        const rect = canvas.getBoundingClientRect();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        const duration = mediaEl.duration;
        const { start, end } = options.getWindow ? options.getWindow() : { start: 0, end: 1 };
        const trackRatio = start + ratio * (end - start);

        if (Number.isFinite(duration) && duration > 0) {
            mediaEl.currentTime = Math.min(1, Math.max(0, trackRatio)) * duration;
            if (options.onScrub) {
                options.onScrub();
            }
        }
    };

    const onPointerDown = event => {
        dragging = true;
        canvas.setPointerCapture?.(event.pointerId);
        seekFromEvent(event);
        event.preventDefault();
    };

    const onPointerMove = event => {
        if (!dragging) {
            return;
        }
        seekFromEvent(event);
    };

    const onPointerUp = () => {
        dragging = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('pointerleave', onPointerUp);
    };
}
