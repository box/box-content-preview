import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnimationClipsControl, { formatDuration } from '../AnimationClipsControl';

describe('AnimationClipsControl', () => {
    describe('render', () => {
        test('should return a valid screen', () => {
            render(
                <AnimationClipsControl
                    animationClips={[
                        { duration: 1, id: '1', name: 'first' },
                        { duration: 2, id: '2', name: 'second' },
                    ]}
                    currentAnimationClipId="1"
                    onAnimationClipSelect={jest.fn()}
                />,
            );

            expect(screen.getByTitle('Animation clips')).toBeInTheDocument();
            expect(screen.getByTestId('bp-settings-flyout')).toBeInTheDocument();
        });

        test('should return the animationClips as RadioItems', async () => {
            const user = userEvent.setup();
            const onAnimationClipSelect = jest.fn();
            render(
                <AnimationClipsControl
                    animationClips={[
                        { duration: 1, id: '1', name: 'first' },
                        { duration: 2, id: '2', name: 'second' },
                    ]}
                    currentAnimationClipId="1"
                    onAnimationClipSelect={onAnimationClipSelect}
                />,
            );

            await user.click(screen.getByTitle('Animation clips'));

            const radioItems = screen.queryAllByRole('menuitemradio');

            expect(radioItems).toHaveLength(2);
            expect(radioItems.at(0)?.textContent?.includes('00:00:01 first')).toBe(true);
            expect(radioItems.at(0)).toHaveAttribute('aria-checked', 'true');
            expect(radioItems.at(1)?.textContent?.includes('00:00:02 second')).toBe(true);
            expect(radioItems.at(1)).toHaveAttribute('aria-checked', 'false');

            await user.click(screen.getByRole('menuitemradio', { name: '00:00:01 first' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith('1');

            await user.click(screen.getByRole('menuitemradio', { name: '00:00:02 second' }));

            expect(onAnimationClipSelect).toHaveBeenCalledWith('2');
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
