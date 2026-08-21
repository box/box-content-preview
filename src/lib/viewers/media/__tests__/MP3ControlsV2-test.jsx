import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MP3ControlsV2 from '../MP3ControlsV2';

jest.mock('../waveform/WaveformView', () => {
    const React = require('react');

    return function MockWaveformView({ interactive }) {
        return <div data-interactive={interactive ? 'true' : 'false'} data-testid="bp-waveform-view" />;
    };
});

describe('MP3ControlsV2', () => {
    const getWrapper = (props = {}) =>
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
    });
});
