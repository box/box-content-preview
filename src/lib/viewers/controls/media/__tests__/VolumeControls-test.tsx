import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Volume0, Volume1, Volume2, VolumeX } from '@box/blueprint-web-assets/icons/Medium';
import BlueprintProviders from '../../../../BlueprintProviders';
import VolumeControls, { getIcon, VOLUME_FLYOUT_DISMISS_MS } from '../VolumeControls';

describe('VolumeControls', () => {
    const getWrapper = (props = {}) =>
        render(<VolumeControls onMuteChange={jest.fn()} onVolumeChange={jest.fn()} {...props} />, {
            wrapper: BlueprintProviders,
        });

    const getContainer = async () => screen.findByTestId('bp-volume-controls');
    const getToggle = async () =>
        screen.getByRole('button', { name: new RegExp(`^(${__('media_mute')}|${__('media_unmute')})$`) });

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

        test('should open the slider on the first collapsed press and mute on the next', async () => {
            const user = userEvent.setup();
            const onMuteChange = jest.fn();
            getWrapper({ onMuteChange, volume: 1 });

            const container = await getContainer();
            const flyout = container.querySelector('.bp-VolumeControls-flyout');
            const toggle = await getToggle();
            expect(flyout).not.toHaveClass('bp-is-open');

            await user.pointer({ keys: '[TouchA]', target: toggle });
            expect(flyout).toHaveClass('bp-is-open');
            expect(onMuteChange).not.toHaveBeenCalled();
            expect(screen.getByRole('slider', { name: __('media_volume_slider') })).toBeInTheDocument();

            await user.pointer({ keys: '[TouchA]', target: toggle });
            expect(onMuteChange).toHaveBeenCalledWith(true);
        });

        test('should collapse a pinned volume flyout when tapping outside', async () => {
            const user = userEvent.setup();
            getWrapper({ volume: 1 });

            const container = await getContainer();
            const flyout = container.querySelector('.bp-VolumeControls-flyout');
            await user.pointer({ keys: '[TouchA]', target: await getToggle() });
            expect(flyout).toHaveClass('bp-is-open');

            await user.pointer({ keys: '[TouchA>]', target: document.body });
            expect(flyout).not.toHaveClass('bp-is-open');
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

    describe('Blueprint', () => {
        test.each`
            volume  | icon
            ${0}    | ${VolumeX}
            ${0.0}  | ${VolumeX}
            ${0.01} | ${Volume0}
            ${0.25} | ${Volume0}
            ${0.33} | ${Volume1}
            ${0.51} | ${Volume1}
            ${0.66} | ${Volume2}
            ${1.0}  | ${Volume2}
        `('should map volume $volume to the Blueprint volume icon', ({ icon, volume }) => {
            expect(getIcon(volume, true)).toBe(icon);
        });

        test.each`
            volume | isMuted
            ${0}   | ${false}
            ${0.5} | ${true}
            ${1}   | ${true}
        `('should toggle mute to $isMuted when volume is $volume', async ({ isMuted, volume }) => {
            const onMuteChange = jest.fn();
            getWrapper({ onMuteChange, isBlueprintEnabled: true, volume });

            await userEvent.click(await getToggle());
            expect(onMuteChange).toHaveBeenCalledWith(isMuted);
        });

        test('should open the slider on the first collapsed press and mute on the next', async () => {
            const user = userEvent.setup();
            const onMuteChange = jest.fn();
            getWrapper({ onMuteChange, isBlueprintEnabled: true, volume: 1 });

            const container = await getContainer();
            const flyout = container.querySelector('.bp-VolumeControls-flyout');
            const toggle = await getToggle();
            expect(flyout).not.toHaveClass('bp-is-open');

            await user.pointer({ keys: '[TouchA]', target: toggle });
            expect(flyout).toHaveClass('bp-is-open');
            expect(onMuteChange).not.toHaveBeenCalled();
            expect(screen.getByRole('slider', { name: __('media_volume_slider') })).toBeInTheDocument();

            await user.pointer({ keys: '[TouchA]', target: toggle });
            expect(onMuteChange).toHaveBeenCalledWith(true);
        });

        test('should keep resin, labels, and the Preview slider on the Blueprint mute control', async () => {
            getWrapper({ isBlueprintEnabled: true, volume: 1 });

            const toggle = await getToggle();
            expect(toggle).toHaveAttribute('data-resin-target', 'volumeToggle');
            expect(toggle).toHaveAttribute('aria-label', __('media_mute'));
            expect(toggle).not.toHaveAttribute('title');
            expect(screen.queryByTestId('IconVolumeMax24')).not.toBeInTheDocument();
            expect(screen.getByRole('slider', { hidden: true, name: __('media_volume_slider') })).toBeInTheDocument();
        });

        test('should add the Blueprint modifier only when isBlueprintEnabled is true', async () => {
            const { rerender } = getWrapper({ isBlueprintEnabled: true });
            expect(await getContainer()).toHaveClass('bp-VolumeControls--blueprint');

            rerender(<VolumeControls onMuteChange={jest.fn()} onVolumeChange={jest.fn()} />);
            expect(await getContainer()).not.toHaveClass('bp-VolumeControls--blueprint');
        });

        test('should show the Blueprint mute tooltip on hover', async () => {
            getWrapper({ isBlueprintEnabled: true, volume: 1 });

            await userEvent.hover(await getToggle());
            expect(await screen.findByRole('tooltip', { name: __('media_mute') })).toBeInTheDocument();
        });

        test('should tab from the Blueprint mute button to the slider when the flyout is open', async () => {
            const user = userEvent.setup();
            const onVolumeChange = jest.fn();
            getWrapper({ onVolumeChange, isBlueprintEnabled: true, volume: 0.5 });

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
    });
});
