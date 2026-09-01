import React, { useEffect as mockUseEffect } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MP3ControlsV2, { Props } from '../MP3ControlsV2';
import { WAVEFORM_ZOOM_DISMISS_MS } from '../waveform/constants';

jest.mock('../waveform/WaveformView', () => {
    function MockWaveformView({
        durationSec = 0,
        interactive,
        onViewportChange,
        onZoomChange,
    }: {
        durationSec?: number;
        interactive?: boolean;
        onViewportChange?: (viewport: {
            durationSec: number;
            endSec: number;
            heightPx: number;
            maxZoom: number;
            pixelsPerSecond: number;
            scrollLeftPx: number;
            startSec: number;
            widthPx: number;
            zoomLevel: number;
        }) => void;
        onZoomChange?: (zoomLevel: number) => void;
    }): JSX.Element {
        const overview = {
            durationSec,
            endSec: durationSec,
            heightPx: 140,
            maxZoom: 4,
            pixelsPerSecond: durationSec > 0 ? 800 / durationSec : 0,
            scrollLeftPx: 0,
            startSec: 0,
            widthPx: 800,
            zoomLevel: 1,
        };
        mockUseEffect(() => {
            onViewportChange?.(overview);
        }, [durationSec, onViewportChange]);
        return (
            <div data-interactive={interactive ? 'true' : 'false'} data-testid="bp-waveform-view">
                <button data-testid="bp-mock-waveform-zoom" onClick={() => onZoomChange?.(2)} type="button">
                    zoom
                </button>
                <button
                    data-testid="bp-mock-waveform-viewport-zoom"
                    onClick={() =>
                        onViewportChange?.({
                            ...overview,
                            endSec: durationSec / 2,
                            pixelsPerSecond: durationSec > 0 ? 800 / (durationSec / 2) : 0,
                            zoomLevel: 2,
                        })
                    }
                    type="button"
                >
                    viewport zoom
                </button>
                <button
                    data-testid="bp-mock-waveform-viewport-pan"
                    onClick={() =>
                        onViewportChange?.({
                            ...overview,
                            endSec: durationSec,
                            pixelsPerSecond: durationSec > 0 ? 800 / (durationSec / 2) : 0,
                            scrollLeftPx: 800,
                            startSec: durationSec / 2,
                            zoomLevel: 2,
                        })
                    }
                    type="button"
                >
                    viewport pan
                </button>
                <button
                    data-testid="bp-mock-waveform-max-zoom"
                    onClick={() => onViewportChange?.({ ...overview, maxZoom: 1.2, widthPx: 1600 })}
                    type="button"
                >
                    resize
                </button>
            </div>
        );
    }

    return MockWaveformView;
});

const mockResizeObserver = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
}));
((global as unknown) as { ResizeObserver: jest.Mock }).ResizeObserver = mockResizeObserver;

beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 600 });
});

afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 0 });
});

describe('MP3ControlsV2', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    const hostCommentMarkers = [
        {
            avatarUrl: 'https://example.com/a.png',
            colorIndex: 9278424974,
            id: '507397',
            initial: 'A',
            time: 72.729,
            type: 'comment' as const,
        },
    ];

    const getWrapper = (props: Partial<Props> = {}) =>
        render(
            <MP3ControlsV2
                autoplay={false}
                onAutoplayChange={jest.fn()}
                onMuteChange={jest.fn()}
                onPlayPause={jest.fn()}
                onRateChange={jest.fn()}
                onTimeChange={jest.fn()}
                onVolumeChange={jest.fn()}
                rate="1.0"
                {...props}
            />,
        );

    describe('render', () => {
        test('should return a valid v2 wrapper', async () => {
            getWrapper({ durationTime: 8, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('media-controls-wrapper-v2')).toHaveClass('bp-MP3ControlsV2');
        });

        test('should render the waveform instead of the time slider', async () => {
            getWrapper({ durationTime: 8, isPlaying: true, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('bp-waveform-view')).toBeInTheDocument();
            expect(screen.getByTestId('bp-waveform-view')).toHaveAttribute('data-interactive', 'true');
            expect(screen.queryByRole('slider', { name: __('media_time_slider') })).not.toBeInTheDocument();
        });

        test('should render the overlay transport bar with played and total time', async () => {
            getWrapper({ currentTime: 12, durationTime: 212, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('bp-MP3ControlsV2-bar')).toBeInTheDocument();
            expect(screen.getByTestId('bp-TimestampControl-static')).toHaveTextContent('0:12/3:32');
            expect(within(screen.getByTestId('bp-MP3ControlsV2-bar')).getByTitle(__('media_play'))).toBeInTheDocument();
            expect(screen.getByTestId('bp-MP3ControlsV2-play-overlay')).toBeInTheDocument();
            expect(screen.getByTitle(__('media_mute'))).toBeInTheDocument();
            expect(screen.getByTitle('Settings')).toBeInTheDocument();
            expect(screen.queryByTitle(__('media_skip_forward'))).not.toBeInTheDocument();
            expect(screen.queryByTitle(__('media_skip_backward'))).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-DurationLabels')).not.toBeInTheDocument();
        });

        test('should render a placeholder waveform until peaks load', async () => {
            getWrapper({ durationTime: 8 });

            expect(await screen.findByTestId('bp-waveform-view')).toBeInTheDocument();
            expect(screen.getByTestId('bp-MP3ControlsV2-bar')).toBeInTheDocument();
            expect(screen.queryByRole('slider', { name: __('media_time_slider') })).not.toBeInTheDocument();
        });

        test('should keep the waveform inert until play, with overlay on the fallback shell', async () => {
            getWrapper({ durationTime: 0 });

            expect(await screen.findByTestId('bp-waveform-view')).toHaveAttribute('data-interactive', 'false');
            expect(screen.getByTestId('bp-MP3ControlsV2-play-overlay')).toBeInTheDocument();
            expect(screen.queryByTestId('bp-MP3ControlsV2-bar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-MP3ControlsV2-loading')).not.toBeInTheDocument();
        });

        test('should keep the waveform inert after metadata until play is requested', async () => {
            getWrapper({ durationTime: 8, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('bp-waveform-view')).toHaveAttribute('data-interactive', 'false');
            expect(screen.getByTestId('bp-MP3ControlsV2-play-overlay')).toBeInTheDocument();
        });

        test('should pass down props to PlayPauseToggle', async () => {
            const onPlayPause = jest.fn();
            getWrapper({ durationTime: 8, onPlayPause, peaks: [0.2, 0.8] });
            const toggle = await within(screen.getByTestId('bp-MP3ControlsV2-bar')).findByTitle(__('media_play'));

            await userEvent.click(toggle);

            expect(onPlayPause).toHaveBeenCalled();
        });

        test('should start playback and unlock the waveform when the overlay is clicked', async () => {
            const onPlayPause = jest.fn();
            getWrapper({ durationTime: 8, onPlayPause, peaks: [0.2, 0.8] });
            const overlay = await screen.findByTestId('bp-MP3ControlsV2-play-overlay');

            await userEvent.click(overlay);

            expect(onPlayPause).toHaveBeenCalledWith(true);
            expect(screen.queryByTestId('bp-MP3ControlsV2-play-overlay')).not.toBeInTheDocument();
            expect(screen.getByTestId('bp-waveform-view')).toHaveAttribute('data-interactive', 'true');
        });

        test('should focus the media container after the play overlay is clicked', async () => {
            const container = document.createElement('div');
            container.className = 'bp-media-container';
            container.tabIndex = -1;
            const mediaEl = document.createElement('audio');
            container.appendChild(mediaEl);
            document.body.appendChild(container);

            getWrapper({ durationTime: 8, mediaEl, onPlayPause: jest.fn(), peaks: [0.2, 0.8] });
            await userEvent.click(await screen.findByTestId('bp-MP3ControlsV2-play-overlay'));

            expect(document.activeElement).toBe(container);
            container.remove();
        });

        test('should show the loading spinner when play is requested before metadata', async () => {
            const onPlayPause = jest.fn();
            getWrapper({ durationTime: 0, onPlayPause });
            const overlay = await screen.findByTestId('bp-MP3ControlsV2-play-overlay');

            await userEvent.click(overlay);

            expect(onPlayPause).toHaveBeenCalledWith(true);
            expect(screen.queryByTestId('bp-MP3ControlsV2-play-overlay')).not.toBeInTheDocument();
            expect(screen.getByTestId('bp-MP3ControlsV2-loading')).toBeInTheDocument();
            expect(screen.getByTestId('bp-waveform-view')).toHaveAttribute('data-interactive', 'false');
        });

        test('should hide the play overlay while playing and not restore it on pause', async () => {
            const { rerender } = getWrapper({ durationTime: 8, isPlaying: true, peaks: [0.2, 0.8] });

            expect(screen.queryByTestId('bp-MP3ControlsV2-play-overlay')).not.toBeInTheDocument();

            rerender(
                <MP3ControlsV2
                    autoplay={false}
                    durationTime={8}
                    isPlaying={false}
                    onAutoplayChange={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onRateChange={jest.fn()}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    peaks={[0.2, 0.8]}
                    rate="1.0"
                />,
            );

            expect(screen.queryByTestId('bp-MP3ControlsV2-play-overlay')).not.toBeInTheDocument();
        });

        test('should not show zoom while the play overlay is visible', async () => {
            getWrapper({ durationTime: 8, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('bp-MP3ControlsV2-play-overlay')).toBeInTheDocument();
            expect(screen.queryByTestId('bp-waveform-zoom')).not.toBeInTheDocument();
        });

        test('should show zoom after play once real peaks report a max above 1x', async () => {
            getWrapper({ durationTime: 8, isPlaying: true, peaks: [0.2, 0.8] });

            expect(screen.queryByTestId('bp-MP3ControlsV2-play-overlay')).not.toBeInTheDocument();
            expect(await screen.findByTestId('bp-waveform-zoom')).toBeInTheDocument();
        });

        test('should hide zoom until real peaks load', async () => {
            getWrapper({ durationTime: 8 });

            expect(await screen.findByTestId('bp-waveform-view')).toBeInTheDocument();
            expect(screen.queryByTestId('bp-waveform-zoom')).not.toBeInTheDocument();
        });

        test('should keep zoom hidden after play when only placeholder peaks are present', async () => {
            getWrapper({ durationTime: 8, isPlaying: true });

            expect(await screen.findByTestId('bp-waveform-view')).toHaveAttribute('data-interactive', 'true');
            expect(screen.queryByTestId('bp-MP3ControlsV2-play-overlay')).not.toBeInTheDocument();
            expect(screen.queryByTestId('bp-waveform-zoom')).not.toBeInTheDocument();
        });

        test('should open the zoom slider on waveform zoom and dismiss after the delay', async () => {
            jest.useFakeTimers();
            getWrapper({ durationTime: 8, isPlaying: true, peaks: [0.2, 0.8] });

            const control = await screen.findByTestId('bp-waveform-zoom');
            expect(control).not.toHaveClass('bp-is-open');

            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            await user.click(screen.getByTestId('bp-mock-waveform-zoom'));
            expect(control).toHaveClass('bp-is-open');
            expect(screen.getByRole('slider', { name: __('media_zoom_slider') })).toHaveAttribute(
                'aria-valuenow',
                '33',
            );

            act(() => {
                jest.advanceTimersByTime(WAVEFORM_ZOOM_DISMISS_MS - 1);
            });
            expect(control).toHaveClass('bp-is-open');

            act(() => {
                jest.advanceTimersByTime(1);
            });
            expect(control).not.toHaveClass('bp-is-open');
        });

        test('should not open the zoom slider when max zoom drops on resize', async () => {
            jest.useFakeTimers();
            getWrapper({ durationTime: 8, isPlaying: true, peaks: [0.2, 0.8] });

            const control = await screen.findByTestId('bp-waveform-zoom');
            const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
            await user.click(screen.getByTestId('bp-mock-waveform-zoom'));
            expect(control).toHaveClass('bp-is-open');

            act(() => {
                jest.advanceTimersByTime(WAVEFORM_ZOOM_DISMISS_MS);
            });
            expect(control).not.toHaveClass('bp-is-open');

            await user.click(screen.getByTestId('bp-mock-waveform-max-zoom'));
            expect(control).not.toHaveClass('bp-is-open');
        });

        test('should draw host comment_markers on the waveform', async () => {
            getWrapper({ commentMarkers: hostCommentMarkers, durationTime: 180, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('bp-waveform-comment-markers')).toBeInTheDocument();
            const ticks = screen.getAllByTestId('bp-waveform-comment-marker');
            expect(ticks).toHaveLength(1);
            expect(ticks[0]).toHaveStyle({ left: `${(72.729 / 180) * 100}%` });
            expect(ticks[0].querySelector('img')).toHaveAttribute('src', hostCommentMarkers[0].avatarUrl);
        });

        test('should slide host comment_markers with viewport zoom and pan without remounting the photo', async () => {
            getWrapper({ commentMarkers: hostCommentMarkers, durationTime: 180, peaks: [0.2, 0.8] });

            const badge = await screen.findByTestId('bp-waveform-comment-marker');
            const photo = badge.querySelector('img');
            expect(badge).toHaveStyle({ left: `${(72.729 / 180) * 100}%` });

            await userEvent.click(screen.getByTestId('bp-mock-waveform-viewport-zoom'));

            expect(screen.getByTestId('bp-waveform-comment-markers')).toHaveClass('bp-WaveformCommentMarkers--zoomed');
            expect(badge).toHaveStyle({ left: `${(72.729 / 90) * 100}%` });
            expect(badge.querySelector('img')).toBe(photo);

            await userEvent.click(screen.getByTestId('bp-mock-waveform-viewport-pan'));

            expect(badge).toHaveStyle({ left: `${((72.729 - 90) / 90) * 100}%` });
            expect(badge.querySelector('img')).toBe(photo);
        });

        test('should keep comment markers clickable while the play overlay is showing', async () => {
            const onPlayPause = jest.fn();
            const onTimeChange = jest.fn();
            getWrapper({
                commentMarkers: hostCommentMarkers,
                durationTime: 180,
                onPlayPause,
                onTimeChange,
                peaks: [0.2, 0.8],
            });

            expect(await screen.findByTestId('bp-MP3ControlsV2-play-overlay')).toBeInTheDocument();

            await userEvent.click(screen.getAllByTestId('bp-waveform-comment-marker')[0]);

            expect(onPlayPause).toHaveBeenCalledWith(false);
            expect(onTimeChange).toHaveBeenCalledWith(72.729);
            expect(screen.queryByTestId('bp-MP3ControlsV2-play-overlay')).not.toBeInTheDocument();
        });

        test('should seek and pause when a host marker is clicked after play', async () => {
            const onPlayPause = jest.fn();
            const onTimeChange = jest.fn();
            getWrapper({
                commentMarkers: hostCommentMarkers,
                durationTime: 180,
                onPlayPause,
                onTimeChange,
                peaks: [0.2, 0.8],
            });

            await userEvent.click(await screen.findByTestId('bp-MP3ControlsV2-play-overlay'));
            onPlayPause.mockClear();
            await userEvent.click((await screen.findAllByTestId('bp-waveform-comment-marker'))[0]);

            expect(onPlayPause).toHaveBeenCalledWith(false);
            expect(onTimeChange).toHaveBeenCalledWith(72.729);
        });

        test('should pause even when the host supplies a marker click handler', async () => {
            const onCommentMarkerClick = jest.fn();
            const onPlayPause = jest.fn();
            const onTimeChange = jest.fn();
            getWrapper({
                commentMarkers: hostCommentMarkers,
                durationTime: 180,
                isPlaying: true,
                onCommentMarkerClick,
                onPlayPause,
                onTimeChange,
                peaks: [0.2, 0.8],
            });

            await userEvent.click((await screen.findAllByTestId('bp-waveform-comment-marker'))[0]);

            expect(onPlayPause).toHaveBeenCalledWith(false);
            expect(onCommentMarkerClick).toHaveBeenCalledWith(hostCommentMarkers[0]);
            expect(onTimeChange).not.toHaveBeenCalled();
        });

        test('should ring the host-selected comment marker', async () => {
            getWrapper({
                commentMarkers: [{ ...hostCommentMarkers[0], selected: true }],
                durationTime: 180,
                isPlaying: true,
                peaks: [0.2, 0.8],
            });

            expect(await screen.findByTestId('bp-waveform-comment-marker')).toHaveClass(
                'bp-WaveformCommentMarkers-marker--selected',
            );
        });

        test('should hide ticks when the host passes an empty marker list', async () => {
            getWrapper({ commentMarkers: [], durationTime: 10, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('bp-waveform-view')).toBeInTheDocument();
            expect(screen.queryByTestId('bp-waveform-comment-markers')).not.toBeInTheDocument();
        });

        test('should draw host comment_markers that arrive after the first render', async () => {
            const { rerender } = getWrapper({ commentMarkers: [], durationTime: 180, peaks: [0.2, 0.8] });

            expect(await screen.findByTestId('bp-waveform-view')).toBeInTheDocument();
            expect(screen.queryByTestId('bp-waveform-comment-markers')).not.toBeInTheDocument();

            rerender(
                <MP3ControlsV2
                    autoplay={false}
                    commentMarkers={hostCommentMarkers}
                    durationTime={180}
                    onAutoplayChange={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onRateChange={jest.fn()}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    peaks={[0.2, 0.8]}
                    rate="1.0"
                />,
            );

            expect(await screen.findByTestId('bp-waveform-comment-markers')).toBeInTheDocument();
            expect(screen.getByTestId('bp-waveform-comment-marker')).toHaveStyle({
                left: `${(72.729 / 180) * 100}%`,
            });
        });

        test('should place late comment_markers in the current zoomed window', async () => {
            const { rerender } = getWrapper({
                commentMarkers: [],
                durationTime: 180,
                isPlaying: true,
                peaks: [0.2, 0.8],
            });

            await userEvent.click(await screen.findByTestId('bp-mock-waveform-viewport-zoom'));
            expect(screen.queryByTestId('bp-waveform-comment-markers')).not.toBeInTheDocument();

            rerender(
                <MP3ControlsV2
                    autoplay={false}
                    commentMarkers={hostCommentMarkers}
                    durationTime={180}
                    isPlaying
                    onAutoplayChange={jest.fn()}
                    onMuteChange={jest.fn()}
                    onPlayPause={jest.fn()}
                    onRateChange={jest.fn()}
                    onTimeChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    peaks={[0.2, 0.8]}
                    rate="1.0"
                />,
            );

            expect(screen.getByTestId('bp-waveform-comment-markers')).toHaveClass('bp-WaveformCommentMarkers--zoomed');
            expect(screen.getByTestId('bp-waveform-comment-marker')).toHaveStyle({
                left: `${(72.729 / 90) * 100}%`,
            });
        });
    });
});
