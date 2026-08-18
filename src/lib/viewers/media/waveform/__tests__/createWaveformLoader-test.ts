import readyOverview from '../fixtures/ready-overview-v1.json';
import { createWaveformLoader, WaveformLoadError } from '../createWaveformLoader';

describe('createWaveformLoader', () => {
    test('should load and validate fixture payload', async () => {
        const source = createWaveformLoader(async () => readyOverview);
        const result = await source.load();

        expect(result.status).toBe('ready');
        if (result.status === 'ready') {
            expect(result.payload.peaks.length).toBe(readyOverview.peaks.length);
        }
        expect(source.getState().status).toBe('ready');
    });

    test('should discard stale result when abort is called mid-fetch', async () => {
        let resolveFetch!: (value: unknown) => void;
        const fetchPromise = new Promise<unknown>(resolve => {
            resolveFetch = resolve;
        });

        const source = createWaveformLoader(async () => fetchPromise);
        const pending = source.load();
        source.abort();

        resolveFetch(readyOverview);
        const result = await pending;

        expect(result.status).toBe('cancelled');
        expect(source.getState().status).toBe('cancelled');
    });

    test('should abort the first in-flight request on a second load', async () => {
        let resolveFirst!: (value: unknown) => void;
        const firstFetch = new Promise<unknown>(resolve => {
            resolveFirst = resolve;
        });

        const source = createWaveformLoader(async signal => {
            if (signal.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            return firstFetch;
        });

        const first = source.load();
        const second = source.load();

        resolveFirst(readyOverview);
        const firstResult = await first;
        const secondResult = await second;

        expect(firstResult.status).toBe('cancelled');
        expect(secondResult.status).toBe('ready');
    });

    test('should map generic fetch errors to retryable LOAD_FAILED', async () => {
        const source = createWaveformLoader(async () => {
            throw new Error('network down');
        });
        const result = await source.load();

        expect(result.status).toBe('failed');
        if (result.status === 'failed') {
            expect(result.error.code).toBe('LOAD_FAILED');
            expect(result.retryable).toBe(true);
        }
    });

    test('should map SyntaxError to non-retryable INVALID_PAYLOAD', async () => {
        const source = createWaveformLoader(async () => {
            throw new SyntaxError('Unexpected token');
        });
        const result = await source.load();

        expect(result.status).toBe('failed');
        if (result.status === 'failed') {
            expect(result.error.code).toBe('INVALID_PAYLOAD');
            expect(result.retryable).toBe(false);
        }
    });

    test('should map DECODE_FAILED when thrown error uses that name', async () => {
        const source = createWaveformLoader(async () => {
            const error = new Error('decodeAudioData failed');
            error.name = 'DECODE_FAILED';
            throw error;
        });
        const result = await source.load();

        expect(result.status).toBe('failed');
        if (result.status === 'failed') {
            expect(result.error.code).toBe('DECODE_FAILED');
            expect(result.retryable).toBe(true);
        }
    });

    test('should leave ready state when abort is called after success', async () => {
        const source = createWaveformLoader(async () => readyOverview);
        await source.load();
        source.abort();
        expect(source.getState().status).toBe('ready');
    });

    test('should not let a stale fetch overwrite a newer ready state', async () => {
        let resolveFirst!: (value: unknown) => void;
        const firstFetch = new Promise<unknown>(resolve => {
            resolveFirst = resolve;
        });

        let call = 0;
        const source = createWaveformLoader(async () => {
            call += 1;
            if (call === 1) {
                return firstFetch;
            }
            return readyOverview;
        });

        const first = source.load();
        const secondResult = await source.load();

        expect(secondResult.status).toBe('ready');
        expect(source.getState().status).toBe('ready');

        resolveFirst({ version: 1, durationSec: 99, peaks: [0.9] });
        const firstResult = await first;
        const afterStale = source.getState();

        expect(firstResult.status).toBe('cancelled');
        expect(afterStale.status).toBe('ready');
        if (afterStale.status === 'ready') {
            expect(afterStale.payload.durationSec).toBe(readyOverview.durationSec);
        }
    });

    test('should map a returned invalid payload to non-retryable INVALID_PAYLOAD', async () => {
        const source = createWaveformLoader(async () => ({ version: 1 }));
        const result = await source.load();

        expect(result.status).toBe('failed');
        if (result.status === 'failed') {
            expect(result.error.code).toBe('INVALID_PAYLOAD');
            expect(result.retryable).toBe(false);
        }
    });

    test('should map WaveformLoadError codes from fetchPayload', async () => {
        const source = createWaveformLoader(async () => {
            throw new WaveformLoadError('DECODE_FAILED', 'decodeAudioData failed');
        });
        const result = await source.load();

        expect(result.status).toBe('failed');
        if (result.status === 'failed') {
            expect(result.error.code).toBe('DECODE_FAILED');
            expect(result.retryable).toBe(true);
        }
    });
});
