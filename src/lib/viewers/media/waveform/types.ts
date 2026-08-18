import { WAVEFORM_PAYLOAD_VERSION } from './constants';

/**
 * Box V1 is the in-viewer form: unsigned mono peaks in [0, 1] (peak envelope, mono_max).
 * Wire JSON only requires version, durationSec, and peaks. Policy fields default.
 * Conversion or wavesurfer payloads should be adapted at the edge, not stored as-is.
 */

export type WaveformPayloadVersion = typeof WAVEFORM_PAYLOAD_VERSION;

export type WaveformPeakScale = 'unit';
export type WaveformChannelPolicy = 'mono_max';
export type WaveformEnvelope = 'peak';

/** Who produced peaks */
export type WaveformPayloadSource = 'fixture' | 'client' | 'conversion';

/**
 * Viewer-normalized waveform JSON (version 1).
 * Required: version, durationSec, peaks. Everything else is optional and defaulted.
 */
export type WaveformPayloadV1 = {
    version: WaveformPayloadVersion;
    durationSec: number;
    peaks: number[];
    peakScale?: WaveformPeakScale;
    channelPolicy?: WaveformChannelPolicy;
    envelope?: WaveformEnvelope;
    channels?: 1;
    generatedAt?: string;
    pixelsPerSecondHint?: number | null;
};

/** Validated, runtime-friendly peak data passed to renderers. */
export type NormalizedWaveformPayload = {
    version: WaveformPayloadVersion;
    durationSec: number;
    peaks: Float32Array;
    peakScale: WaveformPeakScale;
    channelPolicy: WaveformChannelPolicy;
    envelope: WaveformEnvelope;
};

export const WAVEFORM_ERROR_CODES = [
    'INVALID_PAYLOAD',
    'UNSUPPORTED_VERSION',
    'INVALID_DURATION',
    'DURATION_MISMATCH',
    'PEAK_COUNT_EXCEEDED',
    'PAYLOAD_TOO_LARGE',
    'NON_FINITE_PEAK',
    'PEAK_OUT_OF_RANGE',
    'EMPTY_PEAKS',
    'CAP_EXCEEDED',
    'LOAD_FAILED',
    'DECODE_FAILED',
    'CANCELLED',
    'UNAVAILABLE',
] as const;

export type WaveformErrorCode = typeof WAVEFORM_ERROR_CODES[number];

const WAVEFORM_ERROR_CODE_SET: ReadonlySet<string> = new Set(WAVEFORM_ERROR_CODES);

export function isWaveformErrorCode(value: string): value is WaveformErrorCode {
    return WAVEFORM_ERROR_CODE_SET.has(value);
}

export type WaveformError = {
    code: WaveformErrorCode;
    message: string;
};

export type WaveformLoadState =
    | { status: 'unavailable' }
    | { status: 'pending' }
    | { status: 'ready'; payload: NormalizedWaveformPayload }
    | { status: 'failed'; error: WaveformError; retryable: boolean }
    | { status: 'capped'; error: WaveformError }
    | { status: 'cancelled' };

export type WaveformValidationOptions = {
    /** When set, payload duration must agree within tolerance. */
    expectedDurationSec?: number;
    /** Override default caps (used in tests and perf harness). */
    maxPeakCount?: number;
    maxPayloadBytes?: number;
};

export type WaveformCaps = {
    maxDurationSec?: number;
    maxCompressedBytes?: number;
};

/**
 * Async boundary for waveform data. Implementations may fetch fixtures, decode client-side,
 * or load Conversion reps — callers only observe WaveformLoadState.
 */
export type WaveformSource = {
    load: () => Promise<WaveformLoadState>;
    abort: () => void;
    getState: () => WaveformLoadState;
};

export type WaveformLoaderFactory = (
    fetchPayload: (signal: AbortSignal) => Promise<unknown>,
    options?: WaveformValidationOptions,
) => WaveformSource;
