const MAX_PREFETCHED_SEGMENTS = 4;
// A failed prefetch isn't retried; the player fetches the segment itself on seek
const PREFETCH_RETRY_PARAMETERS = {
    backoffFactor: 2,
    baseDelay: 0,
    connectionTimeout: 0,
    fuzzFactor: 0,
    maxAttempts: 1,
    stallTimeout: 0,
    timeout: 0,
};

type ShakaRequest = { uris: string[] };
type ShakaResponse = { data: ArrayBuffer; fromCache?: boolean; originalRequest?: ShakaRequest; uri: string };
type AbortableOperation = { abort: () => Promise<void>; promise: Promise<ShakaResponse> };
type HeadersCallback = (headers: Record<string, string>) => void;
type ProgressCallback = (timeElapsedMs: number, bytesLoaded: number, bytesRemaining: number) => void;
type SchemePluginConfig = { minBytesForProgressEvents?: number };
type SchemePlugin = (
    uri: string,
    request: ShakaRequest,
    requestType: number,
    onProgress: ProgressCallback,
    onHeadersReceived: HeadersCallback,
    config: SchemePluginConfig,
) => AbortableOperation;
type Prefetch = {
    headers?: Record<string, string>;
    operation: AbortableOperation;
    waitingRequest?: { onHeadersReceived: HeadersCallback; onProgress: ProgressCallback };
};
type SegmentReference = {
    getEndByte: () => number | null;
    getStartByte: () => number;
    getUris: () => string[];
};
type Stream = {
    segmentIndex: {
        find: (time: number) => number | null;
        get: (position: number) => SegmentReference | null;
    } | null;
};
type Variant = { audio: Stream | null; id: number; video: Stream | null };
type ShakaPlayer = {
    getManifest: () => { variants: Variant[] } | null;
    getNetworkingEngine: () => { request: (type: number, request: ShakaRequest) => AbortableOperation } | null;
    getVariantTracks: () => { active: boolean; id: number }[];
};

declare const shaka: {
    net: {
        HttpFetchPlugin: { parse: SchemePlugin };
        NetworkingEngine: {
            makeRequest: (uris: string[], retryParameters: typeof PREFETCH_RETRY_PARAMETERS) => ShakaRequest;
            PluginPriority: { APPLICATION: number };
            registerScheme: (scheme: string, plugin: SchemePlugin, priority: number, progressSupport: boolean) => void;
            RequestType: { SEGMENT: number };
        };
    };
    util: {
        AbortableOperation: new (promise: Promise<ShakaResponse>, onAbort: () => Promise<void>) => AbortableOperation;
    };
};

/** Keyed by the URI the scheme plugin receives, after request filters */
const prefetches = new Map<string, Prefetch>();
/**
 * Manifest URIs already prefetched, so returning to a segment doesn't refetch it. Each maps to its request,
 * so a replaced request's failure doesn't clear the marker of the request that replaced it.
 */
const prefetchedUris = new Map<string, ShakaRequest>();
// Shaka passes the request object it was given through to the scheme plugin
const prefetchRequests = new WeakSet<ShakaRequest>();
let isCachingFetchPluginRegistered = false;

function evictOldestUris(): void {
    while (prefetchedUris.size > MAX_PREFETCHED_SEGMENTS) {
        prefetchedUris.delete(prefetchedUris.keys().next().value as string);
    }
}

function evictOldestPrefetches(): void {
    while (prefetches.size > MAX_PREFETCHED_SEGMENTS) {
        const [uri, prefetch] = prefetches.entries().next().value as [string, Prefetch];
        prefetches.delete(uri);
        prefetch.operation.abort();
    }
}

/**
 * Serves a prefetched segment once to the player's next request for its URI, falling back to a real
 * fetch if the prefetch fails. fromCache keeps Shaka from counting it toward bandwidth.
 */
function cachingFetchPlugin(
    uri: string,
    request: ShakaRequest,
    requestType: number,
    onProgress: ProgressCallback,
    onHeadersReceived: HeadersCallback,
    config: SchemePluginConfig,
): AbortableOperation {
    const fetchSegment = (): AbortableOperation =>
        shaka.net.HttpFetchPlugin.parse(uri, request, requestType, onProgress, onHeadersReceived, config);
    const isSegment = requestType === shaka.net.NetworkingEngine.RequestType.SEGMENT;
    const prefetched = isSegment && !prefetchRequests.has(request) ? prefetches.get(uri) : undefined;

    if (prefetched) {
        prefetches.delete(uri);
        // Shaka times out a request that reports no headers or progress, so the waiting request gets the prefetch's
        prefetched.waitingRequest = { onHeadersReceived, onProgress };
        if (prefetched.headers) {
            onHeadersReceived(prefetched.headers);
        }

        let fallback: AbortableOperation | undefined;
        let isAborted = false;

        return new shaka.util.AbortableOperation(
            prefetched.operation.promise.then(
                response => ({ ...response, fromCache: true, originalRequest: request }),
                error => {
                    if (isAborted) {
                        throw error;
                    }
                    fallback = fetchSegment();
                    return fallback.promise;
                },
            ),
            () => {
                isAborted = true;
                return (fallback ?? prefetched.operation).abort();
            },
        );
    }

    if (!prefetchRequests.has(request)) {
        return fetchSegment();
    }

    const prefetch = {} as Prefetch;
    prefetch.operation = shaka.net.HttpFetchPlugin.parse(
        uri,
        request,
        requestType,
        (timeElapsedMs, bytesLoaded, bytesRemaining) => {
            onProgress(timeElapsedMs, bytesLoaded, bytesRemaining);
            // Zero bytes keeps the waiting request's timeouts alive without a second bandwidth sample
            prefetch.waitingRequest?.onProgress(timeElapsedMs, 0, bytesRemaining);
        },
        headers => {
            onHeadersReceived(headers);
            prefetch.headers = headers;
            prefetch.waitingRequest?.onHeadersReceived(headers);
        },
        config,
    );
    prefetches.set(uri, prefetch);
    evictOldestPrefetches();
    prefetch.operation.promise.catch(() => {
        if (prefetches.get(uri) === prefetch) {
            prefetches.delete(uri);
        }
    });

    return prefetch.operation;
}

function registerCachingFetchPlugin(): void {
    if (isCachingFetchPluginRegistered) {
        return;
    }

    const { NetworkingEngine } = shaka.net;
    ['http', 'https'].forEach(scheme => {
        NetworkingEngine.registerScheme(
            scheme,
            cachingFetchPlugin,
            NetworkingEngine.PluginPriority.APPLICATION,
            /* progressSupport= */ true,
        );
    });
    isCachingFetchPluginRegistered = true;
}

function getActiveVariant(player: ShakaPlayer): Variant | undefined {
    const activeTrack = player.getVariantTracks().find(track => track.active);
    const manifest = player.getManifest();

    return activeTrack && manifest ? manifest.variants.find(variant => variant.id === activeTrack.id) : undefined;
}

/** Starts downloading the active variant's video and audio segments that contain a time. */
export function prefetchSegmentsAt(player: ShakaPlayer, time: number): void {
    const networkingEngine = player.getNetworkingEngine();
    const variant = getActiveVariant(player);
    if (!networkingEngine || !variant) {
        return;
    }

    registerCachingFetchPlugin();

    [variant.video, variant.audio].forEach(stream => {
        const segmentIndex = stream?.segmentIndex;
        const position = segmentIndex ? segmentIndex.find(time) : null;
        const reference = segmentIndex && position !== null ? segmentIndex.get(position) : null;

        // Byte-range segments share a URI, so they can't be matched to the player's later request
        if (!reference || reference.getStartByte() !== 0 || reference.getEndByte() !== null) {
            return;
        }

        const uris = reference.getUris();
        const [uri] = uris;
        if (prefetchedUris.has(uri)) {
            return;
        }
        const request = shaka.net.NetworkingEngine.makeRequest(uris, PREFETCH_RETRY_PARAMETERS);
        prefetchRequests.add(request);
        prefetchedUris.set(uri, request);
        evictOldestUris();

        networkingEngine.request(shaka.net.NetworkingEngine.RequestType.SEGMENT, request).promise.catch(() => {
            if (prefetchedUris.get(uri) === request) {
                prefetchedUris.delete(uri);
            }
        });
    });
}

export function clearPrefetchedSegments(): void {
    prefetches.clear();
    prefetchedUris.clear();
}
