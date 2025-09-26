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
            volume   | track                                                   | value
            ${0}     | ${`linear-gradient(to right, #0061d5 0%, #fff 0%)`}     | ${0}
            ${0.0}   | ${`linear-gradient(to right, #0061d5 0%, #fff 0%)`}     | ${0}
            ${0.01}  | ${`linear-gradient(to right, #0061d5 1%, #fff 1%)`}     | ${1}
            ${0.25}  | ${`linear-gradient(to right, #0061d5 25%, #fff 25%)`}   | ${25}
            ${0.254} | ${`linear-gradient(to right, #0061d5 25%, #fff 25%)`}   | ${25}
            ${0.255} | ${`linear-gradient(to right, #0061d5 26%, #fff 26%)`}   | ${26}
            ${1.0}   | ${`linear-gradient(to right, #0061d5 100%, #fff 100%)`} | ${100}
        `('should render the correct track and value for volume $volume', async ({ track, value, volume }) => {
            const max = 100;
            getWrapper({ volume, max });

            const sliderTrack = await screen.findByTestId('bp-slider-control-track');
            const sliderThumb = await screen.findByTestId('bp-slider-control-thumb');

            expect(sliderTrack).toHaveStyle({ backgroundImage: track });
            expect(sliderThumb).toHaveStyle({ left: `${(value / max) * 100}%` });
        });
    });
});
