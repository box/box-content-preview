import PrefetchedFrameVideo, { VideoStream } from '../PrefetchedFrameVideo';

type Filter = (type: number, response: { data: BufferSource }, context?: unknown) => void;

type MockSourceBuffer = EventTarget & {
    appended: Uint8Array[];
    appendBuffer: (data: Uint8Array) => void;
    timestampOffset: number;
};

const createSourceBuffer = (): MockSourceBuffer => {
    const sourceBuffer = Object.assign(new EventTarget(), {
        appended: [] as Uint8Array[],
        appendBuffer: (data: Uint8Array) => {
            sourceBuffer.appended.push(data);
            Promise.resolve().then(() => sourceBuffer.dispatchEvent(new Event('updateend')));
        },
        timestampOffset: 0,
    });
    return sourceBuffer;
};

class MockMediaSource extends EventTarget {
    addSourceBuffer = jest.fn(() => this.sourceBuffer);

    sourceBuffer = createSourceBuffer();
}

describe('lib/viewers/media/PrefetchedFrameVideo', () => {
    const stream: VideoStream = { codecs: 'avc1.64001f', id: 1, mimeType: 'video/mp4', type: 'video' };
    const bytes = (...values: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(values);
    let filter: Filter;
    let frameVideo: PrefetchedFrameVideo;
    let networkingEngine: { registerResponseFilter: jest.Mock; unregisterResponseFilter: jest.Mock };
    let onFrameReady: jest.Mock;

    const getSourceBuffer = (): MockSourceBuffer => (frameVideo.mediaSource as unknown as MockMediaSource).sourceBuffer;
    const loadInitSegment = (data: Uint8Array<ArrayBuffer>, initStream: VideoStream = stream, type = 0): void =>
        filter(1, { data }, { stream: initStream, type });
    const setVideoProp = (name: string, value: unknown): void => {
        Object.defineProperty(frameVideo.videoEl, name, { configurable: true, value, writable: true });
    };

    beforeEach(() => {
        Object.assign(global, { MediaSource: MockMediaSource });
        Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:frames'), revokeObjectURL: jest.fn() });
        jest.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation();
        networkingEngine = {
            registerResponseFilter: jest.fn(registered => {
                filter = registered;
            }),
            unregisterResponseFilter: jest.fn(),
        };
        onFrameReady = jest.fn();
        frameVideo = new PrefetchedFrameVideo({ networkingEngine, onFrameReady });
        frameVideo.mediaSource.dispatchEvent(new Event('sourceopen'));
    });

    afterEach(() => {
        Object.assign(global, { MediaSource: undefined });
    });

    test('should be supported only where MediaSource exists', () => {
        expect(PrefetchedFrameVideo.isSupported()).toBe(true);

        Object.assign(global, { MediaSource: undefined });
        expect(PrefetchedFrameVideo.isSupported()).toBe(false);
    });

    test('should append the init segment once, then each prefetched segment', async () => {
        loadInitSegment(bytes(1));
        frameVideo.addSegment(stream, bytes(2));
        frameVideo.addSegment(stream, bytes(3));
        await frameVideo.appendQueue;

        expect(frameVideo.mediaSource.addSourceBuffer).toHaveBeenCalledWith('video/mp4; codecs="avc1.64001f"');
        expect(getSourceBuffer().appended).toEqual([bytes(1), bytes(2), bytes(3)]);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:frames');
    });

    test('should append the new init segment when the quality changes', async () => {
        const hdStream = { ...stream, id: 2 };
        loadInitSegment(bytes(1));
        loadInitSegment(bytes(4), hdStream);
        frameVideo.addSegment(stream, bytes(2));
        frameVideo.addSegment(hdStream, bytes(5));
        await frameVideo.appendQueue;

        expect(getSourceBuffer().appended).toEqual([bytes(1), bytes(2), bytes(4), bytes(5)]);
    });

    test('should place segments at the timestamp offset the player uses', async () => {
        loadInitSegment(bytes(1));
        frameVideo.addSegment(stream, bytes(2), -10);
        await frameVideo.appendQueue;

        expect(getSourceBuffer().timestampOffset).toBe(-10);
    });

    test('should skip segments whose video init segment it has not seen', async () => {
        loadInitSegment(bytes(1), { ...stream, type: 'audio' });
        loadInitSegment(bytes(1), stream, 1);
        frameVideo.addSegment(stream, bytes(2));
        await frameVideo.appendQueue;

        expect(getSourceBuffer().appended).toEqual([]);
    });

    const finishSeek = (): void => {
        setVideoProp('readyState', HTMLMediaElement.HAVE_CURRENT_DATA);
        setVideoProp('seeking', false);
        setVideoProp('videoWidth', 1280);
        setVideoProp('videoHeight', 720);
        frameVideo.videoEl.dispatchEvent(new Event('seeked'));
    };

    test('should seek to a buffered time and return its frame once the seek is done', () => {
        setVideoProp('buffered', { end: () => 15, length: 1, start: () => 10 });
        setVideoProp('currentTime', 0);

        expect(frameVideo.getFrame(20)).toBeUndefined();
        expect(frameVideo.videoEl.currentTime).toBe(0);

        expect(frameVideo.getFrame(12)).toBeUndefined();
        expect(frameVideo.videoEl.currentTime).toBe(12);

        finishSeek();
        expect(onFrameReady).toHaveBeenCalled();
        expect(frameVideo.getFrame(12)).toBe(frameVideo.frameCanvas);
        expect(frameVideo.frameCanvas).toMatchObject({ height: 720, width: 1280 });
    });

    test('should keep returning the previous frame while seeking to a new time', () => {
        setVideoProp('buffered', { end: () => 15, length: 1, start: () => 10 });
        frameVideo.getFrame(12);
        finishSeek();

        expect(frameVideo.getFrame(12.5)).toBe(frameVideo.frameCanvas);
        expect(frameVideo.videoEl.currentTime).toBe(12.5);
    });

    test('should not return a previous frame far from the new time', () => {
        setVideoProp('buffered', { end: () => 15, length: 1, start: () => 10 });
        frameVideo.getFrame(10.5);
        finishSeek();

        expect(frameVideo.getFrame(14)).toBeUndefined();
        expect(frameVideo.videoEl.currentTime).toBe(14);

        finishSeek();
        expect(frameVideo.getFrame(14)).toBe(frameVideo.frameCanvas);
    });

    test('should seek to a prepared time once its segment is appended, so the frame is ready on click', async () => {
        setVideoProp('buffered', { end: () => 0, length: 0, start: () => 0 });
        setVideoProp('currentTime', 0);
        frameVideo.prepareFrame(12);
        expect(frameVideo.videoEl.currentTime).toBe(0);

        loadInitSegment(bytes(1));
        setVideoProp('buffered', { end: () => 15, length: 1, start: () => 10 });
        frameVideo.addSegment(stream, bytes(2));
        await frameVideo.appendQueue;
        expect(frameVideo.videoEl.currentTime).toBe(12);

        finishSeek();
        expect(frameVideo.getFrame(12.2)).toBe(frameVideo.frameCanvas);
    });

    test('should not capture a frame when a newer seek has already started', () => {
        setVideoProp('buffered', { end: () => 15, length: 1, start: () => 10 });
        frameVideo.getFrame(10.5);
        finishSeek();
        onFrameReady.mockClear();

        frameVideo.getFrame(14);
        setVideoProp('seeking', true);
        frameVideo.videoEl.dispatchEvent(new Event('seeked'));

        expect(onFrameReady).not.toHaveBeenCalled();
        expect(frameVideo.frameTime).toBe(10.5);
        expect(frameVideo.getFrame(14)).toBeUndefined();
    });

    test('should not seek again when the browser rounds currentTime', () => {
        setVideoProp('buffered', { end: () => 15, length: 1, start: () => 10 });
        frameVideo.getFrame(12.3456789);
        setVideoProp('currentTime', 12.345679);
        finishSeek();

        expect(frameVideo.getFrame(12.3456789)).toBe(frameVideo.frameCanvas);
        expect(frameVideo.videoEl.currentTime).toBe(12.345679);
    });

    test('should release the video and filter on destroy', () => {
        (URL.revokeObjectURL as jest.Mock).mockClear();
        frameVideo.destroy();
        frameVideo.videoEl.dispatchEvent(new Event('seeked'));

        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:frames');
        expect(networkingEngine.unregisterResponseFilter).toHaveBeenCalledWith(frameVideo.storeVideoInitSegment);
        expect(frameVideo.videoEl.hasAttribute('src')).toBe(false);
        expect(onFrameReady).not.toHaveBeenCalled();
    });
});
