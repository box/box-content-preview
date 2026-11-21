import VideoSeekPreview from '../VideoSeekPreview';

describe('lib/viewers/media/VideoSeekPreview', () => {
    let containerEl: HTMLDivElement;
    let frames: FrameRequestCallback[];
    let mediaEl: HTMLVideoElement;
    let onHide: jest.Mock;
    let onShow: jest.Mock;
    let preview: VideoSeekPreview;

    const loadFilmstrip = (): void => {
        preview.setFilmstrip('blob:http://localhost/filmstrip', 2);
        const imageEl = preview.imageEl as HTMLImageElement;
        Object.defineProperty(imageEl, 'naturalWidth', { configurable: true, value: 16000 });
        Object.defineProperty(imageEl, 'naturalHeight', { configurable: true, value: 180 });
        imageEl.dispatchEvent(new Event('load'));
    };

    const setBuffered = (ranges: [number, number][]): void => {
        Object.defineProperty(mediaEl, 'buffered', {
            configurable: true,
            value: {
                end: (i: number) => ranges[i][1],
                length: ranges.length,
                start: (i: number) => ranges[i][0],
            },
        });
    };

    const setMediaProp = (name: string, value: unknown): HTMLVideoElement =>
        Object.defineProperty(mediaEl, name, { configurable: true, value });

    const seek = (currentTime: number, { advance = true } = {}): void => {
        mediaEl.currentTime = currentTime;
        mediaEl.dispatchEvent(new Event('seeking'));
        if (advance) {
            jest.advanceTimersByTime(80);
        }
    };

    const flushFrames = (): void => frames.splice(0).forEach(cb => cb(0));

    beforeEach(() => {
        jest.useFakeTimers();
        frames = [];
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => frames.push(cb));
        containerEl = document.body.appendChild(document.createElement('div'));
        mediaEl = containerEl.appendChild(document.createElement('video'));
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 0, writable: true });
        setMediaProp('paused', false);

        onHide = jest.fn();
        onShow = jest.fn();
        preview = new VideoSeekPreview({ mediaEl, onHide, onShow });
    });

    afterEach(() => {
        preview.destroy();
        containerEl.remove();
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    describe('seeking', () => {
        test('should not show before the filmstrip loads, for buffered targets, or for seeks that finish quickly', () => {
            seek(30);
            expect(preview.isVisible()).toBe(false);

            loadFilmstrip();
            setBuffered([[0, 20]]);
            seek(5);
            expect(preview.isVisible()).toBe(false);

            seek(60, { advance: false });
            mediaEl.dispatchEvent(new Event('seeked'));
            jest.advanceTimersByTime(100);
            expect(preview.isVisible()).toBe(false);
            expect(onShow).not.toHaveBeenCalled();
        });

        test('should draw the target frame from the sprite and call onShow once', () => {
            loadFilmstrip();
            const context = preview.canvasEl.getContext('2d') as CanvasRenderingContext2D;
            jest.spyOn(context, 'drawImage');

            seek(30);
            seek(206); // frame 103: row 1, column 3

            expect(context.drawImage).toHaveBeenLastCalledWith(preview.imageEl, 3 * 160, 90, 160, 90, 0, 0, 160, 90);
            expect(preview.isVisible()).toBe(true);
            expect(onShow).toHaveBeenCalledTimes(1);
        });

        test('should hide immediately when a seek lands in the buffered range', () => {
            loadFilmstrip();
            preview.showFrame(60);
            setBuffered([[50, 70]]);

            seek(60, { advance: false });

            expect(preview.isVisible()).toBe(false);
            expect(preview.el).toHaveClass('bp-is-immediate');
            expect(onHide).toHaveBeenCalledTimes(1);
        });

        test('should dim on the next frame and undim once the target is buffered', () => {
            loadFilmstrip();

            seek(30);
            expect(preview.el).not.toHaveClass('bp-is-dimmed');
            flushFrames();
            expect(preview.el).toHaveClass('bp-is-dimmed');

            mediaEl.dispatchEvent(new Event('canplay'));
            expect(preview.el).toHaveClass('bp-is-dimmed');

            setBuffered([[25, 35]]);
            mediaEl.dispatchEvent(new Event('canplay'));
            expect(preview.el).not.toHaveClass('bp-is-dimmed');
            expect(preview.isVisible()).toBe(true);
        });
    });

    describe('seeked', () => {
        test('should undim and hide once the next video frame is presented', () => {
            let presentFrame: () => void = () => {};
            mediaEl.requestVideoFrameCallback = jest.fn(callback => {
                presentFrame = () => callback(0, {} as VideoFrameCallbackMetadata);
                return 7;
            });
            loadFilmstrip();
            seek(30);
            flushFrames();

            mediaEl.dispatchEvent(new Event('seeked'));
            expect(preview.el).not.toHaveClass('bp-is-dimmed');
            expect(preview.isVisible()).toBe(true);

            presentFrame();
            jest.advanceTimersByTime(100);
            expect(preview.isVisible()).toBe(false);
            expect(onHide).toHaveBeenCalledTimes(1);
        });

        test('should hide on the next animation frame when paused', () => {
            setMediaProp('paused', true);
            loadFilmstrip();
            seek(30);
            flushFrames();

            mediaEl.dispatchEvent(new Event('seeked'));
            expect(preview.isVisible()).toBe(true);
            flushFrames();
            expect(preview.isVisible()).toBe(false);
        });

        test('should fall back to a timeout when no frame callback fires', () => {
            loadFilmstrip();
            seek(30);

            mediaEl.dispatchEvent(new Event('seeked'));
            jest.advanceTimersByTime(100);

            expect(preview.isVisible()).toBe(false);
        });

        test('should cancel a pending hide when another seek starts', () => {
            mediaEl.requestVideoFrameCallback = jest.fn(() => 7);
            mediaEl.cancelVideoFrameCallback = jest.fn();
            loadFilmstrip();
            seek(30);

            mediaEl.dispatchEvent(new Event('seeked'));
            seek(60, { advance: false });
            jest.advanceTimersByTime(100);

            expect(mediaEl.cancelVideoFrameCallback).toHaveBeenCalledWith(7);
            expect(preview.isVisible()).toBe(true);
        });
    });

    describe('scrubbing', () => {
        test('should stay visible while dragging even when a seek finishes', () => {
            loadFilmstrip();
            seek(30);
            mediaEl.dispatchEvent(new Event('seeked'));

            preview.startScrub();
            preview.showFrame(60);
            mediaEl.dispatchEvent(new Event('seeked'));
            jest.advanceTimersByTime(250);

            expect(preview.isVisible()).toBe(true);
        });

        test('should wait for the committed seek before hiding after the drag ends', () => {
            loadFilmstrip();
            preview.startScrub();
            preview.showFrame(60);
            seek(60);

            setMediaProp('seeking', true);
            preview.endScrub();
            jest.advanceTimersByTime(250);
            expect(preview.isVisible()).toBe(true);

            mediaEl.dispatchEvent(new Event('seeked'));
            jest.advanceTimersByTime(250);
            expect(preview.isVisible()).toBe(false);
        });

        test('should hide after the drag ends when no seek is in flight', () => {
            loadFilmstrip();
            preview.startScrub();
            preview.showFrame(60);

            setMediaProp('seeking', false);
            preview.endScrub();
            jest.advanceTimersByTime(250);

            expect(preview.isVisible()).toBe(false);
        });
    });

    test('destroy() should remove the overlay and stop listening to the video', () => {
        loadFilmstrip();

        preview.destroy();
        seek(30);

        expect(containerEl.contains(preview.el)).toBe(false);
        expect(onShow).not.toHaveBeenCalled();
    });
});
