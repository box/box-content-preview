import VideoSeekPreview from '../VideoSeekPreview';
import { CLASS_IS_VISIBLE } from '../../../constants';

const FILMSTRIP_URL = 'blob:http://localhost/filmstrip';
const INTERVAL = 2;

describe('lib/viewers/media/VideoSeekPreview', () => {
    let containerEl;
    let mediaEl;
    let onHide;
    let onShow;
    let preview;

    const loadFilmstrip = ({ naturalHeight = 180, naturalWidth = 16000 } = {}) => {
        preview.setFilmstrip(FILMSTRIP_URL, INTERVAL);
        Object.defineProperty(preview.imageEl, 'naturalWidth', { configurable: true, value: naturalWidth });
        Object.defineProperty(preview.imageEl, 'naturalHeight', { configurable: true, value: naturalHeight });
        preview.imageEl.dispatchEvent(new Event('load'));
    };

    const seek = currentTime => {
        mediaEl.currentTime = currentTime;
        mediaEl.dispatchEvent(new Event('seeking'));
    };

    beforeEach(() => {
        containerEl = document.createElement('div');
        mediaEl = containerEl.appendChild(document.createElement('video'));
        containerEl.appendChild(document.createElement('div')).className = 'spinner';
        document.body.appendChild(containerEl);
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 0, writable: true });

        onHide = jest.fn();
        onShow = jest.fn();
        preview = new VideoSeekPreview({ mediaEl, onHide, onShow });
    });

    afterEach(() => {
        preview.destroy();
        containerEl.remove();
        jest.useRealTimers();
    });

    describe('constructor()', () => {
        test('should insert a hidden overlay directly after the video', () => {
            expect(mediaEl.nextElementSibling).toBe(preview.el);
            expect(preview.el).toHaveClass('bp-media-seek-preview');
            expect(preview.el).toHaveAttribute('aria-hidden', 'true');
            expect(preview.canvasEl).toHaveClass('bp-media-seek-preview-frame');
            expect(preview.isVisible()).toBe(false);
        });
    });

    describe('seeking', () => {
        test('should not show before the filmstrip has loaded', () => {
            preview.setFilmstrip(FILMSTRIP_URL, INTERVAL);

            seek(30);

            expect(preview.isVisible()).toBe(false);
            expect(onShow).not.toHaveBeenCalled();
        });

        test('should show for buffered seek targets too', () => {
            loadFilmstrip();

            seek(5);

            expect(preview.isVisible()).toBe(true);
        });

        test('should draw the filmstrip frame for the target time and show it', () => {
            loadFilmstrip();
            const context = preview.canvasEl.getContext('2d');
            jest.spyOn(context, 'drawImage');

            seek(30); // frame 15, row 0

            expect(context.drawImage).toHaveBeenCalledWith(preview.imageEl, 15 * 160, 0, 160, 90, 0, 0, 160, 90);
            expect(preview.canvasEl.width).toBe(160);
            expect(preview.canvasEl.height).toBe(90);
            expect(preview.isVisible()).toBe(true);
            expect(preview.el).toHaveClass(CLASS_IS_VISIBLE);
            expect(onShow).toHaveBeenCalledTimes(1);
        });

        test('should read frames from later rows of the sprite', () => {
            loadFilmstrip();
            const context = preview.canvasEl.getContext('2d');
            jest.spyOn(context, 'drawImage');

            seek(206); // frame 103, row 1

            expect(context.drawImage).toHaveBeenCalledWith(preview.imageEl, 3 * 160, 90, 160, 90, 0, 0, 160, 90);
        });

        test('should not show when the target frame is past the end of the sprite', () => {
            loadFilmstrip({ naturalHeight: 90 });

            seek(206);

            expect(preview.isVisible()).toBe(false);
        });

        test('should keep updating the frame on each seek while visible', () => {
            loadFilmstrip();
            const context = preview.canvasEl.getContext('2d');
            jest.spyOn(context, 'drawImage');

            seek(30);
            seek(4);

            expect(context.drawImage).toHaveBeenLastCalledWith(preview.imageEl, 2 * 160, 0, 160, 90, 0, 0, 160, 90);
            expect(preview.isVisible()).toBe(true);
        });

        test('should keep the shown frame when the playhead is nudged back across a frame boundary', () => {
            loadFilmstrip();
            const context = preview.canvasEl.getContext('2d');
            jest.spyOn(context, 'drawImage');

            seek(30);
            seek(29.999);

            expect(context.drawImage).toHaveBeenCalledTimes(1);
            expect(context.drawImage).toHaveBeenLastCalledWith(preview.imageEl, 15 * 160, 0, 160, 90, 0, 0, 160, 90);
            expect(preview.isVisible()).toBe(true);
        });

        test('should wait for the nudged seek before hiding', () => {
            jest.useFakeTimers();
            loadFilmstrip();

            seek(30);
            mediaEl.dispatchEvent(new Event('seeked'));
            seek(29.999);
            jest.advanceTimersByTime(250);

            expect(preview.isVisible()).toBe(true);
        });

        test('should only call onShow when the preview first covers the video', () => {
            loadFilmstrip();

            seek(30);
            seek(60);

            expect(onShow).toHaveBeenCalledTimes(1);
        });

        test('should call onHide when a visible preview has no frame for the next seek target', () => {
            loadFilmstrip({ naturalHeight: 90 });

            seek(30);
            seek(206);

            expect(preview.isVisible()).toBe(false);
            expect(onHide).toHaveBeenCalledTimes(1);
        });

        test('should size the overlay to the video content box', () => {
            loadFilmstrip();
            Object.defineProperties(mediaEl, {
                clientHeight: { configurable: true, value: 360 },
                clientLeft: { configurable: true, value: 1 },
                clientTop: { configurable: true, value: 1 },
                clientWidth: { configurable: true, value: 640 },
                offsetLeft: { configurable: true, value: 48 },
                offsetTop: { configurable: true, value: 24 },
            });

            seek(30);

            expect(preview.el.style.left).toBe('49px');
            expect(preview.el.style.top).toBe('25px');
            expect(preview.el.style.width).toBe('640px');
            expect(preview.el.style.height).toBe('360px');
        });
    });

    describe('seeked', () => {
        test('should do nothing when the preview is not visible', () => {
            mediaEl.requestVideoFrameCallback = jest.fn();

            mediaEl.dispatchEvent(new Event('seeked'));

            expect(mediaEl.requestVideoFrameCallback).not.toHaveBeenCalled();
        });

        test('should hide once the next video frame is presented', () => {
            loadFilmstrip();
            let presentFrame;
            mediaEl.requestVideoFrameCallback = jest.fn(callback => {
                presentFrame = callback;
                return 7;
            });

            seek(30);
            mediaEl.dispatchEvent(new Event('seeked'));

            expect(preview.isVisible()).toBe(true);
            expect(onHide).not.toHaveBeenCalled();
            presentFrame();
            expect(preview.isVisible()).toBe(false);
            expect(onHide).toHaveBeenCalledTimes(1);
        });

        test('should not call onHide again when the fallback fires after the frame callback', () => {
            jest.useFakeTimers();
            loadFilmstrip();
            let presentFrame;
            mediaEl.requestVideoFrameCallback = jest.fn(callback => {
                presentFrame = callback;
                return 7;
            });

            seek(30);
            mediaEl.dispatchEvent(new Event('seeked'));
            presentFrame();
            jest.advanceTimersByTime(250);

            expect(onHide).toHaveBeenCalledTimes(1);
        });

        test('should fall back to a timeout when no frame callback fires', () => {
            jest.useFakeTimers();
            loadFilmstrip();

            seek(30);
            mediaEl.dispatchEvent(new Event('seeked'));

            expect(preview.isVisible()).toBe(true);
            jest.advanceTimersByTime(250);
            expect(preview.isVisible()).toBe(false);
        });

        test('should cancel a pending hide when another seek starts', () => {
            jest.useFakeTimers();
            loadFilmstrip();
            mediaEl.requestVideoFrameCallback = jest.fn(() => 7);
            mediaEl.cancelVideoFrameCallback = jest.fn();

            seek(30);
            mediaEl.dispatchEvent(new Event('seeked'));
            seek(60);
            jest.advanceTimersByTime(250);

            expect(mediaEl.cancelVideoFrameCallback).toHaveBeenCalledWith(7);
            expect(preview.isVisible()).toBe(true);
        });
    });

    describe('showFrame()', () => {
        test('should show the frame for a time without the video seeking', () => {
            loadFilmstrip();
            const context = preview.canvasEl.getContext('2d');
            jest.spyOn(context, 'drawImage');

            expect(preview.showFrame(30)).toBe(true);

            expect(context.drawImage).toHaveBeenCalledWith(preview.imageEl, 15 * 160, 0, 160, 90, 0, 0, 160, 90);
            expect(preview.isVisible()).toBe(true);
            expect(onShow).toHaveBeenCalledTimes(1);
        });

        test('should return false and stay hidden when there is no frame', () => {
            expect(preview.showFrame(30)).toBe(false);
            expect(preview.isVisible()).toBe(false);
        });
    });

    describe('getFrameTime()', () => {
        test.each`
            time      | frameTime
            ${0}      | ${0}
            ${1.9}    | ${0}
            ${2}      | ${2}
            ${31.7}   | ${30}
            ${(0.7 + 0.1) * 10} | ${8}
        `('should return $frameTime for $time', ({ time, frameTime }) => {
            preview.setFilmstrip(FILMSTRIP_URL, INTERVAL);

            expect(preview.getFrameTime(time)).toBe(frameTime);
        });

        test('should return the time unchanged before the filmstrip is set', () => {
            expect(preview.getFrameTime(31.7)).toBe(31.7);
        });

        test('should draw the same frame for its own frame time', () => {
            loadFilmstrip();
            const context = preview.canvasEl.getContext('2d');
            jest.spyOn(context, 'drawImage');

            preview.showFrame(preview.getFrameTime(31.7));

            expect(context.drawImage).toHaveBeenCalledWith(preview.imageEl, 15 * 160, 0, 160, 90, 0, 0, 160, 90);
        });
    });

    describe('scrubbing', () => {
        const setSeeking = seeking => {
            Object.defineProperty(mediaEl, 'seeking', { configurable: true, value: seeking });
        };

        test('should stay visible when an earlier seek finishes mid-drag', () => {
            jest.useFakeTimers();
            loadFilmstrip();

            seek(30);
            preview.startScrub();
            preview.showFrame(60);
            mediaEl.dispatchEvent(new Event('seeked'));
            jest.advanceTimersByTime(250);

            expect(preview.isVisible()).toBe(true);
        });

        test('should cancel a pending hide when the drag starts', () => {
            jest.useFakeTimers();
            loadFilmstrip();

            seek(30);
            mediaEl.dispatchEvent(new Event('seeked'));
            preview.startScrub();
            jest.advanceTimersByTime(250);

            expect(preview.isVisible()).toBe(true);
        });

        test('should wait for the committed seek before hiding after the drag ends', () => {
            jest.useFakeTimers();
            loadFilmstrip();
            preview.startScrub();
            preview.showFrame(60);

            seek(60);
            setSeeking(true);
            preview.endScrub();
            jest.advanceTimersByTime(250);
            expect(preview.isVisible()).toBe(true);

            mediaEl.dispatchEvent(new Event('seeked'));
            jest.advanceTimersByTime(250);
            expect(preview.isVisible()).toBe(false);
        });

        test('should hide after the drag ends when no seek is in flight', () => {
            jest.useFakeTimers();
            loadFilmstrip();
            preview.startScrub();
            preview.showFrame(60);

            setSeeking(false);
            preview.endScrub();
            jest.advanceTimersByTime(250);

            expect(preview.isVisible()).toBe(false);
            expect(onHide).toHaveBeenCalledTimes(1);
        });
    });

    describe('destroy()', () => {
        test('should remove the overlay and stop listening to the video', () => {
            loadFilmstrip();

            preview.destroy();
            seek(30);

            expect(containerEl.contains(preview.el)).toBe(false);
            expect(onShow).not.toHaveBeenCalled();
        });
    });
});
