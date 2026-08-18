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

const DEFAULT_PEAK_SCALE: WaveformPeakScale = 'unit';
const DEFAULT_CHANNEL_POLICY: WaveformChannelPolicy = 'mono_max';
const DEFAULT_ENVELOPE: WaveformEnvelope = 'peak';

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

    if (raw === null || raw === undefined) {
        return {
            ok: false,
            error: { code: 'INVALID_PAYLOAD', message: 'Payload is null or undefined' },
            retryable: false,
        };
    }

    const byteLength = payloadByteLength(raw);
    if (byteLength > maxPayloadBytes) {
        return {
            ok: false,
            error: {
                code: 'PAYLOAD_TOO_LARGE',
                message: `Payload size ${byteLength} exceeds limit ${maxPayloadBytes}`,
            },
            retryable: false,
        };
    }

    if (!isPlainObject(raw)) {
        return {
            ok: false,
            error: { code: 'INVALID_PAYLOAD', message: 'Payload must be an object' },
            retryable: false,
        };
    }

    if (raw.version !== WAVEFORM_PAYLOAD_VERSION) {
        const { version } = raw;
        if (typeof version === 'number' && version > WAVEFORM_PAYLOAD_VERSION) {
            return {
                ok: false,
                error: {
                    code: 'UNSUPPORTED_VERSION',
                    message: `Unsupported waveform version ${version}; max supported is ${WAVEFORM_PAYLOAD_VERSION}`,
                },
                retryable: false,
            };
        }

        return {
            ok: false,
            error: { code: 'INVALID_PAYLOAD', message: 'Missing or invalid version field' },
            retryable: false,
        };
    }

    const payload = asWaveformPayloadV1(raw);
    if (!payload) {
        return {
            ok: false,
            error: { code: 'INVALID_PAYLOAD', message: 'Payload failed structural validation' },
            retryable: false,
        };
    }

    if (!Number.isFinite(payload.durationSec) || payload.durationSec <= 0) {
        return {
            ok: false,
            error: { code: 'INVALID_DURATION', message: 'durationSec must be a positive finite number' },
            retryable: false,
        };
    }

    if (
        options.expectedDurationSec !== undefined &&
        Number.isFinite(options.expectedDurationSec) &&
        Math.abs(payload.durationSec - options.expectedDurationSec) > DURATION_MISMATCH_TOLERANCE_SEC
    ) {
        return {
            ok: false,
            error: {
                code: 'DURATION_MISMATCH',
                message: `Payload duration ${payload.durationSec}s differs from media duration ${options.expectedDurationSec}s`,
            },
            retryable: true,
        };
    }

    if (payload.peaks.length === 0) {
        return {
            ok: false,
            error: { code: 'EMPTY_PEAKS', message: 'peaks array must not be empty' },
            retryable: false,
        };
    }

    if (payload.peaks.length > maxPeakCount) {
        return {
            ok: false,
            error: {
                code: 'PEAK_COUNT_EXCEEDED',
                message: `peaks length ${payload.peaks.length} exceeds max ${maxPeakCount}`,
            },
            retryable: false,
        };
    }

    const normalized = new Float32Array(payload.peaks.length);
    for (let i = 0; i < payload.peaks.length; i += 1) {
        const value = payload.peaks[i];
        if (!Number.isFinite(value)) {
            return {
                ok: false,
                error: {
                    code: 'NON_FINITE_PEAK',
                    message: `Peak at index ${i} is not finite`,
                },
                retryable: false,
            };
        }
        if (value < PEAK_UNIT_MIN || value > PEAK_UNIT_MAX) {
            return {
                ok: false,
                error: {
                    code: 'PEAK_OUT_OF_RANGE',
                    message: `Peak at index ${i} is outside [${PEAK_UNIT_MIN}, ${PEAK_UNIT_MAX}]`,
                },
                retryable: false,
            };
        }
        normalized[i] = value;
    }

    return {
        ok: true,
        payload: {
            version: WAVEFORM_PAYLOAD_VERSION,
            durationSec: payload.durationSec,
            peaks: normalized,
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
