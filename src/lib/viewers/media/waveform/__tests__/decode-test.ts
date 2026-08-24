import { CLIENT_DECODE_MAX_COMPRESSED_BYTES, CLIENT_DECODE_MAX_DURATION_SEC } from '../constants';
import { WaveformLoadError } from '../createWaveformLoader';
import { canDecode, decodePcm, extractPeaks, loadPeaks, probeDecode } from '../decode';

function silentPcm(durationSec: number): Float32Array[] {
    const samples = Math.max(8, Math.floor(durationSec * 100));
    return [new Float32Array(samples)];
}

describe('canDecode', () => {
    const underCap = {
        compressedBytes: 1024 * 1024,
        durationSec: 60,
    };

    test('should allow decode when size and duration are within limits', () => {
        expect(canDecode(underCap)).toEqual({ isAllowed: true });
    });

    test('should allow decode at exact cap boundaries', () => {
        expect(
            canDecode({
                compressedBytes: CLIENT_DECODE_MAX_COMPRESSED_BYTES,
                durationSec: CLIENT_DECODE_MAX_DURATION_SEC,
            }),
        ).toEqual({ isAllowed: true });
    });

    test('should reject when compressed size is over the cap', () => {
        expect(
            canDecode({
                ...underCap,
                compressedBytes: CLIENT_DECODE_MAX_COMPRESSED_BYTES + 1,
            }),
        ).toEqual({ isAllowed: false, reason: 'compressed_size' });
    });

    test('should reject when duration is over the cap', () => {
        expect(
            canDecode({
                ...underCap,
                durationSec: CLIENT_DECODE_MAX_DURATION_SEC + 0.1,
            }),
        ).toEqual({ isAllowed: false, reason: 'duration' });
    });

    test('should reject when metadata is missing', () => {
        expect(canDecode({})).toEqual({ isAllowed: false, reason: 'missing_metadata' });
        expect(canDecode({ compressedBytes: 1000 })).toEqual({
            isAllowed: false,
            reason: 'missing_metadata',
        });
        expect(canDecode({ durationSec: 10 })).toEqual({ isAllowed: false, reason: 'missing_metadata' });
    });

    test('should honor cap overrides', () => {
        expect(canDecode(underCap, { maxCompressedBytes: 512 })).toEqual({
            isAllowed: false,
            reason: 'compressed_size',
        });
    });
});

describe('extractPeaks', () => {
    test('should return empty peaks when there are no samples', () => {
        expect(extractPeaks([new Float32Array(0)], 8)).toEqual([]);
    });

    test('should take max abs across stereo channels per bucket', () => {
        const left = new Float32Array([0.1, -0.2, 0.3, -0.4]);
        const right = new Float32Array([0.5, 0.05, -0.9, 0.1]);
        const peaks = extractPeaks([left, right], 2);

        expect(peaks).toHaveLength(2);
        expect(peaks[0]).toBeCloseTo(0.5);
        expect(peaks[1]).toBeCloseTo(0.9);
    });

    test('should extract from an AudioBuffer without copying channels', () => {
        const left = new Float32Array([0.1, -0.2, 0.3, -0.4]);
        const right = new Float32Array([0.5, 0.05, -0.9, 0.1]);
        const audioBuffer = ({
            numberOfChannels: 2,
            getChannelData: (channelIndex: number) => (channelIndex === 0 ? left : right),
        } as unknown) as AudioBuffer;

        const peaks = extractPeaks(audioBuffer, 2);

        expect(peaks).toHaveLength(2);
        expect(peaks[0]).toBeCloseTo(0.5);
        expect(peaks[1]).toBeCloseTo(0.9);
    });

    test('should clamp values above 1', () => {
        const peaks = extractPeaks([new Float32Array([1.5, 1.5])], 1);
        expect(peaks[0]).toBe(1);
    });
});

describe('decodePcm', () => {
    const audioWindow = window as Window & {
        AudioContext?: unknown;
        webkitAudioContext?: unknown;
    };
    const originalAudioContext = audioWindow.AudioContext;
    const originalWebkitAudioContext = audioWindow.webkitAudioContext;
    let close: jest.Mock;
    let decodeAudioData: jest.Mock;

    beforeEach(() => {
        close = jest.fn().mockResolvedValue(undefined);
        decodeAudioData = jest.fn(
            (
                buffer: ArrayBuffer,
                success: (decoded: {
                    duration: number;
                    numberOfChannels: number;
                    getChannelData: () => Float32Array;
                }) => void,
            ) => {
                success({
                    duration: 2,
                    numberOfChannels: 1,
                    getChannelData: () => new Float32Array([0, 0.5, -1]),
                });
            },
        );
        audioWindow.AudioContext = jest.fn(() => ({
            close,
            decodeAudioData,
        }));
        audioWindow.webkitAudioContext = undefined;
    });

    afterEach(() => {
        audioWindow.AudioContext = originalAudioContext;
        audioWindow.webkitAudioContext = originalWebkitAudioContext;
    });

    test('should extract peaks from decodeAudioData before closing the context', async () => {
        const result = await decodePcm(new ArrayBuffer(8), undefined, 3);

        expect(result.durationSec).toBe(2);
        expect(result.peaks).toEqual([0, 0.5, 1]);
        expect('peakSource' in result).toBe(false);
        expect(close).toHaveBeenCalled();
    });

    test('should throw DECODE_FAILED when AudioContext is missing', async () => {
        audioWindow.AudioContext = undefined;
        audioWindow.webkitAudioContext = undefined;

        await expect(decodePcm(new ArrayBuffer(8))).rejects.toEqual(expect.objectContaining({ code: 'DECODE_FAILED' }));
    });

    test('should throw when the signal is already aborted', async () => {
        const controller = new AbortController();
        controller.abort();

        await expect(decodePcm(new ArrayBuffer(8), controller.signal)).rejects.toMatchObject({
            name: 'AbortError',
        });
        expect(audioWindow.AudioContext).not.toHaveBeenCalled();
    });

    test('should close AudioContext when aborted during decode', async () => {
        decodeAudioData.mockImplementation(() => new Promise(() => undefined));
        const controller = new AbortController();
        const pending = decodePcm(new ArrayBuffer(8), controller.signal);

        await Promise.resolve();
        expect(audioWindow.AudioContext).toHaveBeenCalled();

        controller.abort();

        await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
        expect(close).toHaveBeenCalled();
    });

    test('should map decode failure to DECODE_FAILED', async () => {
        decodeAudioData.mockImplementation((buffer: ArrayBuffer, success: unknown, error: (err: Error) => void) => {
            error(new Error('bad mp3'));
        });

        await expect(decodePcm(new ArrayBuffer(8))).rejects.toBeInstanceOf(WaveformLoadError);
    });
});

describe('probeDecode', () => {
    test('should skip decode when compressed size is over the cap', async () => {
        const decodePcmFn = jest.fn();
        const result = await probeDecode({
            compressedBytes: CLIENT_DECODE_MAX_COMPRESSED_BYTES + 1,
            durationSec: 30,
            decodePcm: decodePcmFn,
        });

        expect(decodePcmFn).not.toHaveBeenCalled();
        expect(result.status).toBe('capped');
        expect(result.isDecodeSkipped).toBe(true);
        expect(result.reason).toBe('compressed_size');
        expect(result.timings.decodeMs).toBeNull();
        if (result.status === 'capped') {
            expect(result.error.code).toBe('CAP_EXCEEDED');
        }
    });

    test('should skip decode when duration is over the cap', async () => {
        const decodePcmFn = jest.fn();
        const result = await probeDecode({
            compressedBytes: 1024,
            durationSec: CLIENT_DECODE_MAX_DURATION_SEC + 1,
            decodePcm: decodePcmFn,
        });

        expect(decodePcmFn).not.toHaveBeenCalled();
        expect(result.status).toBe('capped');
        expect(result.isDecodeSkipped).toBe(true);
        expect(result.reason).toBe('duration');
    });

    test('should skip decode as unavailable when metadata is missing', async () => {
        const decodePcmFn = jest.fn();
        const result = await probeDecode({
            decodePcm: decodePcmFn,
        });

        expect(decodePcmFn).not.toHaveBeenCalled();
        expect(result.status).toBe('unavailable');
        expect(result.isDecodeSkipped).toBe(true);
        expect(result.reason).toBe('missing_metadata');
        expect(result.error && result.error.code).toBe('UNAVAILABLE');
    });

    test('should extract and validate peaks when under the cap', async () => {
        const durationSec = 8;
        const result = await probeDecode({
            compressedBytes: 2048,
            durationSec,
            peakCount: 8,
            decodePcm: async () => ({
                durationSec,
                peakSource: silentPcm(durationSec),
            }),
        });

        expect(result.status).toBe('ready');
        expect(result.isDecodeSkipped).toBe(false);
        expect(result.timings.decodeMs).not.toBeNull();
        expect(result.timings.extractMs).not.toBeNull();
        if (result.status === 'ready') {
            expect(result.payload.peaks).toBeInstanceOf(Float32Array);
            expect(result.payload.peaks.length).toBe(8);
            expect(result.payload.durationSec).toBe(durationSec);
        }
    });

    test('should map named LOAD_FAILED throws without treating them as DECODE_FAILED', async () => {
        const error = new Error('network');
        error.name = 'LOAD_FAILED';
        const result = await probeDecode({
            compressedBytes: 2048,
            durationSec: 8,
            decodePcm: async () => {
                throw error;
            },
        });

        expect(result.status).toBe('failed');
        if (result.status === 'failed') {
            expect(result.error.code).toBe('LOAD_FAILED');
            expect(result.retryable).toBe(true);
        }
    });

    test('should map decode throws to failed DECODE_FAILED', async () => {
        const result = await probeDecode({
            compressedBytes: 2048,
            durationSec: 8,
            decodePcm: async () => {
                throw new WaveformLoadError('DECODE_FAILED', 'decodeAudioData failed');
            },
        });

        expect(result.status).toBe('failed');
        expect(result.isDecodeSkipped).toBe(false);
        if (result.status === 'failed') {
            expect(result.error.code).toBe('DECODE_FAILED');
            expect(result.retryable).toBe(true);
        }
    });

    test('should cancel when the signal is already aborted', async () => {
        const decodePcmFn = jest.fn();
        const controller = new AbortController();
        controller.abort();
        const result = await probeDecode({
            compressedBytes: 2048,
            durationSec: 8,
            decodePcm: decodePcmFn,
            signal: controller.signal,
        });

        expect(decodePcmFn).not.toHaveBeenCalled();
        expect(result.status).toBe('cancelled');
        expect(result.isDecodeSkipped).toBe(true);
    });
});

describe('loadPeaks', () => {
    const audioWindow = window as Window & {
        AudioContext?: unknown;
        webkitAudioContext?: unknown;
    };
    const originalAudioContext = audioWindow.AudioContext;
    const originalWebkitAudioContext = audioWindow.webkitAudioContext;

    beforeEach(() => {
        audioWindow.AudioContext = jest.fn(() => ({
            close: jest.fn().mockResolvedValue(undefined),
            decodeAudioData: (
                buffer: ArrayBuffer,
                success: (decoded: {
                    duration: number;
                    numberOfChannels: number;
                    getChannelData: () => Float32Array;
                }) => void,
            ) => {
                success({
                    duration: 8,
                    numberOfChannels: 1,
                    getChannelData: () => new Float32Array(800),
                });
            },
        }));
        audioWindow.webkitAudioContext = undefined;
    });

    afterEach(() => {
        audioWindow.AudioContext = originalAudioContext;
        audioWindow.webkitAudioContext = originalWebkitAudioContext;
    });

    test('should not fetch or decode when over the compressed size cap', async () => {
        const fetchArrayBuffer = jest.fn();
        const result = await loadPeaks({
            compressedBytes: CLIENT_DECODE_MAX_COMPRESSED_BYTES + 1,
            durationSec: 30,
            fetchArrayBuffer,
        });

        expect(fetchArrayBuffer).not.toHaveBeenCalled();
        expect(result.status).toBe('capped');
        expect(result.isDecodeSkipped).toBe(true);
        expect(result.reason).toBe('compressed_size');
    });

    test('should not fetch or decode when size or duration is missing', async () => {
        const fetchArrayBuffer = jest.fn();
        const result = await loadPeaks({
            durationSec: 30,
            fetchArrayBuffer,
        });

        expect(fetchArrayBuffer).not.toHaveBeenCalled();
        expect(result.status).toBe('unavailable');
        expect(result.reason).toBe('missing_metadata');
        expect(result.error && result.error.code).toBe('UNAVAILABLE');
    });

    test('should fetch, decode, and return validated peaks when under the cap', async () => {
        const durationSec = 8;
        const fetchArrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(16));

        const result = await loadPeaks({
            compressedBytes: 2048,
            durationSec,
            fetchArrayBuffer,
        });

        expect(fetchArrayBuffer).toHaveBeenCalled();
        expect(result.status).toBe('ready');
        if (result.status === 'ready') {
            expect(result.payload.peaks.length).toBeGreaterThan(0);
            expect(result.payload.durationSec).toBe(durationSec);
        }
    });
});
