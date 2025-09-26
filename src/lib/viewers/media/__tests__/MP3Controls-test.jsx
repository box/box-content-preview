import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MP3Controls from '../MP3Controls';

describe('MP3Controls', () => {
    const getWrapper = (props = {}) =>
        render(
            <MP3Controls
                autoplay={false}
                movePlayback={jest.fn()}
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
        test('should return a valid wrapper', async () => {
            getWrapper();
            const container = await screen.findByTestId('media-controls-wrapper');

            expect(container).toBeInTheDocument();
        });

        test('should pass down props to MediaSettings', async () => {
            const onAutoplayChange = jest.fn();
            const onRateChange = jest.fn();
            getWrapper({ onAutoplayChange, onRateChange });
            await userEvent.click(screen.getByTitle('Settings'));
            const autoplayToggle = await screen.findByRole('menuitemradio', { name: __('media_autoplay_enabled') });
            const rateToggle = await screen.findByRole('menuitemradio', { name: '1.5' });

            await userEvent.click(autoplayToggle);
            await userEvent.click(rateToggle);

            expect(onAutoplayChange).toHaveBeenCalled();
            expect(onRateChange).toHaveBeenCalled();
        });

        test('should pass down props to PlayPauseToggle', async () => {
            const onPlayPause = jest.fn();
            getWrapper({ onPlayPause });
            const toggle = await screen.findByTitle(__('media_play'));

            await userEvent.click(toggle);

            expect(onPlayPause).toHaveBeenCalled();
        });

        test('should pass down props to TimeControls', async () => {
            const onTimeChange = jest.fn();
            getWrapper({ onTimeChange });
            const slider = await screen.findByRole('slider', { name: __('media_time_slider') });

            fireEvent.keyDown(slider, { key: 'ArrowLeft' });

            expect(onTimeChange).toHaveBeenCalled();
        });

        test('should pass down props to VolumeControls', async () => {
            const onMuteChange = jest.fn();
            const onVolumeChange = jest.fn();
            getWrapper({ onMuteChange, onVolumeChange });
            const volume = await screen.findByRole('slider', { name: __('media_volume_slider') });
            const muteButton = await screen.findByTitle(__('media_mute'));

            fireEvent.keyDown(volume, { key: 'ArrowLeft' });
            await userEvent.click(muteButton);

            expect(onVolumeChange).toHaveBeenCalled();
            expect(onMuteChange).toHaveBeenCalled();
        });
    });
});
