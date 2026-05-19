import formatTimecode from '../formatTimecode';

describe('formatTimecode', () => {
    describe('at 30fps', () => {
        const fps = 30;

        test.each`
            seconds   | expected
            ${0}      | ${'00:00:00:00'}
            ${1}      | ${'00:00:01:00'}
            ${1.5}    | ${'00:00:01:15'}
            ${59}     | ${'00:00:59:00'}
            ${60}     | ${'00:01:00:00'}
            ${3600}   | ${'01:00:00:00'}
            ${3661.5} | ${'01:01:01:15'}
        `('should format $seconds seconds as $expected', ({ seconds, expected }) => {
            expect(formatTimecode(seconds, fps)).toBe(expected);
        });
    });

    describe('at 24fps', () => {
        const fps = 24;

        test.each`
            seconds | expected
            ${0}    | ${'00:00:00:00'}
            ${1}    | ${'00:00:01:00'}
            ${0.5}  | ${'00:00:00:12'}
            ${3600} | ${'01:00:00:00'}
        `('should format $seconds seconds as $expected', ({ seconds, expected }) => {
            expect(formatTimecode(seconds, fps)).toBe(expected);
        });
    });

    describe('edge cases', () => {
        test('should handle NaN', () => {
            expect(formatTimecode(NaN, 30)).toBe('00:00:00:00');
        });

        test('should handle Infinity', () => {
            expect(formatTimecode(Infinity, 30)).toBe('00:00:00:00');
        });

        test('should handle negative values', () => {
            expect(formatTimecode(-5, 30)).toBe('00:00:00:00');
        });
    });
});
