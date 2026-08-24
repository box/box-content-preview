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

export type ExtractedClientDecodeOutput = {
    durationSec: number;
    peaks: number[];
    extractMs: number;
};

export type DeferredClientDecodeOutput = {
    durationSec: number;
    peakSource: AudioBuffer | Float32Array[];
};

export type ClientDecodeOutput = ExtractedClientDecodeOutput | DeferredClientDecodeOutput;

export type DecodeToPeaksFn = (signal: AbortSignal) => Promise<ClientDecodeOutput>;

export type ProbeTimings = {
    decodeMs: number | null;
    extractMs: number | null;
};

export type ProbeResult = WaveformLoadState & {
    isDecodeSkipped: boolean;
    timings: ProbeTimings;
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

function isExtractedClientDecodeOutput(output: ClientDecodeOutput): output is ExtractedClientDecodeOutput {
    return 'peaks' in output;
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

function createSkippedDecodeResult(reason: DecodeSkipReason): ProbeResult {
    const emptyTimings: ProbeTimings = { decodeMs: null, extractMs: null };
    if (reason === 'missing_metadata') {
        return {
            status: 'unavailable',
            error: { code: 'UNAVAILABLE', message: getDecodeSkipMessage(reason) },
            isDecodeSkipped: true,
            timings: emptyTimings,
            reason,
        };
    }

    return {
        ...createCappedWaveformState(getDecodeSkipMessage(reason)),
        isDecodeSkipped: true,
        timings: emptyTimings,
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

function decodeWithContext(context: DecodeAudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
        let isSettled = false;
        const succeed = (decoded: AudioBuffer) => {
            if (!isSettled) {
                isSettled = true;
                resolve(decoded);
            }
        };
        const fail = (error?: unknown) => {
            if (isSettled) {
                return;
            }
            isSettled = true;
            if (isAbortError(error)) {
                reject(error);
                return;
            }
            reject(
                error instanceof WaveformLoadError
                    ? error
                    : new WaveformLoadError('DECODE_FAILED', 'decodeAudioData failed'),
            );
        };

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
 * skips decode so playback is never blocked by PCM expansion.
 */
export function canDecode(media: MediaInfo, caps: WaveformCaps = {}): DecodeDecision {
    const maxCompressedBytes = caps.maxCompressedBytes ?? CLIENT_DECODE_MAX_COMPRESSED_BYTES;
    const maxDurationSec = caps.maxDurationSec ?? CLIENT_DECODE_MAX_DURATION_SEC;
    const { compressedBytes, durationSec } = media;

    if (
        typeof compressedBytes !== 'number' ||
        !Number.isFinite(compressedBytes) ||
        compressedBytes <= 0 ||
        typeof durationSec !== 'number' ||
        !Number.isFinite(durationSec) ||
        durationSec <= 0
    ) {
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
 * Collapse PCM channels to one unsigned peak per time bucket (max abs, then clamp to unit).
 * Accepts an AudioBuffer so callers can extract before closing the AudioContext.
 */
export function extractPeaks(
    peakSource: AudioBuffer | Float32Array[],
    peakCount: number = CLIENT_DECODE_PEAK_COUNT,
): number[] {
    const channels: ArrayLike<number>[] = Array.isArray(peakSource)
        ? peakSource
        : Array.from({ length: peakSource.numberOfChannels }, (_, channelIndex) =>
              peakSource.getChannelData(channelIndex),
          );

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
 * Does not attach a media element or fetch a URL. Does not copy PCM channels.
 */
export async function decodePcm(
    arrayBuffer: ArrayBuffer,
    signal?: AbortSignal,
    peakCount: number = CLIENT_DECODE_PEAK_COUNT,
): Promise<ExtractedClientDecodeOutput> {
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
        throw new WaveformLoadError('DECODE_FAILED', 'AudioContext is not available');
    }

    const context = new AudioContextConstructor();
    let rejectForAbort: ((error: DOMException) => void) | undefined;
    const abortDecode = (): void => {
        context.close().catch(() => {
            // Context may already be closed.
        });
        if (rejectForAbort) {
            rejectForAbort(new DOMException('Aborted', 'AbortError'));
        }
    };

    if (signal) {
        signal.addEventListener('abort', abortDecode, { once: true });
    }

    try {
        const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            rejectForAbort = reject;

            const fail = (error?: unknown): void => {
                if (signal?.aborted || isAbortError(error)) {
                    reject(error instanceof DOMException ? error : new DOMException('Aborted', 'AbortError'));
                    return;
                }
                reject(error);
            };

            decodeWithContext(context, arrayBuffer.slice(0)).then(resolve, fail);
        });

        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        const extractStarted = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const peaks = extractPeaks(audioBuffer, peakCount);
        const extractMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - extractStarted;

        return {
            durationSec: audioBuffer.duration,
            peaks,
            extractMs,
        };
    } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
            throw error instanceof DOMException ? error : new DOMException('Aborted', 'AbortError');
        }
        throw error;
    } finally {
        if (signal) {
            signal.removeEventListener('abort', abortDecode);
        }
        try {
            await context.close();
        } catch {
            // Context may already be closed.
        }
    }
}

/**
 * Measures a client-decode attempt against the V1 waveform contract.
 * Decode is not invoked when size or duration is over the cap (or unknown).
 */
export async function probeDecode(options: {
    compressedBytes?: number;
    durationSec?: number;
    decodePcm: DecodeToPeaksFn;
    peakCount?: number;
    caps?: WaveformCaps;
    signal?: AbortSignal;
}): Promise<ProbeResult> {
    const emptyTimings: ProbeTimings = { decodeMs: null, extractMs: null };
    const decision = canDecode(
        { compressedBytes: options.compressedBytes, durationSec: options.durationSec },
        options.caps,
    );

    if (!decision.isAllowed) {
        return createSkippedDecodeResult(decision.reason);
    }

    if (options.signal?.aborted) {
        return { status: 'cancelled', isDecodeSkipped: true, timings: emptyTimings };
    }

    const signal = options.signal ?? new AbortController().signal;
    const decodeStarted = typeof performance !== 'undefined' ? performance.now() : Date.now();

    let decodeOutput: ClientDecodeOutput;
    try {
        decodeOutput = await options.decodePcm(signal);
    } catch (error) {
        if (signal.aborted || isAbortError(error)) {
            return { status: 'cancelled', isDecodeSkipped: false, timings: emptyTimings };
        }
        const waveformError = errorFromUnknown(error);
        return {
            status: 'failed',
            error: waveformError,
            retryable: isRetryableWaveformError(waveformError.code),
            isDecodeSkipped: false,
            timings: {
                decodeMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - decodeStarted,
                extractMs: null,
            },
        };
    }

    const decodeMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - decodeStarted;

    if (signal.aborted) {
        return {
            status: 'cancelled',
            isDecodeSkipped: false,
            timings: { decodeMs, extractMs: null },
        };
    }

    let peaks: number[];
    let extractMs: number;
    if (isExtractedClientDecodeOutput(decodeOutput)) {
        ({ peaks, extractMs } = decodeOutput);
    } else {
        const extractStarted = typeof performance !== 'undefined' ? performance.now() : Date.now();
        peaks = extractPeaks(decodeOutput.peakSource, options.peakCount ?? CLIENT_DECODE_PEAK_COUNT);
        extractMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - extractStarted;
    }

    const validation = validateWaveformPayload(
        {
            version: WAVEFORM_PAYLOAD_VERSION,
            durationSec: options.durationSec ?? decodeOutput.durationSec,
            peaks,
        },
        { isPayloadByteCheckSkipped: true },
    );

    if (!validation.ok) {
        return {
            status: 'failed',
            error: validation.error,
            retryable: isRetryableWaveformError(validation.error.code),
            isDecodeSkipped: false,
            timings: { decodeMs, extractMs },
        };
    }

    const { payload } = validation;
    return {
        status: 'ready',
        payload,
        isDecodeSkipped: false,
        timings: { decodeMs, extractMs },
    };
}

/**
 * Gate, fetch, decode, and extract in-viewer peaks. Skips decode when over cap.
 * Playback must not await this.
 */
export function loadPeaks(request: ClientDecodeRequest): Promise<ProbeResult> {
    return probeDecode({
        compressedBytes: request.compressedBytes,
        durationSec: request.durationSec,
        signal: request.signal,
        decodePcm: async signal => {
            const arrayBuffer = await request.fetchArrayBuffer(signal);
            return decodePcm(arrayBuffer, signal);
        },
    });
}
