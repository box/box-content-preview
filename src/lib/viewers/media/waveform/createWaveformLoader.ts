import {
    isWaveformErrorCode,
    NormalizedWaveformPayload,
    WaveformError,
    WaveformErrorCode,
    WaveformLoadState,
    WaveformSource,
    WaveformValidationOptions,
} from './types';
import { isRetryableWaveformError, validateWaveformPayload, WaveformValidationResult } from './validateWaveformPayload';

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

type LoadGeneration = {
    id: number;
    signal: AbortSignal;
};

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

function failedLoadState(error: WaveformError): WaveformLoadState {
    return {
        status: 'failed',
        error,
        retryable: isRetryableWaveformError(error.code),
    };
}

function readyLoadState(payload: NormalizedWaveformPayload): WaveformLoadState {
    return { status: 'ready', payload };
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

    const settle = (next: WaveformLoadState): WaveformLoadState => {
        setState(next);
        return next;
    };

    const startLoad = (): LoadGeneration => {
        if (abortController) {
            abortController.abort();
        }

        generation += 1;
        abortController = new AbortController();
        setState({ status: 'pending' });
        return { id: generation, signal: abortController.signal };
    };

    const cancelledIfStale = (request: LoadGeneration): WaveformLoadState | null => {
        if (!request.signal.aborted && generation === request.id) {
            return null;
        }
        if (generation === request.id) {
            setState({ status: 'cancelled' });
        }
        return { status: 'cancelled' };
    };

    const settleValidation = (validation: WaveformValidationResult): WaveformLoadState => {
        if (!validation.ok) {
            return settle(failedLoadState(validation.error));
        }
        return settle(readyLoadState(validation.payload));
    };

    const settleFetchError = (error: unknown, request: LoadGeneration): WaveformLoadState => {
        if (request.signal.aborted || generation !== request.id || isAbortError(error)) {
            if (generation === request.id) {
                return settle({ status: 'cancelled' });
            }
            return { status: 'cancelled' };
        }
        return settle(failedLoadState(errorFromUnknown(error)));
    };

    const load = async (): Promise<WaveformLoadState> => {
        const request = startLoad();

        try {
            const raw = await fetchPayload(request.signal);

            const staleAfterFetch = cancelledIfStale(request);
            if (staleAfterFetch) {
                return staleAfterFetch;
            }

            const validation = validateWaveformPayload(raw, options);

            const staleAfterValidate = cancelledIfStale(request);
            if (staleAfterValidate) {
                return staleAfterValidate;
            }

            return settleValidation(validation);
        } catch (error) {
            return settleFetchError(error, request);
        } finally {
            if (generation === request.id) {
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

/** Returns capped state when media exceeds client decode size or duration limits. */
export function createCappedWaveformState(message: string): WaveformLoadState {
    return {
        status: 'capped',
        error: { code: 'CAP_EXCEEDED', message },
    };
}
