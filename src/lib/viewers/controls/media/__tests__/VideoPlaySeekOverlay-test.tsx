import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import VideoPlaySeekOverlay from '../VideoPlaySeekOverlay';

describe('VideoPlaySeekOverlay', () => {
    const renderComponent = (props = {}) => {
        const defaults = { movePlayback: jest.fn(), onPlay: jest.fn() };
        render(<VideoPlaySeekOverlay {...defaults} {...props} />, { wrapper: BlueprintProviders });
        return { ...defaults, ...props };
    };

    test('should render skip backward, play, and skip forward in order', () => {
        renderComponent();

        expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
            'Skip backward',
            'Play',
            'Skip forward',
        ]);
    });

    test('should tag the play button for resin', () => {
        renderComponent();

        expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('data-resin-target', 'playOverlay');
    });

    test('should call onPlay when play is clicked', async () => {
        const { onPlay } = renderComponent();

        await userEvent.click(screen.getByRole('button', { name: 'Play' }));

        expect(onPlay).toHaveBeenCalledTimes(1);
    });

    test.each`
        name               | isForward
        ${'Skip backward'} | ${false}
        ${'Skip forward'}  | ${true}
    `('should move playback when $name is clicked', async ({ name, isForward }) => {
        const { movePlayback } = renderComponent();

        await userEvent.click(screen.getByRole('button', { name }));

        expect(movePlayback).toHaveBeenCalledWith(isForward, 5);
    });
});
