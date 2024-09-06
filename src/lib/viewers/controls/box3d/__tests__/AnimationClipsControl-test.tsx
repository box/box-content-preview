import React from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import AnimationClipsControl, { formatDuration, Props as AnimationClipsControlProps } from '../AnimationClipsControl';
import Settings from '../../settings';

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
    const getWrapper = (props = {}) => render(<AnimationClipsControl {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.queryByTitle('Animation clips')).toBeInTheDocument();
            expect(wrapper.queryByTestId('bp-settings-flyout')).toBeInTheDocument();
        });

        test('should return the animationClips as RadioItems', () => {
            const onAnimationClipSelect = jest.fn();
            const wrapper = getWrapper({ onAnimationClipSelect });
            act(() => {
                wrapper.queryByTitle('Animation clips')?.click();
            });

            const radioItems = wrapper.queryAllByRole('menuitemradio');

            expect(radioItems).toHaveLength(2);
            expect(radioItems.at(0)?.textContent?.includes('00:00:01 first')).toBe(true);
            expect(radioItems.at(0)).toHaveAttribute('aria-checked', 'true');
            expect(radioItems.at(1)?.textContent?.includes('00:00:02 second')).toBe(true);
            expect(radioItems.at(1)).toHaveAttribute('aria-checked', 'false');

            act(() => radioItems.at(0)?.click());
            expect(onAnimationClipSelect).toHaveBeenCalledWith(animationClips[0].id);

            act(() => radioItems.at(1)?.click());
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
