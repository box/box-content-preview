/** Current waveform payload schema version. Bump only with a migration path. */
export const WAVEFORM_PAYLOAD_VERSION = 1;

/** Maximum peaks in a single tier (overview or detail). */
export const MAX_PEAK_COUNT = 16384;

/** Hard limit on serialized JSON body size for a waveform payload (bytes). */
export const MAX_PAYLOAD_BYTES = 512 * 1024;

/** Allowed delta between payload duration and caller-supplied media duration (seconds). */
export const DURATION_MISMATCH_TOLERANCE_SEC = 1;

/** Peak values must live in this closed interval when peakScale is "unit". */
export const PEAK_UNIT_MIN = 0;
export const PEAK_UNIT_MAX = 1;

/** Skip client decode when the compressed file is larger than this. */
export const CLIENT_DECODE_MAX_COMPRESSED_BYTES = 6 * 1024 * 1024;

/** Skip client decode when media duration is longer than this. */
export const CLIENT_DECODE_MAX_DURATION_SEC = 5 * 60;

/** Default overview resolution for client-generated peaks. */
export const CLIENT_DECODE_PEAK_COUNT = 16384;
