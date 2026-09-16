import HighResThumbnailStore, { HighResRenderResult, HighResRenderTask } from '../HighResThumbnailStore';

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

interface Deferred<T> {
    promise: Promise<T>;
    reject: (reason?: unknown) => void;
    resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, reject, resolve };
}

describe('HighResThumbnailStore', () => {
    const createResult = (pageNum: number, width: number): HighResRenderResult => ({
        dataUrl: `high-res-${pageNum}-${width}`,
        height: width,
        width,
    });

    test('should admit pages in priority order within the byte budget', async () => {
        const onChange = jest.fn();
        const render = jest.fn(
            (pageNum: number, width: number): HighResRenderTask => ({
                cancel: jest.fn(),
                promise: Promise.resolve(createResult(pageNum, width)),
            }),
        );
        const store = new HighResThumbnailStore({
            maxBytes: 800,
            maxConcurrent: 2,
            maxPages: 10,
            onChange,
            render,
        });

        store.setRetained([3, 2, 1], 10, 1);
        await flushPromises();

        expect(render.mock.calls.map(([pageNum]) => pageNum)).toEqual([3, 2]);
        expect(onChange).toHaveBeenLastCalledWith({
            2: 'high-res-2-10',
            3: 'high-res-3-10',
        });
    });

    test('should evict pages immediately when the retained viewport changes', async () => {
        const onChange = jest.fn();
        const render = jest.fn(
            (pageNum: number, width: number): HighResRenderTask => ({
                cancel: jest.fn(),
                promise: Promise.resolve(createResult(pageNum, width)),
            }),
        );
        const store = new HighResThumbnailStore({
            maxBytes: 800,
            maxConcurrent: 1,
            maxPages: 2,
            onChange,
            render,
        });

        store.setRetained([1], 10, 1);
        await flushPromises();
        store.setRetained([2], 10, 1);

        expect(onChange).toHaveBeenLastCalledWith({});
        await flushPromises();
        expect(onChange).toHaveBeenLastCalledWith({ 2: 'high-res-2-10' });
    });

    test('should keep cancelled work counted until it settles', async () => {
        const renders = new Map<number, { cancel: jest.Mock; result: Deferred<HighResRenderResult | null> }>();
        const render = jest.fn(
            (pageNum: number): HighResRenderTask => {
                const result = deferred<HighResRenderResult | null>();
                const cancel = jest.fn();
                renders.set(pageNum, { cancel, result });
                return { cancel, promise: result.promise };
            },
        );
        const store = new HighResThumbnailStore({
            maxBytes: 800,
            maxConcurrent: 1,
            maxPages: 2,
            onChange: jest.fn(),
            render,
        });

        store.setRetained([1], 10, 1);
        store.setRetained([2], 10, 1);

        expect(renders.get(1)?.cancel).toHaveBeenCalled();
        expect(render).toHaveBeenCalledTimes(1);
        renders.get(1)?.result.reject(new Error('cancelled'));
        await flushPromises();
        expect(render).toHaveBeenLastCalledWith(2, 10);
    });

    test('should not let a stale completion untrack its replacement render', async () => {
        const renders: Array<{
            cancel: jest.Mock;
            result: Deferred<HighResRenderResult | null>;
            width: number;
        }> = [];
        const render = jest.fn(
            (_pageNum: number, width: number): HighResRenderTask => {
                const result = deferred<HighResRenderResult | null>();
                const cancel = jest.fn();
                renders.push({ cancel, result, width });
                return { cancel, promise: result.promise };
            },
        );
        const store = new HighResThumbnailStore({
            maxBytes: 2000,
            maxConcurrent: 2,
            maxPages: 2,
            onChange: jest.fn(),
            render,
        });

        store.setRetained([1], 10, 1);
        store.setRetained([1], 20, 1);

        expect(renders).toHaveLength(2);
        expect(renders[0].cancel).toHaveBeenCalled();
        renders[0].result.reject(new Error('cancelled'));
        await flushPromises();

        store.setRetained([], 20, 1);
        expect(renders[1].cancel).toHaveBeenCalled();
        expect(render).toHaveBeenCalledTimes(2);
    });

    test('should not repeatedly render results that exceed the byte budget', async () => {
        const render = jest.fn(
            (): HighResRenderTask => ({
                cancel: jest.fn(),
                promise: Promise.resolve(createResult(1, 20)),
            }),
        );
        const store = new HighResThumbnailStore({
            maxBytes: 400,
            maxConcurrent: 1,
            maxPages: 1,
            onChange: jest.fn(),
            render,
        });

        store.setRetained([1], 10, 1);
        await flushPromises();
        store.setRetained([1], 10, 1);

        expect(render).toHaveBeenCalledTimes(1);
    });

    test('should retain a narrower canvas rendered for the requested tier', async () => {
        const render = jest.fn(
            (): HighResRenderTask => ({
                cancel: jest.fn(),
                promise: Promise.resolve({
                    dataUrl: 'portrait-page',
                    height: 10,
                    width: 6,
                }),
            }),
        );
        const store = new HighResThumbnailStore({
            maxBytes: 400,
            maxConcurrent: 1,
            maxPages: 1,
            onChange: jest.fn(),
            render,
        });

        store.setRetained([1], 10, 1);
        await flushPromises();
        store.setRetained([1], 10, 1);

        expect(render).toHaveBeenCalledTimes(1);
    });

    test('should cancel work and ignore late results after destroy', async () => {
        const result = deferred<HighResRenderResult | null>();
        const cancel = jest.fn();
        const onChange = jest.fn();
        const store = new HighResThumbnailStore({
            maxBytes: 800,
            maxConcurrent: 1,
            maxPages: 2,
            onChange,
            render: () => ({ cancel, promise: result.promise }),
        });

        store.setRetained([1], 10, 1);
        store.destroy();
        result.resolve(createResult(1, 10));
        await flushPromises();

        expect(cancel).toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
    });
});
