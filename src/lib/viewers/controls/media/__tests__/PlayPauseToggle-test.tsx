import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import PlayPauseToggle from '../PlayPauseToggle';

describe('PlayPauseToggle', () => {
    const getWrapper = (props = {}) =>
        render(<PlayPauseToggle onPlayPause={jest.fn()} {...props} />, { wrapper: BlueprintProviders });
    const getToggle = async () => screen.findByRole('button', { name: __('media_play') });
    const getForwardToggle = async () => screen.findByRole('button', { name: __('media_skip_forward') });
    const getBackwardToggle = async () => screen.findByRole('button', { name: __('media_skip_backward') });

    describe('event handlers', () => {
        test('should toggle isPlaying when clicked', async () => {
            const onPlayPause = jest.fn();
            getWrapper({ isPlaying: false, onPlayPause });
            const toggle = await getToggle();

            await userEvent.click(toggle);
            expect(onPlayPause).toHaveBeenCalledWith(true);
        });

        test('should call movePlayback when seek backward and forward buttons are clicked', async () => {
            const movePlayback = jest.fn();
            getWrapper({ movePlayback });
            const toggle = await getForwardToggle();
            await userEvent.click(toggle);
            expect(movePlayback).toHaveBeenCalledWith(true, 5);

            const backwardToggle = await getBackwardToggle();
            await userEvent.click(backwardToggle);
            expect(movePlayback).toHaveBeenCalledWith(false, 5);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();
            const toggle = await getToggle();

            expect(toggle).toBeInTheDocument();
        });

        test('should hide skip buttons when hasSkipButtons is false', async () => {
            getWrapper({ hasSkipButtons: false });

            expect(await getToggle()).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('media_skip_forward') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('media_skip_backward') })).not.toBeInTheDocument();
        });

        test.each`
            isPlaying | icon             | title
            ${true}   | ${'IconPause24'} | ${'Pause'}
            ${false}  | ${'IconPlay24'}  | ${'Play'}
        `('should render the correct icon and title if isPlaying is $isPlaying', async ({ isPlaying, icon, title }) => {
            getWrapper({ isPlaying });
            const iconElement = await screen.findByTestId(icon);
            const titleElement = await screen.findByTitle(title);

            expect(iconElement).toBeInTheDocument();
            expect(titleElement).toBeInTheDocument();
        });
    });

    describe('Blueprint', () => {
        test('should toggle isPlaying when the Blueprint play button is clicked', async () => {
            const onPlayPause = jest.fn();
            getWrapper({ isPlaying: false, onPlayPause, isBlueprintEnabled: true });

            await userEvent.click(await getToggle());
            expect(onPlayPause).toHaveBeenCalledWith(true);
        });

        test('should call movePlayback from Blueprint skip buttons', async () => {
            const movePlayback = jest.fn();
            getWrapper({ movePlayback, isBlueprintEnabled: true });

            await userEvent.click(await getForwardToggle());
            expect(movePlayback).toHaveBeenCalledWith(true, 5);

            await userEvent.click(await getBackwardToggle());
            expect(movePlayback).toHaveBeenCalledWith(false, 5);
        });

        test('should keep resin targets and accessible labels on Blueprint buttons', async () => {
            getWrapper({ isBlueprintEnabled: true });

            const play = await getToggle();
            expect(play).toHaveAttribute('data-resin-target', 'playPause');
            expect(play).toHaveAttribute('aria-label', __('media_play'));
            expect(await getForwardToggle()).toHaveAttribute('data-resin-target', 'skipForward');
            expect(await getBackwardToggle()).toHaveAttribute('data-resin-target', 'skipBackward');
        });

        test('should show a Blueprint tooltip instead of a native title', async () => {
            getWrapper({ isBlueprintEnabled: true });

            const play = await getToggle();
            expect(play).not.toHaveAttribute('title');

            await userEvent.hover(play);
            expect(await screen.findByRole('tooltip', { name: __('media_play') })).toBeInTheDocument();
        });

        test('should stop Enter from bubbling so the viewer does not double-handle playback', async () => {
            const onParentKeyDown = jest.fn();
            render(
                <div onKeyDown={onParentKeyDown} role="presentation">
                    <PlayPauseToggle onPlayPause={jest.fn()} isBlueprintEnabled />
                </div>,
                { wrapper: BlueprintProviders },
            );

            fireEvent.keyDown(await getToggle(), { key: 'Enter' });
            expect(onParentKeyDown).not.toHaveBeenCalled();
        });

        test('should hide skip buttons when hasSkipButtons is false', async () => {
            getWrapper({ hasSkipButtons: false, isBlueprintEnabled: true });

            expect(await getToggle()).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('media_skip_forward') })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: __('media_skip_backward') })).not.toBeInTheDocument();
        });
    });
});
