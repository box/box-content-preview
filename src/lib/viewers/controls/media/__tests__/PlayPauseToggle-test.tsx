import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayPauseToggle from '../PlayPauseToggle';

describe('PlayPauseToggle', () => {
    const getWrapper = (props = {}) => render(<PlayPauseToggle onPlayPause={jest.fn()} {...props} />);
    const getToggle = async () => screen.findByTitle(__('media_play'));
    const getForwardToggle = async () => screen.findByTitle(__('media_skip_forward'));
    const getBackwardToggle = async () => screen.findByTitle(__('media_skip_backward'));

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
});
