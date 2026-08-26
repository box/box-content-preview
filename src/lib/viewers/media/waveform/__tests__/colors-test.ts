import {
    fillForTile,
    getBufferedProgress,
    getWaveformFills,
    tintWaveformTiles,
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

describe('tintWaveformTiles', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('should offset each tile gradient into global waveform coordinates', () => {
        const host = document.createElement('div');
        host.innerHTML = `
            <div class="canvases">
                <canvas class="start" style="left: 0px; width: 200px;"></canvas>
                <canvas class="end" style="left: 200px; width: 200px;"></canvas>
            </div>
            <div class="progress">
                <canvas class="start" style="left: 0px; width: 200px;"></canvas>
                <canvas class="end" style="left: 200px; width: 200px;"></canvas>
            </div>
        `;

        const gradients: Array<{ left: string; x0: number; x1: number }> = [];
        jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(
            this: HTMLCanvasElement,
        ) {
            Object.defineProperty(this, 'width', { configurable: true, value: 200 });
            Object.defineProperty(this, 'height', { configurable: true, value: 10 });
            return ({
                createLinearGradient: (x0: number, _y0: number, x1: number) => {
                    gradients.push({ left: this.style.left, x0, x1 });
                    return { addColorStop: jest.fn() };
                },
                fillRect: jest.fn(),
                restore: jest.fn(),
                save: jest.fn(),
                fillStyle: '',
                globalCompositeOperation: 'source-over',
            } as unknown) as CanvasRenderingContext2D;
        });

        tintWaveformTiles({
            fills: getWaveformFills({ bufferProgress: 1, hoverProgress: 0.25 }),
            host,
            totalWidthCss: 400,
        });

        expect(gradients).toEqual(
            expect.arrayContaining([
                { left: '0px', x0: 0, x1: 400 },
                { left: '200px', x0: -200, x1: 200 },
            ]),
        );
    });

    test('should shift a fill by the tile offset in device pixels', () => {
        const canvas = document.createElement('canvas');
        canvas.style.width = '100px';
        Object.defineProperty(canvas, 'width', { configurable: true, value: 200 });
        const createLinearGradient = jest.fn(() => ({ addColorStop: jest.fn() }));
        const context = ({ createLinearGradient } as unknown) as CanvasRenderingContext2D;

        fillForTile(
            context,
            [
                { color: '#fff', offset: 0 },
                { color: '#000', offset: 1 },
            ],
            400,
            200,
            canvas,
        );

        expect(createLinearGradient).toHaveBeenCalledWith(-400, 0, 400, 0);
    });

    test('should restore the captured bar mask before a second source-in tint', () => {
        const host = document.createElement('div');
        host.innerHTML = `
            <div class="canvases">
                <canvas style="left: 0px; width: 200px;"></canvas>
            </div>
        `;

        const getImageData = jest.fn(() => ({ data: new Uint8ClampedArray(8) }));
        const putImageData = jest.fn();
        jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(
            this: HTMLCanvasElement,
        ) {
            Object.defineProperty(this, 'width', { configurable: true, value: 200 });
            Object.defineProperty(this, 'height', { configurable: true, value: 10 });
            return ({
                createLinearGradient: () => ({ addColorStop: jest.fn() }),
                fillRect: jest.fn(),
                getImageData,
                putImageData,
                restore: jest.fn(),
                save: jest.fn(),
                fillStyle: '',
                globalCompositeOperation: 'source-over',
            } as unknown) as CanvasRenderingContext2D;
        });

        const fills = getWaveformFills({ bufferProgress: 1, hoverProgress: 0.25 });
        tintWaveformTiles({ fills, host, totalWidthCss: 200 });
        expect(getImageData).toHaveBeenCalled();
        expect(putImageData).not.toHaveBeenCalled();

        tintWaveformTiles({ fills, host, totalWidthCss: 200 });
        expect(putImageData).toHaveBeenCalled();
    });

    test('should not tint canvases outside the waveform host', () => {
        const host = document.createElement('div');
        host.innerHTML = `<div class="canvases"><canvas style="width: 200px;"></canvas></div>`;

        const outsider = document.createElement('div');
        outsider.className = 'canvases';
        outsider.innerHTML = '<canvas style="width: 200px;"></canvas>';
        document.body.appendChild(outsider);

        const fillRect = jest.fn();
        jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(
            this: HTMLCanvasElement,
        ) {
            Object.defineProperty(this, 'width', { configurable: true, value: 200 });
            Object.defineProperty(this, 'height', { configurable: true, value: 10 });
            return ({
                createLinearGradient: () => ({ addColorStop: jest.fn() }),
                fillRect,
                restore: jest.fn(),
                save: jest.fn(),
                fillStyle: '',
                globalCompositeOperation: 'source-over',
            } as unknown) as CanvasRenderingContext2D;
        });

        tintWaveformTiles({
            fills: getWaveformFills({ bufferProgress: 1, hoverProgress: null }),
            host,
            totalWidthCss: 200,
        });

        expect(fillRect).toHaveBeenCalledTimes(1);
        outsider.remove();
    });
});
