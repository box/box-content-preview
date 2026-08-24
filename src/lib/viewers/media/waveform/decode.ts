import {
    CLIENT_DECODE_MAX_COMPRESSED_BYTES,
    CLIENT_DECODE_MAX_DURATION_SEC,
    CLIENT_DECODE_PEAK_COUNT,
    PEAK_UNIT_MAX,
    PEAK_UNIT_MIN,
    WAVEFORM_PAYLOAD_VERSION,
} from './constants';
import { createCappedWaveformState, WaveformLoadError } from './createWaveformLoader';
import { isWaveformErrorCode, WaveformCaps, WaveformError, WaveformLoadState } from './types';
import { isRetryableWaveformError, validateWaveformPayload } from './validateWaveformPayload';

export type DecodeSkipReason = 'missing_metadata' | 'compressed_size' | 'duration';

export type DecodeDecision = { isAllowed: true } | { isAllowed: false; reason: DecodeSkipReason };

export type MediaInfo = {
    compressedBytes?: number;
    durationSec?: number;
};

export type ClientDecodeOutput = {
    durationSec: number;
    peaks: number[];
    extractMs: number;
};

export type DecodeToPeaksFn = (signal: AbortSignal) => Promise<ClientDecodeOutput>;

export type DecodeTimings = {
    decodeMs: number | null;
    extractMs: number | null;
};

export type ClientDecodeResult = WaveformLoadState & {
    isDecodeSkipped: boolean;
    timings: DecodeTimings;
    reason?: DecodeSkipReason;
    error?: WaveformError;
};

export type ClientDecodeRequest = {
    compressedBytes?: number;
    durationSec?: number;
    fetchArrayBuffer: (signal: AbortSignal) => Promise<ArrayBuffer>;
    signal?: AbortSignal;
};

type DecodeAudioContext = {
    close: () => Promise<void>;
    decodeAudioData: (
        buffer: ArrayBuffer,
        successCallback?: (decoded: AudioBuffer) => void,
        errorCallback?: (error?: unknown) => void,
    ) => Promise<AudioBuffer> | void;
};

const EMPTY_TIMINGS: DecodeTimings = { decodeMs: null, extractMs: null };

function now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function createAbortError(): DOMException {
    return new DOMException('Aborted', 'AbortError');
}

function isPositiveFinite(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function getAudioContextConstructor(): (new () => DecodeAudioContext) | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }
    const { AudioContext, webkitAudioContext } = (window as unknown) as {
        AudioContext?: new () => DecodeAudioContext;
        webkitAudioContext?: new () => DecodeAudioContext;
    };
    return AudioContext || webkitAudioContext;
}

function isAbortError(error: unknown): boolean {
    return (
        (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
    );
}

function getDecodeSkipMessage(reason: DecodeSkipReason): string {
    if (reason === 'compressed_size') {
        return 'Compressed size exceeds client decode limit';
    }
    if (reason === 'duration') {
        return 'Duration exceeds client decode limit';
    }
    return 'Compressed size or duration is missing; skipping client decode';
}

function createSkippedDecodeResult(reason: DecodeSkipReason): ClientDecodeResult {
    if (reason === 'missing_metadata') {
        return {
            status: 'unavailable',
            error: { code: 'UNAVAILABLE', message: getDecodeSkipMessage(reason) },
            isDecodeSkipped: true,
            timings: EMPTY_TIMINGS,
            reason,
        };
    }

    return {
        ...createCappedWaveformState(getDecodeSkipMessage(reason)),
        isDecodeSkipped: true,
        timings: EMPTY_TIMINGS,
        reason,
    };
}

function errorFromUnknown(error: unknown): WaveformError {
    if (error instanceof WaveformLoadError) {
        return { code: error.code, message: error.message };
    }
    if (error instanceof Error && isWaveformErrorCode(error.name)) {
        return { code: error.name, message: error.message };
    }
    const message = error instanceof Error ? error.message : 'Client decode failed';
    return { code: 'DECODE_FAILED', message };
}

function decodeWithContext(
    context: DecodeAudioContext,
    buffer: ArrayBuffer,
    signal?: AbortSignal,
): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        let onAbort: () => void = () => undefined;

        const succeed = (decoded: AudioBuffer) => {
            if (isSettled) {
                return;
            }
            isSettled = true;
            signal?.removeEventListener('abort', onAbort);
            resolve(decoded);
        };

        const fail = (error?: unknown) => {
            if (isSettled) {
                return;
            }
            isSettled = true;
            signal?.removeEventListener('abort', onAbort);
            if (isAbortError(error)) {
                reject(error instanceof DOMException ? error : createAbortError());
                return;
            }
            reject(
                error instanceof WaveformLoadError
                    ? error
                    : new WaveformLoadError('DECODE_FAILED', 'decodeAudioData failed'),
            );
        };

        onAbort = () => fail(createAbortError());

        if (signal?.aborted) {
            fail(createAbortError());
            return;
        }

        signal?.addEventListener('abort', onAbort, { once: true });

        try {
            const maybePromise = context.decodeAudioData(buffer, succeed, fail);
            if (maybePromise && typeof maybePromise.then === 'function') {
                maybePromise.then(succeed, fail);
            }
        } catch (error) {
            fail(error);
        }
    });
}

/**
 * Decide whether to run decodeAudioData. Either cap failing, or unknown size/duration,
 * skips decode so playback is never blocked by expanding the full audio buffer.
 */
export function getDecodeDecision(media: MediaInfo, caps: WaveformCaps = {}): DecodeDecision {
    const maxCompressedBytes = caps.maxCompressedBytes ?? CLIENT_DECODE_MAX_COMPRESSED_BYTES;
    const maxDurationSec = caps.maxDurationSec ?? CLIENT_DECODE_MAX_DURATION_SEC;
    const { compressedBytes, durationSec } = media;

    if (!isPositiveFinite(compressedBytes) || !isPositiveFinite(durationSec)) {
        return { isAllowed: false, reason: 'missing_metadata' };
    }

    if (compressedBytes > maxCompressedBytes) {
        return { isAllowed: false, reason: 'compressed_size' };
    }

    if (durationSec > maxDurationSec) {
        return { isAllowed: false, reason: 'duration' };
    }

    return { isAllowed: true };
}

/**
 * Collapse audio channels to one unsigned peak per time bucket (max abs, then clamp to unit).
 * Accepts an AudioBuffer so callers can extract before closing the AudioContext.
 */
export function extractPeaks(
    audio: AudioBuffer | Float32Array[],
    peakCount: number = CLIENT_DECODE_PEAK_COUNT,
): number[] {
    const channels: ArrayLike<number>[] = Array.isArray(audio)
        ? audio
        : Array.from({ length: audio.numberOfChannels }, (_, channelIndex) => audio.getChannelData(channelIndex));

    if (peakCount <= 0 || channels.length === 0) {
        return [];
    }

    const sampleCount = channels[0].length;
    if (sampleCount === 0) {
        return [];
    }

    const peaks = new Array(peakCount);
    const bucketWidth = sampleCount / peakCount;

    for (let i = 0; i < peakCount; i += 1) {
        const start = Math.floor(i * bucketWidth);
        const end = Math.max(start + 1, Math.floor((i + 1) * bucketWidth));
        let maxAbs = 0;

        for (let sampleIndex = start; sampleIndex < end && sampleIndex < sampleCount; sampleIndex += 1) {
            for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
                const value = Math.abs(channels[channelIndex][sampleIndex]);
                if (value > maxAbs) {
                    maxAbs = value;
                }
            }
        }

        peaks[i] = Math.min(PEAK_UNIT_MAX, Math.max(PEAK_UNIT_MIN, maxAbs));
    }

    return peaks;
}

/**
 * Decode compressed audio and extract unit peaks while the AudioBuffer is live.
 * Does not attach a media element or fetch a URL. Does not copy channel data.
 */
export async function decodeToPeaks(
    arrayBuffer: ArrayBuffer,
    signal?: AbortSignal,
    peakCount: number = CLIENT_DECODE_PEAK_COUNT,
): Promise<ClientDecodeOutput> {
    if (signal?.aborted) {
        throw createAbortError();
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
        throw new WaveformLoadError('DECODE_FAILED', 'AudioContext is not available');
    }

    const context = new AudioContextConstructor();

    try {
        const audioBuffer = await decodeWithContext(context, arrayBuffer.slice(0), signal);
        if (signal?.aborted) {
            throw createAbortError();
        }

        const extractStarted = now();
        const peaks = extractPeaks(audioBuffer, peakCount);
        return {
            durationSec: audioBuffer.duration,
            peaks,
            extractMs: now() - extractStarted,
        };
    } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
            throw createAbortError();
        }
        throw error;
    } finally {
        try {
            await context.close();
        } catch {
            // Context may already be closed.
        }
    }
}

/**
 * Run a client-decode attempt against the V1 waveform contract.
 * Decode is not invoked when size or duration is over the cap (or unknown).
 */
export async function runClientDecode(options: {
    compressedBytes?: number;
    durationSec?: number;
    decode: DecodeToPeaksFn;
    caps?: WaveformCaps;
    signal?: AbortSignal;
}): Promise<ClientDecodeResult> {
    const decision = getDecodeDecision(
        { compressedBytes: options.compressedBytes, durationSec: options.durationSec },
        options.caps,
    );

    if (!decision.isAllowed) {
        return createSkippedDecodeResult(decision.reason);
    }

    if (options.signal?.aborted) {
        return { status: 'cancelled', isDecodeSkipped: true, timings: EMPTY_TIMINGS };
    }

    const signal = options.signal ?? new AbortController().signal;
    const decodeStarted = now();

    let decodeOutput: ClientDecodeOutput;
    try {
        decodeOutput = await options.decode(signal);
    } catch (error) {
        if (signal.aborted || isAbortError(error)) {
            return { status: 'cancelled', isDecodeSkipped: false, timings: EMPTY_TIMINGS };
        }
        const waveformError = errorFromUnknown(error);
        return {
            status: 'failed',
            error: waveformError,
            retryable: isRetryableWaveformError(waveformError.code),
            isDecodeSkipped: false,
            timings: {
                decodeMs: now() - decodeStarted,
                extractMs: null,
            },
        };
    }

    const decodeMs = now() - decodeStarted;

    if (signal.aborted) {
        return {
            status: 'cancelled',
            isDecodeSkipped: false,
            timings: { decodeMs, extractMs: null },
        };
    }

    const validation = validateWaveformPayload(
        {
            version: WAVEFORM_PAYLOAD_VERSION,
            durationSec: options.durationSec ?? decodeOutput.durationSec,
            peaks: decodeOutput.peaks,
        },
        { isPayloadByteCheckSkipped: true },
    );

    if (!validation.ok) {
        return {
            status: 'failed',
            error: validation.error,
            retryable: isRetryableWaveformError(validation.error.code),
            isDecodeSkipped: false,
            timings: { decodeMs, extractMs: decodeOutput.extractMs },
        };
    }

    return {
        status: 'ready',
        payload: validation.payload,
        isDecodeSkipped: false,
        timings: { decodeMs, extractMs: decodeOutput.extractMs },
    };
}

/**
 * Gate, fetch, decode, and extract in-viewer peaks. Skips decode when over cap.
 * Playback must not await this.
 */
export function loadPeaks(request: ClientDecodeRequest): Promise<ClientDecodeResult> {
    return runClientDecode({
        compressedBytes: request.compressedBytes,
        durationSec: request.durationSec,
        signal: request.signal,
        decode: async signal => {
            const arrayBuffer = await request.fetchArrayBuffer(signal);
            return decodeToPeaks(arrayBuffer, signal);
        },
    });
}
