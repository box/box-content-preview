import fitFrameToViewport from '../fitFrameToViewport';

describe('lib/viewers/media/fitFrameToViewport', () => {
    test('should width-fit when the frame is shorter than the viewport height', () => {
        expect(fitFrameToViewport(16 / 9, { width: 1600, height: 1200 })).toEqual({
            width: 1600,
            height: 900,
        });
    });

    test('should height-fit without exceeding the viewport width', () => {
        const { width, height } = fitFrameToViewport(16 / 9, { width: 800, height: 300 });
        expect(height).toBeCloseTo(300, 5);
        expect(width).toBeCloseTo(300 * (16 / 9), 5);
        expect(width).toBeLessThanOrEqual(800);
    });

    test('should not exceed a narrow viewport', () => {
        const { width, height } = fitFrameToViewport(1, { width: 200, height: 800 });
        expect(width).toBe(200);
        expect(height).toBe(200);
    });

    test('should contain-fit a tall aspect without overflowing the stage', () => {
        const { width, height } = fitFrameToViewport(9 / 16, { width: 800, height: 600 });
        expect(height).toBeCloseTo(600, 5);
        expect(width).toBeCloseTo(600 * (9 / 16), 5);
        expect(width).toBeLessThanOrEqual(800);
        expect(height).toBeLessThanOrEqual(600);
    });

    test('should return zeros for a non-positive viewport', () => {
        expect(fitFrameToViewport(16 / 9, { width: 0, height: 400 })).toEqual({ width: 0, height: 0 });
        expect(fitFrameToViewport(16 / 9, { width: 400, height: -1 })).toEqual({ width: 0, height: 0 });
    });
});
