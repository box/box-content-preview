import readyOverview from '../fixtures/ready-overview-v1.json';
import readySpeech from '../fixtures/ready-speech-v1.json';
import { validateWaveformPayload } from '../validateWaveformPayload';

describe('validateWaveformPayload', () => {
    describe('golden fixtures', () => {
        test.each([
            ['ready-overview-v1', readyOverview],
            ['ready-speech-v1', readySpeech],
        ])('should accept %s', (_name, fixture) => {
            const result = validateWaveformPayload(fixture);

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.payload.peaks).toBeInstanceOf(Float32Array);
                expect(result.payload.peaks.length).toBe(fixture.peaks.length);
                expect(result.payload.durationSec).toBe(fixture.durationSec);
                expect(result.payload.peakScale).toBe('unit');
                expect(result.payload.channelPolicy).toBe('mono_max');
                expect(result.payload.envelope).toBe('peak');
            }
        });
    });

    describe('slim wire format', () => {
        test('should accept only version, durationSec, and peaks', () => {
            const result = validateWaveformPayload({
                version: 1,
                durationSec: 4,
                peaks: [0.1, 0.2, 0.3],
            });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.payload.peaks.length).toBe(3);
            }
        });

        test('should ignore source and sampleCount', () => {
            const result = validateWaveformPayload({
                ...readyOverview,
                source: 'conversion',
                sampleCount: 999,
            });

            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.payload.peaks.length).toBe(readyOverview.peaks.length);
            }
        });

        test('should reject unknown policy values when provided', () => {
            const result = validateWaveformPayload({
                ...readyOverview,
                envelope: 'rms',
            });

            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('INVALID_PAYLOAD');
            }
        });
    });

    describe('malformed payloads', () => {
        test('should reject null', () => {
            const result = validateWaveformPayload(null);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('INVALID_PAYLOAD');
            }
        });

        test('should reject unsupported future version', () => {
            const result = validateWaveformPayload({ ...readyOverview, version: 99 });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('UNSUPPORTED_VERSION');
            }
        });

        test('should reject peak count above max', () => {
            const result = validateWaveformPayload(readyOverview, { maxPeakCount: 2 });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('PEAK_COUNT_EXCEEDED');
            }
        });

        test('should reject payload larger than maxPayloadBytes', () => {
            const result = validateWaveformPayload(readyOverview, { maxPayloadBytes: 16 });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('PAYLOAD_TOO_LARGE');
                expect(result.retryable).toBe(false);
            }
        });

        test('should skip payload byte limit when isPayloadByteCheckSkipped is set', () => {
            const result = validateWaveformPayload(readyOverview, {
                maxPayloadBytes: 16,
                isPayloadByteCheckSkipped: true,
            });
            expect(result.ok).toBe(true);
        });

        test('should reject non-finite peak', () => {
            const peaks = [...readyOverview.peaks];
            peaks[2] = Number.NaN;
            const result = validateWaveformPayload({ ...readyOverview, peaks });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('NON_FINITE_PEAK');
            }
        });

        test('should reject peak outside unit range', () => {
            const peaks = [...readyOverview.peaks];
            peaks[2] = 1.5;
            const result = validateWaveformPayload({ ...readyOverview, peaks });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('PEAK_OUT_OF_RANGE');
            }
        });

        test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
            'should reject durationSec %s as INVALID_DURATION',
            durationSec => {
                const result = validateWaveformPayload({
                    version: 1,
                    durationSec,
                    peaks: [0.1, 0.2],
                });
                expect(result.ok).toBe(false);
                if (!result.ok) {
                    expect(result.error.code).toBe('INVALID_DURATION');
                    expect(result.retryable).toBe(false);
                }
            },
        );

        test('should reject duration mismatch when expected duration provided', () => {
            const result = validateWaveformPayload(readyOverview, { expectedDurationSec: 999 });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('DURATION_MISMATCH');
                expect(result.retryable).toBe(true);
            }
        });

        test('should skip duration check when expected duration is not finite', () => {
            const result = validateWaveformPayload(readyOverview, { expectedDurationSec: Number.NaN });
            expect(result.ok).toBe(true);
        });

        test('should accept duration within tolerance', () => {
            const result = validateWaveformPayload(readyOverview, {
                expectedDurationSec: readyOverview.durationSec + 0.5,
            });
            expect(result.ok).toBe(true);
        });

        test('should reject empty peaks', () => {
            const result = validateWaveformPayload({
                version: 1,
                durationSec: 10,
                peaks: [],
            });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.code).toBe('EMPTY_PEAKS');
            }
        });
    });
});
