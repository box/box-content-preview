import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimationClipsControl, { formatDuration, Props as AnimationClipsControlProps } from '../AnimationClipsControl';

describe('AnimationClipsControl', () => {
    const animationClips = [
        { duration: 1, id: '1', name: 'first' },
        { duration: 2, id: '2', name: 'second' },
    ];
    const getDefaults = (): AnimationClipsControlProps => ({
        animationClips,
        currentAnimationClipId: '1',
        onAnimationClipSelect: jest.fn(),
    });
    const renderView = (props = {}) => render(<AnimationClipsControl {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should return a valid screen', () => {
            renderView();

            expect(screen.getByTitle('Animation clips')).toBeInTheDocument();
            expect(screen.getByTestId('bp-settings-flyout')).toBeInTheDocument();
        });

        test('should return the animationClips as RadioItems', async () => {
            const onAnimationClipSelect = jest.fn();
            renderView({ onAnimationClipSelect });

            await userEvent.click(screen.getByTitle('Animation clips'));

            const radioItems = screen.queryAllByRole('menuitemradio');

            expect(radioItems).toHaveLength(2);
            expect(radioItems.at(0)?.textContent?.includes('00:00:01 first')).toBe(true);
            expect(radioItems.at(0)).toHaveAttribute('aria-checked', 'true');
            expect(radioItems.at(1)?.textContent?.includes('00:00:02 second')).toBe(true);
            expect(radioItems.at(1)).toHaveAttribute('aria-checked', 'false');

            await userEvent.click(screen.getByRole('menuitemradio', { name: '00:00:01 first' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith(animationClips[0].id);

            await userEvent.click(screen.getByRole('menuitemradio', { name: '00:00:02 second' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith(animationClips[1].id);
        });
    });

    describe('formatDuration()', () => {
        test.each`
            time    | expectedString
            ${0}    | ${'00:00:00'}
            ${59}   | ${'00:00:59'}
            ${61}   | ${'00:01:01'}
            ${3599} | ${'00:59:59'}
            ${3661} | ${'01:01:01'}
        `('should format $time as $expectedString', ({ time, expectedString }) => {
            expect(formatDuration(time)).toBe(expectedString);
        });
    });
});
