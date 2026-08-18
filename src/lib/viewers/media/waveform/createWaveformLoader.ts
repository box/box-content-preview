import {
    isWaveformErrorCode,
    WaveformError,
    WaveformErrorCode,
    WaveformLoadState,
    WaveformSource,
    WaveformValidationOptions,
} from './types';
import { isRetryableWaveformError, validateWaveformPayload } from './validateWaveformPayload';

export type CreateWaveformLoaderOptions = WaveformValidationOptions;

/** Typed throw from fetchPayload (e.g. client decode). `error.name` fallback still works. */
export class WaveformLoadError extends Error {
    readonly code: WaveformErrorCode;

    constructor(code: WaveformErrorCode, message: string) {
        super(message);
        this.name = code;
        this.code = code;
    }
}

function isAbortError(error: unknown): boolean {
    return (
        (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError')
    );
}

function errorFromUnknown(error: unknown): WaveformError {
    if (error instanceof WaveformLoadError) {
        return { code: error.code, message: error.message };
    }

    if (error instanceof SyntaxError) {
        return { code: 'INVALID_PAYLOAD', message: error.message };
    }

    if (error instanceof Error && isWaveformErrorCode(error.name)) {
        return { code: error.name, message: error.message };
    }

    const message = error instanceof Error ? error.message : 'Waveform load failed';
    return { code: 'LOAD_FAILED', message };
}

/**
 * Wraps an async payload fetch with abort + stale-result suppression.
 * Playback must not depend on this completing — callers treat unavailable/failed as degrade paths.
 * abort() cancels an in-flight load only; a successful ready state is left intact.
 */
export function createWaveformLoader(
    fetchPayload: (signal: AbortSignal) => Promise<unknown>,
    options: CreateWaveformLoaderOptions = {},
): WaveformSource {
    let state: WaveformLoadState = { status: 'unavailable' };
    let generation = 0;
    let abortController: AbortController | null = null;

    const setState = (next: WaveformLoadState) => {
        state = next;
    };

    const load = async (): Promise<WaveformLoadState> => {
        if (abortController) {
            abortController.abort();
        }

        const currentGeneration = generation + 1;
        generation = currentGeneration;
        abortController = new AbortController();
        const { signal } = abortController;

        setState({ status: 'pending' });

        const cancelledIfStale = (): WaveformLoadState | null => {
            if (!signal.aborted && generation === currentGeneration) {
                return null;
            }
            if (generation === currentGeneration) {
                setState({ status: 'cancelled' });
            }
            return { status: 'cancelled' };
        };

        try {
            const raw = await fetchPayload(signal);

            const staleAfterFetch = cancelledIfStale();
            if (staleAfterFetch) {
                return staleAfterFetch;
            }

            const validation = validateWaveformPayload(raw, options);

            const staleAfterValidate = cancelledIfStale();
            if (staleAfterValidate) {
                return staleAfterValidate;
            }

            if (!validation.ok) {
                const failed: WaveformLoadState = {
                    status: 'failed',
                    error: validation.error,
                    retryable: isRetryableWaveformError(validation.error.code),
                };
                setState(failed);
                return failed;
            }

            const ready: WaveformLoadState = {
                status: 'ready',
                payload: validation.payload,
            };
            setState(ready);
            return ready;
        } catch (error) {
            if (signal.aborted || generation !== currentGeneration || isAbortError(error)) {
                if (generation === currentGeneration) {
                    setState({ status: 'cancelled' });
                }
                return { status: 'cancelled' };
            }

            const waveformError = errorFromUnknown(error);
            const failed: WaveformLoadState = {
                status: 'failed',
                error: waveformError,
                retryable: isRetryableWaveformError(waveformError.code),
            };
            setState(failed);
            return failed;
        } finally {
            if (generation === currentGeneration) {
                abortController = null;
            }
        }
    };

    const abort = () => {
        if (!abortController) {
            return;
        }
        generation += 1;
        abortController.abort();
        abortController = null;
        setState({ status: 'cancelled' });
    };

    return {
        load,
        abort,
        getState: () => state,
    };
}

/** Returns capped state when media exceeds client beta envelope before decode. */
export function createCappedWaveformState(message: string): WaveformLoadState {
    return {
        status: 'capped',
        error: { code: 'CAP_EXCEEDED', message },
    };
}
