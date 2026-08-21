import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WaveSurfer from 'wavesurfer.js';
import WaveformView, {
    WAVEFORM_BAR_GAP,
    WAVEFORM_BAR_RADIUS,
    WAVEFORM_BAR_WIDTH,
    WAVEFORM_HEIGHT,
} from '../WaveformView';
import { WAVEFORM_COLOR_PLAYED, WAVEFORM_COLOR_UNPLAYED } from '../colors';

const mockDestroy = jest.fn();
const mockLoad = jest.fn();
const mockSetOptions = jest.fn();
const mockSetTime = jest.fn();
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
let clickHandler: ((relativeX: number) => void) | undefined;
let resizeCallback: ResizeObserverCallback | undefined;

const mockOn = jest.fn((event: string, handler: (relativeX: number) => void) => {
    if (event === 'click') {
        clickHandler = handler;
    }
    return jest.fn();
});

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
            load: mockLoad,
            on: mockOn,
            setOptions: mockSetOptions,
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

        const rafCallbacks: FrameRequestCallback[] = [];
        const cancelRaf = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(jest.fn());
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
            rafCallbacks.push(cb);
            return rafCallbacks.length;
        });

        render(<WaveformView currentTime={1} durationSec={8} mediaEl={mediaEl} peaks={[0.2, 0.8]} />);

        cancelRaf.mockClear();
        mockSetTime.mockClear();

        mediaEl.currentTime = 4;
        mediaEl.dispatchEvent(new Event('seeked'));

        expect(cancelRaf).not.toHaveBeenCalled();
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
        const bufferedRange = ({
            end: () => 4,
            length: 1,
            start: () => 0,
        } as unknown) as TimeRanges;

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
});
