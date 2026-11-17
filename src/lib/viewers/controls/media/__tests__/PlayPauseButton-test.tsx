import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlueprintProviders from '../../../../BlueprintProviders';
import PlayPauseButton from '../PlayPauseButton';

describe('PlayPauseButton', () => {
    const getWrapper = (props = {}) =>
        render(<PlayPauseButton onPlayPause={jest.fn()} {...props} />, { wrapper: BlueprintProviders });

    test.each`
        isBlueprintEnabled | isPlaying | name
        ${false}           | ${false}  | ${__('media_play')}
        ${false}           | ${true}   | ${__('media_pause')}
        ${true}            | ${false}  | ${__('media_play')}
        ${true}            | ${true}   | ${__('media_pause')}
    `(
        'should toggle playback when isBlueprintEnabled is $isBlueprintEnabled and isPlaying is $isPlaying',
        async ({ isPlaying, name, isBlueprintEnabled }) => {
            const onPlayPause = jest.fn();
            getWrapper({ isPlaying, onPlayPause, isBlueprintEnabled });

            const button = screen.getByRole('button', { name });
            expect(button).toHaveAttribute('data-resin-target', 'playPause');

            await userEvent.click(button);
            expect(onPlayPause).toHaveBeenCalledWith(!isPlaying);
        },
    );

    test('should apply the className to the legacy button only', () => {
        const { rerender } = getWrapper({ className: 'bp-Test' });
        expect(screen.getByRole('button')).toHaveClass('bp-Test');

        rerender(<PlayPauseButton className="bp-Test" onPlayPause={jest.fn()} isBlueprintEnabled />);
        expect(screen.getByRole('button')).not.toHaveClass('bp-Test');
    });
});
