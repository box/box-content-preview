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
    /** Skip JSON byte-length check (in-memory client peaks, not wire JSON). */
    isPayloadByteCheckSkipped?: boolean;
    /** Override default caps (used in tests and perf harness). */
    maxPeakCount?: number;
    maxPayloadBytes?: number;
};

export type WaveformCaps = {
    maxDurationSec?: number;
    maxCompressedBytes?: number;
};

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
    attemptMs: number | null;
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

/** Visible slice of the timeline. Emitted whenever zoom, scroll, or width changes. */
export type WaveformViewport = {
    durationSec: number;
    endSec: number;
    heightPx: number;
    maxZoom: number;
    pixelsPerSecond: number;
    scrollLeftPx: number;
    startSec: number;
    widthPx: number;
    zoomLevel: number;
};

export type WaveformViewportInput = Omit<WaveformViewport, 'endSec' | 'pixelsPerSecond' | 'startSec'>;

export type PlayheadCameraAction =
    | { type: 'none' }
    | { type: 'followRight'; isPlayheadPinned: boolean; scrollLeftPx: number }
    | { type: 'jump'; scrollLeftPx: number };

export type WaveformViewProps = {
    bufferedRange?: TimeRanges;
    currentTime?: number;
    durationSec: number;
    height?: number;
    interactive?: boolean;
    mediaEl?: HTMLMediaElement | null;
    onSeek?: (timeSec: number) => void;
    onViewportChange?: (viewport: WaveformViewport) => void;
    onZoomChange?: (zoomLevel: number) => void;
    peaks: ArrayLike<number>;
    zoomLevel?: number;
};

export type WaveformZoomControlProps = {
    isRevealed?: boolean;
    maxZoom: number;
    onZoomChange: (zoomLevel: number) => void;
    zoomLevel: number;
};

/** One canvas linear-gradient stop. `offset` is 0–1 along the bar. */
export type GradientStop = {
    color: string;
    offset: number;
};

/**
 * Wavesurfer's two paints: left of the playhead (`progressColor`) and right of it (`waveColor`).
 * A string is a solid fill; a stop list is a left-to-right step gradient.
 */
export type WaveformFills = {
    progressColor: string | GradientStop[];
    waveColor: string | GradientStop[];
};
