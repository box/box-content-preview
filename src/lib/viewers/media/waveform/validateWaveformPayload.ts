import {
    DURATION_MISMATCH_TOLERANCE_SEC,
    MAX_PAYLOAD_BYTES,
    MAX_PEAK_COUNT,
    PEAK_UNIT_MAX,
    PEAK_UNIT_MIN,
    WAVEFORM_PAYLOAD_VERSION,
} from './constants';
import {
    NormalizedWaveformPayload,
    WaveformChannelPolicy,
    WaveformEnvelope,
    WaveformError,
    WaveformPayloadV1,
    WaveformPeakScale,
    WaveformValidationOptions,
} from './types';

export type WaveformValidationResult =
    | { ok: true; payload: NormalizedWaveformPayload }
    | { ok: false; error: WaveformError; retryable: boolean };

type WaveformValidationFailure = Extract<WaveformValidationResult, { ok: false }>;

const DEFAULT_PEAK_SCALE: WaveformPeakScale = 'unit';
const DEFAULT_CHANNEL_POLICY: WaveformChannelPolicy = 'mono_max';
const DEFAULT_ENVELOPE: WaveformEnvelope = 'peak';

function fail(code: WaveformError['code'], message: string, retryable = false): WaveformValidationFailure {
    return { ok: false, error: { code, message }, retryable };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function payloadByteLength(raw: unknown): number {
    try {
        const serialized = JSON.stringify(raw);
        if (typeof Buffer !== 'undefined') {
            return Buffer.byteLength(serialized, 'utf8');
        }
        if (typeof TextEncoder !== 'undefined') {
            return new TextEncoder().encode(serialized).length;
        }
        return serialized.length;
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

function readOptionalPolicy<T extends string>(
    raw: Record<string, unknown>,
    key: string,
    allowed: T,
): T | null | undefined {
    if (!(key in raw) || raw[key] === undefined) {
        return undefined;
    }
    return raw[key] === allowed ? allowed : null;
}

function asWaveformPayloadV1(raw: Record<string, unknown>): WaveformPayloadV1 | null {
    const { version, durationSec, peaks } = raw;

    if (version !== WAVEFORM_PAYLOAD_VERSION || typeof durationSec !== 'number' || !Array.isArray(peaks)) {
        return null;
    }

    const peakScale = readOptionalPolicy(raw, 'peakScale', DEFAULT_PEAK_SCALE);
    const channelPolicy = readOptionalPolicy(raw, 'channelPolicy', DEFAULT_CHANNEL_POLICY);
    const envelope = readOptionalPolicy(raw, 'envelope', DEFAULT_ENVELOPE);
    if (peakScale === null || channelPolicy === null || envelope === null) {
        return null;
    }

    if ('channels' in raw && raw.channels !== undefined && raw.channels !== 1) {
        return null;
    }

    return {
        version: WAVEFORM_PAYLOAD_VERSION,
        durationSec,
        peaks: peaks as number[],
        peakScale: peakScale ?? DEFAULT_PEAK_SCALE,
        channelPolicy: channelPolicy ?? DEFAULT_CHANNEL_POLICY,
        envelope: envelope ?? DEFAULT_ENVELOPE,
        channels: 1,
    };
}

function readPayloadObject(
    raw: unknown,
    maxPayloadBytes: number,
): { ok: true; value: Record<string, unknown> } | WaveformValidationFailure {
    if (raw === null || raw === undefined) {
        return fail('INVALID_PAYLOAD', 'Payload is null or undefined');
    }

    const byteLength = payloadByteLength(raw);
    if (byteLength > maxPayloadBytes) {
        return fail('PAYLOAD_TOO_LARGE', `Payload size ${byteLength} exceeds limit ${maxPayloadBytes}`);
    }

    if (!isPlainObject(raw)) {
        return fail('INVALID_PAYLOAD', 'Payload must be an object');
    }

    return { ok: true, value: raw };
}

function checkVersion(raw: Record<string, unknown>): WaveformValidationFailure | null {
    if (raw.version === WAVEFORM_PAYLOAD_VERSION) {
        return null;
    }

    const { version } = raw;
    if (typeof version === 'number' && version > WAVEFORM_PAYLOAD_VERSION) {
        return fail(
            'UNSUPPORTED_VERSION',
            `Unsupported waveform version ${version}; max supported is ${WAVEFORM_PAYLOAD_VERSION}`,
        );
    }

    return fail('INVALID_PAYLOAD', 'Missing or invalid version field');
}

function checkDuration(payload: WaveformPayloadV1, expectedDurationSec?: number): WaveformValidationFailure | null {
    if (!Number.isFinite(payload.durationSec) || payload.durationSec <= 0) {
        return fail('INVALID_DURATION', 'durationSec must be a positive finite number');
    }

    if (
        expectedDurationSec !== undefined &&
        Number.isFinite(expectedDurationSec) &&
        Math.abs(payload.durationSec - expectedDurationSec) > DURATION_MISMATCH_TOLERANCE_SEC
    ) {
        return fail(
            'DURATION_MISMATCH',
            `Payload duration ${payload.durationSec}s differs from media duration ${expectedDurationSec}s`,
            true,
        );
    }

    return null;
}

function normalizePeaks(
    peaks: number[],
    maxPeakCount: number,
): { ok: true; peaks: Float32Array } | WaveformValidationFailure {
    if (peaks.length === 0) {
        return fail('EMPTY_PEAKS', 'peaks array must not be empty');
    }

    if (peaks.length > maxPeakCount) {
        return fail('PEAK_COUNT_EXCEEDED', `peaks length ${peaks.length} exceeds max ${maxPeakCount}`);
    }

    const normalized = new Float32Array(peaks.length);
    for (let i = 0; i < peaks.length; i += 1) {
        const value = peaks[i];
        if (!Number.isFinite(value)) {
            return fail('NON_FINITE_PEAK', `Peak at index ${i} is not finite`);
        }
        if (value < PEAK_UNIT_MIN || value > PEAK_UNIT_MAX) {
            return fail('PEAK_OUT_OF_RANGE', `Peak at index ${i} is outside [${PEAK_UNIT_MIN}, ${PEAK_UNIT_MAX}]`);
        }
        normalized[i] = value;
    }

    return { ok: true, peaks: normalized };
}

/**
 * Validates a version-1 waveform payload and returns normalized peaks for rendering.
 * Wire JSON requires version, durationSec, and peaks. sampleCount and source are ignored.
 */
export function validateWaveformPayload(
    raw: unknown,
    options: WaveformValidationOptions = {},
): WaveformValidationResult {
    const maxPeakCount = options.maxPeakCount ?? MAX_PEAK_COUNT;
    const maxPayloadBytes = options.maxPayloadBytes ?? MAX_PAYLOAD_BYTES;

    const objectResult = readPayloadObject(raw, maxPayloadBytes);
    if (!objectResult.ok) {
        return objectResult;
    }

    const versionFailure = checkVersion(objectResult.value);
    if (versionFailure) {
        return versionFailure;
    }

    const payload = asWaveformPayloadV1(objectResult.value);
    if (!payload) {
        return fail('INVALID_PAYLOAD', 'Payload failed structural validation');
    }

    const durationFailure = checkDuration(payload, options.expectedDurationSec);
    if (durationFailure) {
        return durationFailure;
    }

    const peaksResult = normalizePeaks(payload.peaks, maxPeakCount);
    if (!peaksResult.ok) {
        return peaksResult;
    }

    return {
        ok: true,
        payload: {
            version: WAVEFORM_PAYLOAD_VERSION,
            durationSec: payload.durationSec,
            peaks: peaksResult.peaks,
            peakScale: payload.peakScale ?? DEFAULT_PEAK_SCALE,
            channelPolicy: payload.channelPolicy ?? DEFAULT_CHANNEL_POLICY,
            envelope: payload.envelope ?? DEFAULT_ENVELOPE,
        },
    };
}

/** Maps validation / load failures to retry policy for loaders. */
export function isRetryableWaveformError(code: WaveformError['code']): boolean {
    return code === 'DURATION_MISMATCH' || code === 'DECODE_FAILED' || code === 'LOAD_FAILED';
}
