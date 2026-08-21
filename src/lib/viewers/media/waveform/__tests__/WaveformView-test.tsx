import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import WaveSurfer from 'wavesurfer.js';
import WaveformView, {
    WAVEFORM_BAR_GAP,
    WAVEFORM_BAR_RADIUS,
    WAVEFORM_BAR_WIDTH,
    WAVEFORM_HEIGHT,
} from '../WaveformView';
import { WAVEFORM_COLOR_PLAYED, WAVEFORM_COLOR_UNPLAYED } from '../colors';

const mockDestroy = jest.fn();
const mockSetOptions = jest.fn();
const mockSetTime = jest.fn();
const mockRender = jest.fn();
const mockGetDecodedData = jest.fn(() => ({ duration: 8 }));
const mockOn = jest.fn(() => jest.fn());

jest.mock('wavesurfer.js', () => ({
    __esModule: true,
    default: {
        create: jest.fn(() => ({
            destroy: mockDestroy,
            getDecodedData: mockGetDecodedData,
            on: mockOn,
            renderer: {
                render: mockRender,
            },
            setOptions: mockSetOptions,
            setTime: mockSetTime,
        })),
    },
}));

describe('WaveformView', () => {
    beforeEach(() => {
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

    test('should ignore hover and clicks while inert', () => {
        render(<WaveformView durationSec={8} interactive={false} peaks={[0.2, 0.8]} />);
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

        expect(screen.getByTestId('bp-waveform-view')).toHaveClass('bp-WaveformView--inert');
        expect(screen.queryByTestId('bp-waveform-hover-time')).not.toBeInTheDocument();
        expect(WaveSurfer.create).toHaveBeenCalledWith(expect.objectContaining({ interact: false }));
    });

    test('should keep the wavesurfer instance when duration changes from the placeholder', () => {
        const peaks = [0.2, 0.8];
        const { rerender } = render(<WaveformView durationSec={1} peaks={peaks} />);

        expect(WaveSurfer.create).toHaveBeenCalledTimes(1);

        rerender(<WaveformView durationSec={8} peaks={peaks} />);

        expect(WaveSurfer.create).toHaveBeenCalledTimes(1);
        expect(mockDestroy).not.toHaveBeenCalled();
        expect(mockSetOptions).toHaveBeenCalledWith(
            expect.objectContaining({
                duration: 8,
                peaks: [
                    [0.2, 0.8],
                    [0.2, 0.8],
                ],
            }),
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

        const peakUpdate = mockSetOptions.mock.calls
            .map(call => call[0])
            .reverse()
            .find(options => options && options.peaks);
        expect(peakUpdate.duration).toBe(8);
        expect(peakUpdate.peaks[0][0]).toBeCloseTo(0.2);
        expect(peakUpdate.peaks[0][1]).toBeCloseTo(0.8);
        expect(mockRender).toHaveBeenCalled();
    });
});
