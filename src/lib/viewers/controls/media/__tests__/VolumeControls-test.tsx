import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VolumeControls from '../VolumeControls';

describe('VolumeControls', () => {
    const getWrapper = (props = {}) =>
        render(<VolumeControls onMuteChange={jest.fn()} onVolumeChange={jest.fn()} {...props} />);

    const getContainer = async () => screen.findByTestId('bp-volume-controls');
    const getToggle = async () => screen.getByTitle(new RegExp(`^(${__('media_mute')}|${__('media_unmute')})$`));

    describe('event handlers', () => {
        test.each`
            volume | isMuted
            ${0}   | ${false}
            ${0.5} | ${true}
            ${1}   | ${true}
        `('should toggle mute to $isMuted when volume is $volume', async ({ isMuted, volume }) => {
            const onMuteChange = jest.fn();
            getWrapper({ onMuteChange, volume });
            const toggle = await getToggle();

            await userEvent.click(toggle);
            expect(onMuteChange).toHaveBeenCalledWith(isMuted);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const container = await getContainer();

            expect(container).toBeInTheDocument();
        });

        test.each`
            volume  | icon                   | title
            ${0}    | ${'IconVolumeMuted24'} | ${'Unmute'}
            ${0.0}  | ${'IconVolumeMuted24'} | ${'Unmute'}
            ${0.01} | ${'IconVolumeLow24'}   | ${'Mute'}
            ${0.25} | ${'IconVolumeLow24'}   | ${'Mute'}
            ${0.33} | ${'IconVolumeMed24'}   | ${'Mute'}
            ${0.51} | ${'IconVolumeMed24'}   | ${'Mute'}
            ${0.66} | ${'IconVolumeMax24'}   | ${'Mute'}
            ${1.0}  | ${'IconVolumeMax24'}   | ${'Mute'}
        `('should render the correct icon and title for volume $volume', async ({ icon, title, volume }) => {
            getWrapper({ volume });
            const iconElement = await screen.findByTestId(icon);
            const toggle = await screen.findByTitle(title);

            expect(iconElement).toBeInTheDocument();
            expect(toggle).toBeInTheDocument();
        });

        test.each`
            volume   | value
            ${0}     | ${5}
            ${0.0}   | ${5}
            ${0.01}  | ${1}
            ${0.25}  | ${25}
            ${0.254} | ${25}
            ${0.255} | ${26}
            ${1.0}   | ${100}
        `('should render the correct track height for volume $volume', async ({ value, volume }) => {
            const max = 100;
            getWrapper({ volume, max });

            const sliderTrack = await screen.findByTestId('bp-volume-slider-control-track');

            expect(sliderTrack).toHaveStyle({ height: `${value}%` });
        });
    });
});
