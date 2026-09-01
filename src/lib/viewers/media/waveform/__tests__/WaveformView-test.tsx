import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WaveSurfer from 'wavesurfer.js';
import WaveformView from '../WaveformView';
import {
    WAVEFORM_BAR_GAP,
    WAVEFORM_BAR_RADIUS,
    WAVEFORM_BAR_WIDTH,
    WAVEFORM_FOLLOW_SCROLL_SETTLE_MS,
    WAVEFORM_HEIGHT,
    WAVEFORM_PLAYHEAD_JUMP_MS,
} from '../constants';
import { WAVEFORM_COLOR_PLAYED, WAVEFORM_COLOR_UNPLAYED } from '../colors';
import { getPinnedPlayheadLeft } from '../viewport';

const mockDestroy = jest.fn();
const mockLoad = jest.fn();
const mockSetOptions = jest.fn();
const mockSetTime = jest.fn();
const mockGetScroll = jest.fn(() => 0);
const mockGetWidth = jest.fn(() => 200);
const mockGetWrapper = jest.fn(() => ({ clientWidth: 200 }));
const mockSetScroll = jest.fn();
const mockSetScrollTime = jest.fn();
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
let clickHandler: ((relativeX: number) => void) | undefined;
let scrollHandler: ((relativeX?: number) => void) | undefined;
let zoomHandler: (() => void) | undefined;
let resizeCallback: ResizeObserverCallback | undefined;

const mockOn = jest.fn((event: string, handler: (relativeX?: number) => void) => {
    if (event === 'click') {
        clickHandler = handler;
    }
    if (event === 'scroll') {
        scrollHandler = handler;
    }
    if (event === 'zoom') {
        zoomHandler = handler as () => void;
    }
    return jest.fn();
});

function spyFollowScrollSettle(onSettle: (fn: () => void) => void): void {
    jest.spyOn(window, 'setTimeout').mockImplementation(((fn: TimerHandler, ms?: number) => {
        if (ms === WAVEFORM_FOLLOW_SCROLL_SETTLE_MS && typeof fn === 'function') {
            onSettle(fn as () => void);
        }
        return 0;
    }) as typeof window.setTimeout);
}

function renderZoomedWaveform({
    bindFollowScroll = true,
    currentTime,
    getScroll = 0,
    onViewportChange,
    setScrollImpl,
}: {
    bindFollowScroll?: boolean;
    currentTime: number;
    getScroll?: number;
    onViewportChange?: (viewport: { scrollLeftPx: number }) => void;
    setScrollImpl?: () => void;
}): {
    animationCallbacks: FrameRequestCallback[];
    mediaEl: HTMLAudioElement;
    playhead: HTMLElement;
    rerender: (next?: {
        currentTime?: number;
        onViewportChange?: (viewport: { scrollLeftPx: number }) => void;
    }) => void;
} {
    const mediaEl = document.createElement('audio');
    Object.defineProperty(mediaEl, 'paused', { configurable: true, value: true, writable: true });
    Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: currentTime, writable: true });
    mockGetScroll.mockReturnValue(getScroll);
    mockGetWidth.mockReturnValue(200);
    mockGetWrapper.mockReturnValue({ clientWidth: 400 });
    if (setScrollImpl) {
        mockSetScroll.mockImplementation(setScrollImpl);
    }

    const animationCallbacks: FrameRequestCallback[] = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
        animationCallbacks.push(cb);
        return animationCallbacks.length;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(jest.fn());

    const view = render(
        <WaveformView
            currentTime={currentTime}
            durationSec={8}
            mediaEl={mediaEl}
            onViewportChange={onViewportChange}
            peaks={new Array(800).fill(0.5)}
            zoomLevel={2}
        />,
    );

    if (bindFollowScroll) {
        // After mount: zoom-center uses setScroll. Keep this fixture at scroll 0 so
        // play starts in the follow-right zone instead of already centered.
        mockGetScroll.mockReturnValue(0);
        mockSetScroll.mockImplementation((scrollLeftPx: number) => {
            mockGetScroll.mockReturnValue(scrollLeftPx);
            scrollHandler?.();
        });
    }

    return {
        animationCallbacks,
        mediaEl,
        playhead: screen.getByTestId('bp-waveform-playhead'),
        rerender: (next = {}) => {
            view.rerender(
                <WaveformView
                    currentTime={next.currentTime ?? currentTime}
                    durationSec={8}
                    mediaEl={mediaEl}
                    onViewportChange={next.onViewportChange ?? onViewportChange}
                    peaks={new Array(800).fill(0.5)}
                    zoomLevel={2}
                />,
            );
        },
    };
}

const mockResizeObserver = jest.fn().mockImplementation((callback: ResizeObserverCallback) => {
    resizeCallback = callback;
    return {
        disconnect: mockDisconnect,
        observe: mockObserve,
        unobserve: jest.fn(),
    };
});
((global as unknown) as { ResizeObserver: jest.Mock }).ResizeObserver = mockResizeObserver;

jest.mock('wavesurfer.js', () => ({
    __esModule: true,
    default: {
        create: jest.fn(() => ({
            destroy: mockDestroy,
            getScroll: mockGetScroll,
            getWidth: mockGetWidth,
            getWrapper: mockGetWrapper,
            load: mockLoad,
            on: mockOn,
            setOptions: mockSetOptions,
            setScroll: mockSetScroll,
            setScrollTime: mockSetScrollTime,
            setTime: mockSetTime,
        })),
    },
}));

describe('WaveformView', () => {
    beforeAll(() => {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 200 });
    });

    afterAll(() => {
        Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 0 });
    });

    beforeEach(() => {
        clickHandler = undefined;
        scrollHandler = undefined;
        zoomHandler = undefined;
        resizeCallback = undefined;
        jest.clearAllMocks();
    });

    test('should mount a wavesurfer instance from peaks without a media url', () => {
        render(<WaveformView durationSec={8} peaks={[0.2, 0.8, 0.1]} />);

        expect(screen.getByTestId('bp-waveform-view')).toBeInTheDocument();
        expect(WaveSurfer.create).toHaveBeenCalledWith(
            expect.objectContaining({
                barGap: WAVEFORM_BAR_GAP,
                barRadius: WAVEFORM_BAR_RADIUS,
                barWidth: WAVEFORM_BAR_WIDTH,
                duration: 8,
                height: WAVEFORM_HEIGHT,
                peaks: [
                    [0.2, 0.8, 0.1],
                    [0.2, 0.8, 0.1],
                ],
                progressColor: WAVEFORM_COLOR_PLAYED,
                waveColor: WAVEFORM_COLOR_UNPLAYED,
            }),
        );
        const options = (WaveSurfer.create as jest.Mock).mock.calls[0][0];
        expect(options.url).toBeUndefined();
        expect(options.media).toBeUndefined();
        expect(options.barAlign).toBeUndefined();
        expect(options.cursorWidth).toBe(0);
        expect(screen.getByTestId('bp-waveform-playhead')).toHaveStyle({ left: '0%' });
    });

    test('should position the playhead from current time', () => {
        render(<WaveformView currentTime={2} durationSec={8} peaks={[0.2, 0.8]} />);

        expect(screen.getByTestId('bp-waveform-playhead')).toHaveStyle({ left: '25%' });
    });

    test('should keep smoothing the playhead after a seek while playing', () => {
        const mediaEl = document.createElement('audio');
        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: false });
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 1, writable: true });

        const animationCallbacks: FrameRequestCallback[] = [];
        const cancelAnimation = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(jest.fn());
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
            animationCallbacks.push(cb);
            return animationCallbacks.length;
        });

        render(<WaveformView currentTime={1} durationSec={8} mediaEl={mediaEl} peaks={[0.2, 0.8]} />);

        cancelAnimation.mockClear();
        mockSetTime.mockClear();

        mediaEl.currentTime = 4;
        mediaEl.dispatchEvent(new Event('seeked'));

        expect(cancelAnimation).not.toHaveBeenCalled();
        expect(mockSetTime).toHaveBeenCalledWith(4);
    });

    test('should apply hover fills and show a time chip while the pointer is over the track', () => {
        render(<WaveformView durationSec={8} peaks={[0.2, 0.8]} />);
        const track = screen.getByTestId('bp-waveform-view').querySelector('.bp-WaveformView-track') as HTMLElement;
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            bottom: 140,
            height: 140,
            left: 0,
            right: 200,
            toJSON: () => ({}),
            top: 0,
            width: 200,
            x: 0,
            y: 0,
        });

        fireEvent.mouseMove(track, { clientX: 50 });

        expect(screen.getByTestId('bp-waveform-hover-time')).toHaveTextContent('0:02.00');
        expect(screen.getByTestId('bp-waveform-hover')).toHaveStyle({ left: '25%' });
    });

    test('should show the hover time chip while zoomed', () => {
        render(<WaveformView durationSec={8} peaks={new Array(800).fill(0.5)} zoomLevel={2} />);
        const track = screen.getByTestId('bp-waveform-view').querySelector('.bp-WaveformView-track') as HTMLElement;
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            bottom: 140,
            height: 140,
            left: 0,
            right: 200,
            toJSON: () => ({}),
            top: 0,
            width: 200,
            x: 0,
            y: 0,
        });

        fireEvent.mouseMove(track, { clientX: 50 });

        expect(screen.getByTestId('bp-waveform-hover-time')).toHaveTextContent('0:01.00');
        expect(screen.getByTestId('bp-waveform-hover')).toHaveStyle({ left: '25%' });
    });

    test('should hide the hover time when the pointer leaves', () => {
        render(<WaveformView durationSec={8} peaks={[0.2, 0.8]} />);
        const track = screen.getByTestId('bp-waveform-view').querySelector('.bp-WaveformView-track') as HTMLElement;
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            bottom: 140,
            height: 140,
            left: 0,
            right: 200,
            toJSON: () => ({}),
            top: 0,
            width: 200,
            x: 0,
            y: 0,
        });

        fireEvent.mouseMove(track, { clientX: 50 });
        expect(screen.getByTestId('bp-waveform-hover-time')).toBeInTheDocument();

        fireEvent.mouseLeave(track);
        expect(screen.queryByTestId('bp-waveform-hover-time')).not.toBeInTheDocument();
    });

    test('should seek from a wavesurfer click', () => {
        const onSeek = jest.fn();
        render(<WaveformView durationSec={8} onSeek={onSeek} peaks={[0.2, 0.8]} />);

        expect(clickHandler).toBeDefined();
        clickHandler?.(0.25);

        expect(onSeek).toHaveBeenCalledWith(2);
    });

    test('should ignore hover and clicks while inert', () => {
        const onSeek = jest.fn();
        render(<WaveformView durationSec={8} interactive={false} onSeek={onSeek} peaks={[0.2, 0.8]} />);
        const track = screen.getByTestId('bp-waveform-view').querySelector('.bp-WaveformView-track') as HTMLElement;
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            bottom: 140,
            height: 140,
            left: 0,
            right: 200,
            toJSON: () => ({}),
            top: 0,
            width: 200,
            x: 0,
            y: 0,
        });

        fireEvent.mouseMove(track, { clientX: 50 });
        clickHandler?.(0.25);

        expect(screen.getByTestId('bp-waveform-view')).toHaveClass('bp-WaveformView--inert');
        expect(screen.queryByTestId('bp-waveform-hover-time')).not.toBeInTheDocument();
        expect(WaveSurfer.create).toHaveBeenCalledWith(expect.objectContaining({ interact: false }));
        expect(onSeek).not.toHaveBeenCalled();
    });

    test('should keep the wavesurfer instance when duration changes from the placeholder', () => {
        const peaks = [0.2, 0.8];
        const { rerender } = render(<WaveformView durationSec={1} peaks={peaks} />);

        expect(WaveSurfer.create).toHaveBeenCalledTimes(1);

        rerender(<WaveformView durationSec={8} peaks={peaks} />);

        expect(WaveSurfer.create).toHaveBeenCalledTimes(1);
        expect(mockDestroy).not.toHaveBeenCalled();
        expect(mockLoad).toHaveBeenCalledWith(
            '',
            [
                [0.2, 0.8],
                [0.2, 0.8],
            ],
            8,
        );
    });

    test('should keep playhead left when playback smoothing starts', () => {
        const mediaEl = document.createElement('audio');
        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: true, writable: true });
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 2, writable: true });

        render(<WaveformView currentTime={2} durationSec={8} mediaEl={mediaEl} peaks={[0.2, 0.8]} />);
        const playhead = screen.getByTestId('bp-waveform-playhead');
        expect(playhead).toHaveStyle({ left: '25%' });

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: false });
        mediaEl.dispatchEvent(new Event('play'));

        expect(playhead).toHaveStyle({ left: '25%' });
    });

    test('should morph peaks without remounting wavesurfer', () => {
        const frames: FrameRequestCallback[] = [];
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
            frames.push(cb);
            return frames.length;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(jest.fn());
        jest.spyOn(performance, 'now').mockReturnValue(0);

        const placeholder = [0.05, 0.05];
        const decoded = [0.2, 0.8];
        const { rerender } = render(<WaveformView durationSec={8} peaks={placeholder} />);

        expect(WaveSurfer.create).toHaveBeenCalledTimes(1);

        rerender(<WaveformView durationSec={8} peaks={decoded} />);

        expect(WaveSurfer.create).toHaveBeenCalledTimes(1);
        expect(frames.length).toBeGreaterThan(0);

        frames[0](800);

        const peakLoad = [...mockLoad.mock.calls].reverse().find(call => call[1]);
        expect(peakLoad[0]).toBe('');
        expect(peakLoad[2]).toBe(8);
        expect(peakLoad[1][0][0]).toBeCloseTo(0.2);
        expect(peakLoad[1][0][1]).toBeCloseTo(0.8);
    });

    test('should recompute fills when the canvas width changes', () => {
        const bufferedRange = {
            end: () => 4,
            length: 1,
            start: () => 0,
        } as TimeRanges;

        render(<WaveformView bufferedRange={bufferedRange} durationSec={8} peaks={[0.2, 0.8]} />);

        expect(mockResizeObserver).toHaveBeenCalled();
        expect(mockObserve).toHaveBeenCalled();
        expect(resizeCallback).toBeDefined();

        mockSetOptions.mockClear();
        act(() => {
            resizeCallback?.(
                [
                    ({
                        contentRect: { width: 400 },
                    } as unknown) as ResizeObserverEntry,
                ],
                ({} as unknown) as ResizeObserver,
            );
        });

        expect(mockSetOptions).toHaveBeenCalled();
    });

    test('should emit viewport zoom limits from peak density, duration, and viewport width', () => {
        const onViewportChange = jest.fn();
        render(<WaveformView durationSec={60} onViewportChange={onViewportChange} peaks={new Array(800).fill(0.5)} />);

        expect(onViewportChange).toHaveBeenCalledWith(expect.objectContaining({ maxZoom: 4, widthPx: 200 }));
    });

    test('should not allow zoom when the file is shorter than the minimum window floor', () => {
        const onViewportChange = jest.fn();
        render(<WaveformView durationSec={2} onViewportChange={onViewportChange} peaks={new Array(16384).fill(0.5)} />);

        expect(onViewportChange).toHaveBeenCalledWith(expect.objectContaining({ maxZoom: 1, widthPx: 200 }));
    });

    test('should apply minPxPerSec and the zoomed class when zoomed in', () => {
        render(<WaveformView durationSec={8} peaks={new Array(800).fill(0.5)} zoomLevel={2} />);

        expect(screen.getByTestId('bp-waveform-view')).toHaveClass('bp-WaveformView--zoomed');
        expect(mockSetOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                autoScroll: false,
                minPxPerSec: 50,
            }),
        );
    });

    test('should not recenter when only the peak-derived max zoom changes', () => {
        render(<WaveformView currentTime={10} durationSec={300} peaks={new Array(16384).fill(0.5)} zoomLevel={2} />);

        mockSetScroll.mockClear();
        mockSetScrollTime.mockClear();
        act(() => {
            resizeCallback?.(
                [
                    ({
                        contentRect: { width: 800 },
                    } as unknown) as ResizeObserverEntry,
                ],
                ({} as unknown) as ResizeObserver,
            );
        });

        expect(mockSetScroll).not.toHaveBeenCalled();
        expect(mockSetScrollTime).not.toHaveBeenCalled();
    });

    test('should zoom around the pointer on ctrl+wheel', () => {
        const onZoomChange = jest.fn();
        render(
            <WaveformView durationSec={8} onZoomChange={onZoomChange} peaks={new Array(800).fill(0.5)} zoomLevel={1} />,
        );
        const track = screen.getByTestId('bp-waveform-view').querySelector('.bp-WaveformView-track') as HTMLElement;

        fireEvent.wheel(track, { clientX: 50, ctrlKey: true, deltaY: -100 });

        expect(onZoomChange).toHaveBeenCalled();
        expect(onZoomChange.mock.calls[0][0]).toBeGreaterThan(1);
    });

    test('should not zoom on ctrl+wheel when zoom is not enabled', () => {
        render(<WaveformView durationSec={8} peaks={new Array(800).fill(0.5)} zoomLevel={1} />);
        const track = screen.getByTestId('bp-waveform-view').querySelector('.bp-WaveformView-track') as HTMLElement;

        fireEvent.wheel(track, { clientX: 50, ctrlKey: true, deltaY: -100 });

        expect(screen.getByTestId('bp-waveform-view')).not.toHaveClass('bp-WaveformView--zoomed');
    });

    test('should not zoom on ctrl+wheel when the minimum window floor leaves no zoom headroom', () => {
        const onZoomChange = jest.fn();
        render(
            <WaveformView
                durationSec={2}
                onZoomChange={onZoomChange}
                peaks={new Array(16384).fill(0.5)}
                zoomLevel={1}
            />,
        );
        const track = screen.getByTestId('bp-waveform-view').querySelector('.bp-WaveformView-track') as HTMLElement;

        fireEvent.wheel(track, { clientX: 50, ctrlKey: true, deltaY: -100 });

        expect(onZoomChange).not.toHaveBeenCalled();
        expect(screen.getByTestId('bp-waveform-view')).not.toHaveClass('bp-WaveformView--zoomed');
    });

    test('should jump the playhead into view on resume even when WaveSurfer emits extra scroll events', () => {
        jest.spyOn(performance, 'now').mockReturnValue(0);
        const { animationCallbacks, mediaEl } = renderZoomedWaveform({
            bindFollowScroll: false,
            currentTime: 1,
            getScroll: 400,
            setScrollImpl: () => {
                scrollHandler?.();
                scrollHandler?.();
            },
        });

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: false });
        mediaEl.dispatchEvent(new Event('play'));

        expect(animationCallbacks.length).toBeGreaterThan(0);
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(WAVEFORM_PLAYHEAD_JUMP_MS));
        });

        expect(mockSetScroll).toHaveBeenCalled();
        expect(mockSetScroll.mock.calls[mockSetScroll.mock.calls.length - 1][0]).toBeCloseTo(0);
    });

    test('should jump the zoomed window to a host seek that is off-screen', () => {
        const mediaEl = document.createElement('audio');
        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: true, writable: true });
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 1, writable: true });
        mockGetScroll.mockReturnValue(0);
        mockGetWidth.mockReturnValue(200);
        mockGetWrapper.mockReturnValue({ clientWidth: 400 });
        mockSetScroll.mockImplementation((scrollLeftPx: number) => {
            mockGetScroll.mockReturnValue(scrollLeftPx);
        });

        const animationCallbacks: FrameRequestCallback[] = [];
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
            animationCallbacks.push(cb);
            return animationCallbacks.length;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(jest.fn());
        jest.spyOn(performance, 'now').mockReturnValue(0);

        render(
            <WaveformView
                currentTime={1}
                durationSec={8}
                mediaEl={mediaEl}
                peaks={new Array(800).fill(0.5)}
                zoomLevel={2}
            />,
        );

        act(() => {
            animationCallbacks.splice(0).forEach(cb => cb(0));
        });
        mockSetScroll.mockClear();

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 6, writable: true });
        act(() => {
            mediaEl.dispatchEvent(new Event('seeked'));
        });

        expect(animationCallbacks.length).toBeGreaterThan(0);
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(WAVEFORM_PLAYHEAD_JUMP_MS));
        });

        expect(mockSetScroll.mock.calls[mockSetScroll.mock.calls.length - 1][0]).toBeCloseTo(200);
        expect(screen.getByTestId('bp-waveform-playhead').style.left).toBe('50%');
    });

    test('should not jump the zoomed window when a host seek is already in view', () => {
        const mediaEl = document.createElement('audio');
        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: true, writable: true });
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 1, writable: true });
        mockGetScroll.mockReturnValue(0);
        mockGetWidth.mockReturnValue(200);
        mockGetWrapper.mockReturnValue({ clientWidth: 400 });
        mockSetScroll.mockImplementation((scrollLeftPx: number) => {
            mockGetScroll.mockReturnValue(scrollLeftPx);
        });

        const animationCallbacks: FrameRequestCallback[] = [];
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
            animationCallbacks.push(cb);
            return animationCallbacks.length;
        });

        render(
            <WaveformView
                currentTime={1}
                durationSec={8}
                mediaEl={mediaEl}
                peaks={new Array(800).fill(0.5)}
                zoomLevel={2}
            />,
        );

        act(() => {
            animationCallbacks.splice(0).forEach(cb => cb(0));
        });
        mockSetScroll.mockClear();

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 2, writable: true });
        act(() => {
            mediaEl.dispatchEvent(new Event('seeked'));
        });
        act(() => {
            animationCallbacks.splice(0).forEach(cb => cb(0));
        });

        expect(mockSetScroll).not.toHaveBeenCalled();
    });

    test('should pin the playhead while following and keep setTime in sync', () => {
        const onViewportChange = jest.fn();
        const { animationCallbacks, mediaEl, playhead } = renderZoomedWaveform({
            currentTime: 3.5,
            onViewportChange,
        });
        const pinnedLeft = getPinnedPlayheadLeft(200);

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: false });
        mediaEl.dispatchEvent(new Event('play'));

        expect(playhead.style.left).toBe(pinnedLeft);
        expect(mockSetTime).toHaveBeenCalledWith(3.5);

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 3.8, writable: true });
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });

        expect(playhead.style.left).toBe(pinnedLeft);
        expect(mockSetTime).toHaveBeenCalledWith(3.8);
        expect(mockSetScroll.mock.calls[mockSetScroll.mock.calls.length - 1][0]).toBeGreaterThan(0);
        expect(onViewportChange).toHaveBeenCalled();
        const latestViewport = onViewportChange.mock.calls[onViewportChange.mock.calls.length - 1][0];
        expect(latestViewport.scrollLeftPx).toBeGreaterThan(0);

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: true });
        act(() => {
            mediaEl.dispatchEvent(new Event('pause'));
        });

        mockGetScroll.mockReturnValue(0);
        act(() => {
            scrollHandler?.();
        });

        expect(playhead.style.left).toBe('95%');
    });

    test('should emit live scrollLeft when the viewport listener changes while following', () => {
        const onViewportChange = jest.fn();
        const { animationCallbacks, mediaEl, rerender } = renderZoomedWaveform({
            currentTime: 3.5,
            onViewportChange,
        });

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: false });
        mediaEl.dispatchEvent(new Event('play'));
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 3.8, writable: true });
        act(() => {
            animationCallbacks.splice(0).forEach(cb => cb(0));
        });

        const liveScroll = onViewportChange.mock.calls[onViewportChange.mock.calls.length - 1][0].scrollLeftPx;
        expect(liveScroll).toBeGreaterThan(0);

        const nextOnViewportChange = jest.fn();
        rerender({ onViewportChange: nextOnViewportChange });

        expect(nextOnViewportChange).toHaveBeenCalled();
        expect(nextOnViewportChange.mock.calls[0][0].scrollLeftPx).toBe(liveScroll);
    });

    test('should not jump back after a pan leaves the playhead off the right', () => {
        let settleUserScroll: (() => void) | undefined;
        spyFollowScrollSettle(fn => {
            settleUserScroll = fn;
        });
        jest.spyOn(window, 'clearTimeout').mockImplementation(jest.fn());

        const { animationCallbacks, mediaEl, playhead } = renderZoomedWaveform({ currentTime: 3.5 });
        const pinnedLeft = getPinnedPlayheadLeft(200);

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: false });
        mediaEl.dispatchEvent(new Event('play'));
        expect(playhead.style.left).toBe(pinnedLeft);

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 3.8, writable: true });
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });

        const callsWhileFollowing = mockSetScroll.mock.calls.length;
        expect(callsWhileFollowing).toBeGreaterThan(0);

        mockGetScroll.mockReturnValue(0);
        act(() => {
            scrollHandler?.();
        });

        expect(playhead.style.left).not.toBe(pinnedLeft);

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 4.1, writable: true });
        act(() => {
            settleUserScroll?.();
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });

        expect(playhead.style.left).not.toBe(pinnedLeft);
        expect(mockSetScroll.mock.calls.length).toBe(callsWhileFollowing);

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 1, writable: true });
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });
        expect(playhead.style.left).not.toBe(pinnedLeft);

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 3.5, writable: true });
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });
        expect(playhead.style.left).toBe(pinnedLeft);
        expect(mockSetScroll.mock.calls.length).toBeGreaterThan(callsWhileFollowing);
    });

    test('should not pin after pause during a pan settle', () => {
        let settleUserScroll: (() => void) | undefined;
        spyFollowScrollSettle(fn => {
            settleUserScroll = fn;
        });
        jest.spyOn(window, 'clearTimeout').mockImplementation(jest.fn());

        const { animationCallbacks, mediaEl, playhead } = renderZoomedWaveform({ currentTime: 3.5 });
        const pinnedLeft = getPinnedPlayheadLeft(200);

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: false });
        mediaEl.dispatchEvent(new Event('play'));

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 3.8, writable: true });
        act(() => {
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });

        mockGetScroll.mockReturnValue(0);
        act(() => {
            scrollHandler?.();
        });
        const callsAfterPan = mockSetScroll.mock.calls.length;

        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: true });
        act(() => {
            mediaEl.dispatchEvent(new Event('pause'));
            settleUserScroll?.();
            const queued = animationCallbacks.splice(0);
            queued.forEach(cb => cb(0));
        });

        expect(playhead.style.left).not.toBe(pinnedLeft);
        expect(mockSetScroll.mock.calls.length).toBe(callsAfterPan);
    });

    test('should keep the seeked time after a pan while paused', () => {
        const { mediaEl, playhead } = renderZoomedWaveform({ currentTime: 3.5 });

        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 1, writable: true });
        act(() => {
            mediaEl.dispatchEvent(new Event('seeked'));
            mockGetScroll.mockReturnValue(0);
            scrollHandler?.();
        });

        expect(playhead.style.left).toBe('25%');
    });

    test('should center the playhead when zoom changes without a pointer origin', () => {
        mockGetWidth.mockReturnValue(200);
        mockGetWrapper.mockReturnValue({ clientWidth: 200 });
        const { rerender } = render(
            <WaveformView currentTime={8} durationSec={16} peaks={new Array(800).fill(0.5)} zoomLevel={2} />,
        );

        mockSetScroll.mockClear();
        rerender(<WaveformView currentTime={8} durationSec={16} peaks={new Array(800).fill(0.5)} zoomLevel={4} />);

        expect(mockSetScroll).toHaveBeenCalledWith(300);
    });

    test('should ignore WaveSurfer zoom/scroll resets until the intended zoom window is applied', () => {
        mockGetWidth.mockReturnValue(200);
        mockGetWrapper.mockReturnValue({ clientWidth: 200 });
        mockSetScroll.mockImplementation((scrollLeftPx: number) => {
            mockGetScroll.mockReturnValue(scrollLeftPx);
        });
        const onViewportChange = jest.fn();
        const { rerender } = render(
            <WaveformView
                currentTime={8}
                durationSec={16}
                onViewportChange={onViewportChange}
                peaks={new Array(800).fill(0.5)}
                zoomLevel={2}
            />,
        );

        const playhead = screen.getByTestId('bp-waveform-playhead');
        const playheadLeftDuringZoom: string[] = [];
        const viewportScrollDuringZoom: number[] = [];
        mockSetOptions.mockImplementation(() => {
            mockGetScroll.mockReturnValue(0);
            zoomHandler?.();
            scrollHandler?.();
            playheadLeftDuringZoom.push(playhead.style.left);
            viewportScrollDuringZoom.push(...onViewportChange.mock.calls.map(call => call[0].scrollLeftPx).slice(-1));
        });
        onViewportChange.mockClear();
        mockSetScroll.mockClear();

        rerender(
            <WaveformView
                currentTime={8}
                durationSec={16}
                onViewportChange={onViewportChange}
                peaks={new Array(800).fill(0.5)}
                zoomLevel={4}
            />,
        );

        mockSetOptions.mockReset();

        expect(playheadLeftDuringZoom).not.toContain('200%');
        expect(viewportScrollDuringZoom).not.toContain(0);
        expect(mockSetScroll).toHaveBeenCalledWith(300);
        expect(onViewportChange.mock.calls.map(call => call[0].scrollLeftPx)).not.toContain(0);
        expect(playhead).toHaveStyle({ left: '50%' });
    });

    test('should keep the paused playhead on the live window while panning and zooming', () => {
        const mediaEl = document.createElement('audio');
        Object.defineProperty(mediaEl, 'paused', { configurable: true, value: true, writable: true });
        Object.defineProperty(mediaEl, 'currentTime', { configurable: true, value: 30, writable: true });
        mockGetScroll.mockReturnValue(0);
        mockGetWidth.mockReturnValue(200);
        mockGetWrapper.mockReturnValue({ clientWidth: 400 });
        mockSetScroll.mockImplementation((scrollLeftPx: number) => {
            mockGetScroll.mockReturnValue(scrollLeftPx);
        });

        const animationCallbacks: FrameRequestCallback[] = [];
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
            animationCallbacks.push(cb);
            return animationCallbacks.length;
        });

        const { rerender } = render(
            <WaveformView
                currentTime={30}
                durationSec={60}
                mediaEl={mediaEl}
                peaks={new Array(16384).fill(0.5)}
                zoomLevel={2}
            />,
        );

        act(() => {
            animationCallbacks.splice(0).forEach(cb => cb(0));
        });

        const playhead = screen.getByTestId('bp-waveform-playhead');
        expect(playhead.style.left).toBe('50%');

        mockGetScroll.mockReturnValue(50);
        act(() => {
            scrollHandler?.();
        });
        expect(playhead.style.left).toBe('75%');

        rerender(
            <WaveformView
                currentTime={30}
                durationSec={60}
                mediaEl={mediaEl}
                peaks={new Array(16384).fill(0.5)}
                zoomLevel={2}
            />,
        );
        expect(playhead.style.left).toBe('75%');

        rerender(
            <WaveformView
                currentTime={30}
                durationSec={60}
                mediaEl={mediaEl}
                peaks={new Array(16384).fill(0.5)}
                zoomLevel={4}
            />,
        );
        expect(playhead.style.left).toBe('50%');
    });
});
