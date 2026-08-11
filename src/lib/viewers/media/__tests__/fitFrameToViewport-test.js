import fitFrameToViewport from '../fitFrameToViewport';
import { MIN_VIDEO_WIDTH_PX } from '../../../constants';

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

    test('should enforce the minimum video width', () => {
        const { width } = fitFrameToViewport(1, { width: 200, height: 800 });
        expect(width).toBe(MIN_VIDEO_WIDTH_PX);
    });
});
