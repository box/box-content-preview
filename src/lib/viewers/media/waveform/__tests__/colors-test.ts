import {
    getBufferedProgress,
    getWaveformFills,
    WAVEFORM_COLOR_BUFFER,
    WAVEFORM_COLOR_HOVER_AREA,
    WAVEFORM_COLOR_HOVER_BUFFER,
    WAVEFORM_COLOR_HOVER_PLAYED,
    WAVEFORM_COLOR_HOVER_UNPLAYED,
    WAVEFORM_COLOR_PLAYED,
    WAVEFORM_COLOR_UNPLAYED,
} from '../colors';

function rgbChannel(color: string): number {
    const match = color.match(/\d+/);
    return match ? Number(match[0]) : 0;
}

function mockBufferedRange(endSec: number): TimeRanges {
    return {
        length: 1,
        start: () => 0,
        end: () => endSec,
    } as TimeRanges;
}

describe('colors', () => {
    test('should keep the played fill lighter than unplayed', () => {
        expect(rgbChannel(WAVEFORM_COLOR_PLAYED)).toBeGreaterThan(rgbChannel(WAVEFORM_COLOR_UNPLAYED));
    });

    test('should use played / unplayed / buffer tokens at rest', () => {
        const fills = getWaveformFills({ bufferProgress: 0.5, hoverProgress: null });

        expect(fills.progressColor).toBe(WAVEFORM_COLOR_PLAYED);
        expect(fills.waveColor).toEqual([
            { color: WAVEFORM_COLOR_UNPLAYED, offset: 0 },
            { color: WAVEFORM_COLOR_UNPLAYED, offset: 0.5 },
            { color: WAVEFORM_COLOR_BUFFER, offset: 0.5 },
            { color: WAVEFORM_COLOR_BUFFER, offset: 1 },
        ]);
    });

    test('should use a solid unplayed fill when the file is fully buffered', () => {
        const fills = getWaveformFills({ bufferProgress: 1, hoverProgress: null });

        expect(fills.waveColor).toBe(WAVEFORM_COLOR_UNPLAYED);
    });

    test('should brighten played and fill the hover area when scrubbing ahead', () => {
        const fills = getWaveformFills({ bufferProgress: 1, hoverProgress: 0.4 });

        expect(fills.progressColor).toEqual([
            { color: WAVEFORM_COLOR_HOVER_PLAYED, offset: 0 },
            { color: WAVEFORM_COLOR_HOVER_PLAYED, offset: 0.4 },
            { color: WAVEFORM_COLOR_HOVER_AREA, offset: 0.4 },
            { color: WAVEFORM_COLOR_HOVER_AREA, offset: 1 },
        ]);
        expect(fills.waveColor).toEqual([
            { color: WAVEFORM_COLOR_HOVER_AREA, offset: 0 },
            { color: WAVEFORM_COLOR_HOVER_AREA, offset: 0.4 },
            { color: WAVEFORM_COLOR_HOVER_UNPLAYED, offset: 0.4 },
            { color: WAVEFORM_COLOR_HOVER_UNPLAYED, offset: 1 },
        ]);
    });

    test('should keep hover-buffer past the loaded edge', () => {
        const fills = getWaveformFills({ bufferProgress: 0.5, hoverProgress: 0.8 });

        expect(fills.waveColor).toEqual(
            expect.arrayContaining([
                { color: WAVEFORM_COLOR_HOVER_BUFFER, offset: 0.8 },
                { color: WAVEFORM_COLOR_HOVER_BUFFER, offset: 1 },
            ]),
        );
    });

    test('should treat missing buffered ranges as fully loaded', () => {
        expect(getBufferedProgress(undefined, 8)).toBe(1);
        expect(getBufferedProgress(mockBufferedRange(4), 8)).toBe(0.5);
    });
});
