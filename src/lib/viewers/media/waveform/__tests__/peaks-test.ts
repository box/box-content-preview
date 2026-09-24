import {
    formatTime,
    resizePeaks,
    morphPeaks,
    PLACEHOLDER_PEAK_AMPLITUDE,
    placeholderPeaks,
    toChannels,
    WAVEFORM_PEAK_MORPH_MS,
    WAVEFORM_PEAK_STAGGER_MS,
    WAVEFORM_PEAK_TRANSITION_MS,
} from '../peaks';

describe('peaks', () => {
    test('should fill every sample with the default amplitude', () => {
        expect(placeholderPeaks()).toHaveLength(2000);
        expect(placeholderPeaks(8)).toEqual(new Array(8).fill(PLACEHOLDER_PEAK_AMPLITUDE));
    });

    test('should be deterministic', () => {
        expect(placeholderPeaks(16)).toEqual(placeholderPeaks(16));
    });

    test('should duplicate unit peaks as mirrored channels', () => {
        expect(toChannels([0.1, 0.5, 1])).toEqual([
            [0.1, 0.5, 1],
            [0.1, 0.5, 1],
        ]);
    });

    test.each`
        time      | expected
        ${0}      | ${'0:00.00'}
        ${33.23}  | ${'0:33.23'}
        ${65.5}   | ${'1:05.50'}
        ${3661.2} | ${'1:01:01.20'}
        ${NaN}    | ${'0:00.00'}
    `('should format $time as $expected', ({ expected, time }) => {
        expect(formatTime(time)).toBe(expected);
    });

    test('should return the destination peaks after morph plus stagger', () => {
        const to = [0.2, 0.8, 0.4];
        const morphed = morphPeaks(
            [PLACEHOLDER_PEAK_AMPLITUDE, PLACEHOLDER_PEAK_AMPLITUDE, PLACEHOLDER_PEAK_AMPLITUDE],
            to,
            WAVEFORM_PEAK_TRANSITION_MS,
        );
        expect(morphed[0]).toBeCloseTo(0.2);
        expect(morphed[1]).toBeCloseTo(0.8);
        expect(morphed[2]).toBeCloseTo(0.4);
    });

    test('should stay at the placeholder at 0ms', () => {
        const from = [PLACEHOLDER_PEAK_AMPLITUDE, PLACEHOLDER_PEAK_AMPLITUDE];
        const morphed = morphPeaks(from, [1, 0], 0);
        expect(morphed[0]).toBeCloseTo(PLACEHOLDER_PEAK_AMPLITUDE);
        expect(morphed[1]).toBeCloseTo(PLACEHOLDER_PEAK_AMPLITUDE);
    });

    test('should leave the last peak at rest when stagger elapses and the first peak is mid-morph', () => {
        const from = [PLACEHOLDER_PEAK_AMPLITUDE, PLACEHOLDER_PEAK_AMPLITUDE, PLACEHOLDER_PEAK_AMPLITUDE];
        const to = [1, 1, 1];
        const morphed = morphPeaks(from, to, WAVEFORM_PEAK_STAGGER_MS);
        const firstPeakT = WAVEFORM_PEAK_STAGGER_MS / WAVEFORM_PEAK_MORPH_MS;
        const firstPeakEased = 1 - (1 - firstPeakT) ** 3;

        expect(morphed[0]).toBeCloseTo(firstPeakEased);
        expect(morphed[2]).toBeCloseTo(PLACEHOLDER_PEAK_AMPLITUDE);
    });

    test('should resize placeholder peaks onto the destination length', () => {
        const resized = resizePeaks([PLACEHOLDER_PEAK_AMPLITUDE, PLACEHOLDER_PEAK_AMPLITUDE], 4);
        expect(resized).toHaveLength(4);
        Array.from(resized).forEach(peak => {
            expect(peak).toBeCloseTo(PLACEHOLDER_PEAK_AMPLITUDE);
        });
    });

    test('should expose a positive transition duration', () => {
        expect(WAVEFORM_PEAK_TRANSITION_MS).toBeGreaterThan(0);
    });
});
