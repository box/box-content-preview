import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VolumeControls, { VOLUME_FLYOUT_DISMISS_MS } from '../VolumeControls';

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

            expect(sliderTrack.querySelector('.bp-VolumeVerticalSliderControl-track')).toHaveStyle({
                height: `${value}%`,
            });
        });
    });

    describe('keyboard reveal', () => {
        afterEach(() => {
            jest.useRealTimers();
        });

        test('should open the volume flyout on keyboardVolumeStep and dismiss after the delay', () => {
            jest.useFakeTimers();
            const { rerender } = getWrapper();
            const flyout = screen.getByTestId('bp-volume-controls').querySelector('.bp-VolumeControls-flyout');

            expect(flyout).not.toHaveClass('bp-is-open');

            rerender(
                <VolumeControls
                    keyboardVolumeStep={1}
                    onMuteChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    volume={1}
                />,
            );
            expect(flyout).toHaveClass('bp-is-open');

            act(() => {
                jest.advanceTimersByTime(VOLUME_FLYOUT_DISMISS_MS - 1);
            });
            expect(flyout).toHaveClass('bp-is-open');

            act(() => {
                jest.advanceTimersByTime(1);
            });
            expect(flyout).not.toHaveClass('bp-is-open');
        });

        test('should keep the flyout open when keyboardVolumeStep is bumped again', () => {
            jest.useFakeTimers();
            const { rerender } = getWrapper({ keyboardVolumeStep: 1 });
            const flyout = screen.getByTestId('bp-volume-controls').querySelector('.bp-VolumeControls-flyout');

            expect(flyout).toHaveClass('bp-is-open');

            act(() => {
                jest.advanceTimersByTime(VOLUME_FLYOUT_DISMISS_MS - 1);
            });
            rerender(
                <VolumeControls
                    keyboardVolumeStep={2}
                    onMuteChange={jest.fn()}
                    onVolumeChange={jest.fn()}
                    volume={1}
                />,
            );

            act(() => {
                jest.advanceTimersByTime(VOLUME_FLYOUT_DISMISS_MS - 1);
            });
            expect(flyout).toHaveClass('bp-is-open');

            act(() => {
                jest.advanceTimersByTime(1);
            });
            expect(flyout).not.toHaveClass('bp-is-open');
        });
    });

    describe('tab order', () => {
        test('should tab from the mute button to the slider when the flyout is open', async () => {
            const user = userEvent.setup();
            const onVolumeChange = jest.fn();
            getWrapper({ onVolumeChange, volume: 0.5 });

            const slider = screen.getByRole('slider', { hidden: true, name: __('media_volume_slider') });
            expect(slider).toHaveAttribute('tabIndex', '-1');

            await user.tab();
            expect(await getToggle()).toHaveFocus();
            expect(slider).toHaveAttribute('tabIndex', '0');

            await user.tab();
            expect(slider).toHaveFocus();

            await user.keyboard('{ArrowUp}');
            expect(onVolumeChange).toHaveBeenCalled();
        });

        test('should close the flyout when tabbing out', async () => {
            const user = userEvent.setup();
            render(
                <>
                    <VolumeControls onMuteChange={jest.fn()} onVolumeChange={jest.fn()} volume={0.5} />
                    <button type="button">next</button>
                </>,
            );
            const flyout = screen.getByTestId('bp-volume-controls').querySelector('.bp-VolumeControls-flyout');

            await user.tab();
            expect(await getToggle()).toHaveFocus();
            expect(flyout).toHaveClass('bp-is-open');

            await user.tab();
            expect(screen.getByRole('slider', { name: __('media_volume_slider') })).toHaveFocus();
            expect(flyout).toHaveClass('bp-is-open');

            await user.tab();
            expect(screen.getByRole('button', { name: 'next' })).toHaveFocus();
            expect(flyout).not.toHaveClass('bp-is-open');
        });
    });
});
