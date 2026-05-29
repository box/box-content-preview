import * as React from 'react';
import { BoxFile, BoxRepresentation, BoxToken, ViewerError } from '../../../../types/viewer';

const DEFAULT_HOST = 'https://api.box.com';
const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 30;

export interface UseRepresentationOptions {
    fileId: string;
    token: BoxToken;
    representationType: string;
    repHints?: string;
    host?: string;
    enabled?: boolean;
}

export interface UseRepresentationResult {
    status: 'idle' | 'loading' | 'ready' | 'error';
    src: string | null;
    file: BoxFile | null;
    error: ViewerError | null;
    retry: () => void;
}

async function resolveToken(token: BoxToken): Promise<string> {
    return typeof token === 'function' ? token() : token;
}

function pickRepresentation(file: BoxFile, type: string): BoxRepresentation | null {
    const entries = file.representations?.entries ?? [];
    return entries.find(entry => entry.representation === type) ?? null;
}

function buildAssetUrl(rep: BoxRepresentation, assetPath = ''): string {
    return rep.content.url_template.replace('{+asset_path}', assetPath);
}

export default function useRepresentation({
    fileId,
    token,
    representationType,
    repHints,
    host = DEFAULT_HOST,
    enabled = true,
}: UseRepresentationOptions): UseRepresentationResult {
    const [status, setStatus] = React.useState<UseRepresentationResult['status']>('idle');
    const [src, setSrc] = React.useState<string | null>(null);
    const [file, setFile] = React.useState<BoxFile | null>(null);
    const [error, setError] = React.useState<ViewerError | null>(null);
    const [attempt, setAttempt] = React.useState(0);

    React.useEffect(() => {
        if (!enabled || !fileId) {
            return undefined;
        }

        const controller = new AbortController();
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;

        async function fetchFile(authToken: string): Promise<BoxFile> {
            const url = `${host}/2.0/files/${fileId}?fields=representations`;
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'X-Rep-Hints': repHints ?? `[${representationType}]`,
                },
                signal: controller.signal,
            });
            if (!response.ok) {
                throw Object.assign(new Error(`File fetch failed: ${response.status}`), {
                    code: 'fetch_file_failed',
                    status: response.status,
                });
            }
            return response.json();
        }

        async function pollStatus(rep: BoxRepresentation, authToken: string): Promise<BoxRepresentation> {
            if (rep.status.state === 'success' || rep.status.state === 'viewable') {
                return rep;
            }
            if (rep.status.state === 'error' || !rep.info?.url) {
                throw Object.assign(new Error('Representation generation failed'), {
                    code: 'representation_error',
                });
            }
            /* eslint-disable no-await-in-loop, no-loop-func */
            for (let i = 0; i < MAX_POLL_ATTEMPTS; i += 1) {
                await new Promise<void>(resolve => {
                    pollTimer = setTimeout(resolve, POLL_INTERVAL_MS);
                });
                if (cancelled) {
                    throw Object.assign(new Error('cancelled'), { code: 'cancelled' });
                }
                const response = await fetch(rep.info.url, {
                    headers: { Authorization: `Bearer ${authToken}` },
                    signal: controller.signal,
                });
                if (!response.ok) {
                    throw Object.assign(new Error(`Status poll failed: ${response.status}`), {
                        code: 'status_poll_failed',
                    });
                }
                const updated: BoxRepresentation = await response.json();
                if (updated.status.state === 'success' || updated.status.state === 'viewable') {
                    return updated;
                }
                if (updated.status.state === 'error') {
                    throw Object.assign(new Error('Representation generation failed'), {
                        code: 'representation_error',
                    });
                }
            }
            /* eslint-enable no-await-in-loop, no-loop-func */
            throw Object.assign(new Error('Representation polling timed out'), {
                code: 'representation_timeout',
            });
        }

        async function load(): Promise<void> {
            try {
                setStatus('loading');
                setError(null);
                const authToken = await resolveToken(token);
                const fetchedFile = await fetchFile(authToken);
                if (cancelled) return;
                setFile(fetchedFile);

                const rep = pickRepresentation(fetchedFile, representationType);
                if (!rep) {
                    throw Object.assign(new Error(`No ${representationType} representation`), {
                        code: 'representation_unavailable',
                    });
                }

                const ready = await pollStatus(rep, authToken);
                if (cancelled) return;

                const url = buildAssetUrl(ready);
                const authedUrl = `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(authToken)}`;
                setSrc(authedUrl);
                setStatus('ready');
            } catch (caughtError) {
                if (cancelled) return;
                const err = caughtError as { code?: string; message?: string };
                if (err.code === 'cancelled') return;
                setError({
                    code: err.code ?? 'unknown',
                    message: err.message ?? 'Failed to load representation',
                    cause: caughtError,
                });
                setStatus('error');
            }
        }

        load();

        return () => {
            cancelled = true;
            controller.abort();
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [enabled, fileId, host, repHints, representationType, token, attempt]);

    const retry = React.useCallback(() => setAttempt(prev => prev + 1), []);

    return { status, src, file, error, retry };
}
