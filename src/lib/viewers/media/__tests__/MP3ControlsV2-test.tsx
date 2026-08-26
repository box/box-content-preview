import React, { useEffect as mockUseEffect } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MP3ControlsV2, { Props } from '../MP3ControlsV2';
import { WAVEFORM_ZOOM_DISMISS_MS } from '../waveform/constants';

jest.mock('../waveform/WaveformView', () => {
    function MockWaveformView({
        interactive,
        onViewportChange,
        onZoomChange,
    }: {
        interactive?: boolean;
        onViewportChange?: (viewport: { maxZoom: number; widthPx: number }) => void;
        onZoomChange?: (zoomLevel: number) => void;
    }): JSX.Element {
        mockUseEffect(() => {
            onViewportChange?.({ maxZoom: 4, widthPx: 800 });
        }, [onViewportChange]);
        return (
            <div data-interactive={interactive ? 'true' : 'false'} data-testid="bp-waveform-view">
                <button data-testid="bp-mock-waveform-zoom" onClick={() => onZoomChange?.(2)} type="button">
                    zoom
                </button>
                <button
                    data-testid="bp-mock-waveform-max-zoom"
                    onClick={() => onViewportChange?.({ maxZoom: 1.2, widthPx: 1600 })}
                    type="button"
                >
                    resize
                </button>
            </div>
        );
    }

    return MockWaveformView;
});

describe('MP3ControlsV2', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

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
    });
});
