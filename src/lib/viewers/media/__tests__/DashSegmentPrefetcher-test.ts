import { MEDIA_STATIC_ASSETS_VERSION } from '../../../constants';
import { clearPrefetchedSegments, prefetchSegmentsAt } from '../DashSegmentPrefetcher';

// eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires
const shaka = require(`../../../../third-party/media/${MEDIA_STATIC_ASSETS_VERSION}/shaka-player.compiled.js`);

const { RequestType } = shaka.net.NetworkingEngine;

type Player = Parameters<typeof prefetchSegmentsAt>[0];
type Request = { retryParameters: { maxAttempts: number }; uris: string[] };
type Reference = {
    getEndByte: () => number | null;
    getStartByte: () => number;
    getUris: () => string[];
    timestampOffset: number;
};

const createReference = (uri: string, { startByte = 0, endByte = null as number | null } = {}): Reference => ({
    getEndByte: () => endByte,
    getStartByte: () => startByte,
    getUris: () => [uri],
    timestampOffset: -10,
});

const createStream = (references: Reference[]) => ({
    codecs: 'avc1.64001f',
    id: 1,
    mimeType: 'video/mp4',
    type: 'video',
    segmentIndex: {
        find: (time: number) => (references[Math.floor(time / 5)] ? Math.floor(time / 5) : null),
        get: (position: number) => references[position],
    },
});

const createOperation = (promise: Promise<unknown>, onAbort = () => Promise.resolve()) =>
    new shaka.util.AbortableOperation(promise, onAbort);

describe('lib/viewers/media/DashSegmentPrefetcher', () => {
    let httpsPlugin: (...args: unknown[]) => { abort: () => Promise<void>; promise: Promise<unknown> };
    let networkingEngine: { request: jest.Mock };
    let player: Player;

    const request = (type: number, shakaRequest: Request) =>
        httpsPlugin(
            `${shakaRequest.uris[0]}?signed`,
            shakaRequest,
            type,
            () => {},
            () => {},
            {},
        );
    const requestAsPlayer = (uri: string) =>
        request(RequestType.SEGMENT, shaka.net.NetworkingEngine.makeRequest([uri], {}));
    const flushPromises = () =>
        new Promise(resolve => {
            setTimeout(resolve, 0);
        });

    beforeAll(() => {
        (global as unknown as { shaka: unknown }).shaka = shaka;
    });

    beforeEach(() => {
        // The plugin registers only on the first prefetch in the file, so every test captures it from that spy
        jest.spyOn(shaka.net.NetworkingEngine, 'registerScheme').mockImplementation((...args: unknown[]) => {
            const [scheme, plugin] = args as [string, typeof httpsPlugin];
            if (scheme === 'https') {
                httpsPlugin = plugin;
            }
        });
        jest.spyOn(shaka.net.HttpFetchPlugin, 'parse').mockImplementation((uri: unknown) =>
            createOperation(Promise.resolve({ data: new ArrayBuffer(8), headers: {}, timeMs: 10, uri })),
        );
        networkingEngine = { request: jest.fn((type: number, shakaRequest: Request) => request(type, shakaRequest)) };
        player = {
            getManifest: () => ({
                variants: [
                    {
                        audio: createStream([createReference('https://box.test/audio/0.m4s')]),
                        id: 7,
                        video: createStream([
                            createReference('https://box.test/video/0.m4s'),
                            createReference('https://box.test/video/1.m4s'),
                        ]),
                    },
                ],
            }),
            getNetworkingEngine: () => networkingEngine,
            getVariantTracks: () => [{ active: true, id: 7 }],
        };
    });

    afterEach(() => {
        clearPrefetchedSegments();
    });

    test('should prefetch the video and audio segments at a time with a single attempt', () => {
        prefetchSegmentsAt(player, 2);

        const requests = networkingEngine.request.mock.calls as [number, Request][];
        expect(requests.map(([type, { uris }]) => [type, uris])).toEqual([
            [RequestType.SEGMENT, ['https://box.test/video/0.m4s']],
            [RequestType.SEGMENT, ['https://box.test/audio/0.m4s']],
        ]);
        expect(requests[0][1].retryParameters.maxAttempts).toBe(1);
    });

    test('should serve the prefetched response to the player once, without counting it toward bandwidth', async () => {
        prefetchSegmentsAt(player, 6);
        shaka.net.HttpFetchPlugin.parse.mockClear();

        const playerRequest = shaka.net.NetworkingEngine.makeRequest(['https://box.test/video/1.m4s'], {});
        const response = await request(RequestType.SEGMENT, playerRequest).promise;

        expect(shaka.net.HttpFetchPlugin.parse).not.toHaveBeenCalled();
        expect(response).toMatchObject({ fromCache: true, originalRequest: playerRequest });

        await request(RequestType.SEGMENT, playerRequest).promise;
        expect(shaka.net.HttpFetchPlugin.parse).toHaveBeenCalledTimes(1);
    });

    test('should fetch the segment for the player if the prefetch it waits on fails', async () => {
        let rejectPrefetch: (error: Error) => void = () => {};
        shaka.net.HttpFetchPlugin.parse.mockImplementationOnce(() =>
            createOperation(
                new Promise((resolve, reject) => {
                    rejectPrefetch = reject;
                }),
            ),
        );
        prefetchSegmentsAt(player, 6);

        const operation = requestAsPlayer('https://box.test/video/1.m4s');
        rejectPrefetch(new Error('offline'));

        await expect(operation.promise).resolves.toMatchObject({ uri: 'https://box.test/video/1.m4s?signed' });
        expect(shaka.net.HttpFetchPlugin.parse).toHaveBeenCalledTimes(2);
    });

    test('should pass the in-flight prefetch headers and progress to the player request waiting on it', () => {
        let reportProgress: (...args: unknown[]) => void = () => {};
        let receiveHeaders: (headers: Record<string, string>) => void = () => {};
        shaka.net.HttpFetchPlugin.parse.mockImplementationOnce(
            (
                uri: string,
                req: unknown,
                type: number,
                onProgress: typeof reportProgress,
                onHeaders: typeof receiveHeaders,
            ) => {
                reportProgress = onProgress;
                receiveHeaders = onHeaders;
                return createOperation(new Promise(() => {}));
            },
        );
        prefetchSegmentsAt(player, 6);
        receiveHeaders({ 'content-type': 'video/mp4' });

        const onProgress = jest.fn();
        const onHeadersReceived = jest.fn();
        httpsPlugin(
            'https://box.test/video/1.m4s?signed',
            shaka.net.NetworkingEngine.makeRequest(['https://box.test/video/1.m4s'], {}),
            RequestType.SEGMENT,
            onProgress,
            onHeadersReceived,
            {},
        );
        reportProgress(20, 1024, 2048);

        expect(onHeadersReceived).toHaveBeenCalledWith({ 'content-type': 'video/mp4' });
        expect(onProgress).toHaveBeenCalledWith(20, 0, 2048);
    });

    test('should abort the prefetch the player waits on without fetching again', async () => {
        let rejectPrefetch: (error: Error) => void = () => {};
        const abortPrefetch = jest.fn(() => {
            rejectPrefetch(new Error('aborted'));
            return Promise.resolve();
        });
        shaka.net.HttpFetchPlugin.parse.mockImplementationOnce(() =>
            createOperation(
                new Promise((resolve, reject) => {
                    rejectPrefetch = reject;
                }),
                abortPrefetch,
            ),
        );
        prefetchSegmentsAt(player, 6);

        const operation = requestAsPlayer('https://box.test/video/1.m4s');
        operation.abort();

        await expect(operation.promise).rejects.toThrow();
        expect(abortPrefetch).toHaveBeenCalled();
        expect(shaka.net.HttpFetchPlugin.parse).toHaveBeenCalledTimes(1);
    });

    test('should prefetch a segment again after its prefetch failed', async () => {
        shaka.net.HttpFetchPlugin.parse.mockImplementationOnce(() =>
            createOperation(Promise.reject(new Error('offline'))),
        );
        prefetchSegmentsAt(player, 6);
        await flushPromises();

        prefetchSegmentsAt(player, 6);

        expect(networkingEngine.request).toHaveBeenCalledTimes(2);
    });

    test('should abort the oldest unclaimed prefetch once the cache is full', () => {
        const abortPrefetch = jest.fn(() => Promise.resolve());
        shaka.net.HttpFetchPlugin.parse.mockImplementationOnce(() =>
            createOperation(new Promise(() => {}), abortPrefetch),
        );
        const references = [0, 1, 2, 3, 4].map(i => createReference(`https://box.test/video/${i}.m4s`));
        player.getManifest = () => ({ variants: [{ audio: null, id: 7, video: createStream(references) }] });

        [0, 5, 10, 15].forEach(time => prefetchSegmentsAt(player, time));
        expect(abortPrefetch).not.toHaveBeenCalled();

        prefetchSegmentsAt(player, 20);
        expect(abortPrefetch).toHaveBeenCalled();
    });

    test('should pass the downloaded video segment to onVideoSegmentLoaded', async () => {
        const onVideoSegmentLoaded = jest.fn();

        prefetchSegmentsAt(player, 2, onVideoSegmentLoaded);
        await flushPromises();

        expect(onVideoSegmentLoaded).toHaveBeenCalledTimes(1);
        expect(onVideoSegmentLoaded).toHaveBeenCalledWith(
            expect.objectContaining({ id: 1 }),
            expect.any(ArrayBuffer),
            -10,
        );
    });

    test('should keep the marker of a segment re-requested after its evicted prefetch is aborted', async () => {
        shaka.net.HttpFetchPlugin.parse.mockImplementation(() => {
            let rejectPrefetch: (error: Error) => void = () => {};
            const promise = new Promise((resolve, reject) => {
                rejectPrefetch = reject;
            });
            return createOperation(promise, () => {
                rejectPrefetch(new Error('aborted'));
                return Promise.resolve();
            });
        });
        const audioUri = 'https://box.test/audio/0.m4s';
        const longAudio = createStream([createReference(audioUri)]);
        longAudio.segmentIndex.find = () => 0;
        const video = createStream([0, 1, 2, 3, 4].map(i => createReference(`https://box.test/video/${i}.m4s`)));
        player.getManifest = () => ({ variants: [{ audio: longAudio, id: 7, video }] });

        // The fifth video segment evicts the audio marker and its prefetch, then the audio is requested again
        [0, 5, 10, 15, 20].forEach(time => prefetchSegmentsAt(player, time));
        await flushPromises();
        prefetchSegmentsAt(player, 20);

        const requests = networkingEngine.request.mock.calls as [number, Request][];
        expect(requests.filter(([, { uris }]) => uris[0] === audioUri)).toHaveLength(2);
    });

    test('should not prefetch a segment twice', () => {
        prefetchSegmentsAt(player, 6);
        prefetchSegmentsAt(player, 7);

        const requests = networkingEngine.request.mock.calls as [number, Request][];
        expect(requests.map(([, { uris }]) => uris[0])).toEqual(['https://box.test/video/1.m4s']);
    });

    test('should skip byte-range segments and times past the end', () => {
        player.getManifest = () => ({
            variants: [
                {
                    audio: null,
                    id: 7,
                    video: createStream([createReference('https://box.test/video.mp4', { endByte: 99 })]),
                },
            ],
        });

        prefetchSegmentsAt(player, 2);
        prefetchSegmentsAt(player, 60);

        expect(networkingEngine.request).not.toHaveBeenCalled();
    });

    test('should do nothing before the manifest loads or after the player unloads', () => {
        prefetchSegmentsAt({ ...player, getManifest: () => null }, 2);
        prefetchSegmentsAt({ ...player, getNetworkingEngine: () => null }, 2);

        expect(networkingEngine.request).not.toHaveBeenCalled();
    });
});
