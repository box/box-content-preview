import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import AnimationClipsControl, { formatDuration, Props as AnimationClipsControlProps } from '../AnimationClipsControl';
import AnimationClipsToggle from '../AnimationClipsToggle';
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
    const getWrapper = (props = {}): ShallowWrapper => shallow(<AnimationClipsControl {...getDefaults()} {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.find(Settings).props()).toMatchObject({
                className: 'bp-AnimationClipsControl',
                toggle: AnimationClipsToggle,
            });
            expect(wrapper.exists(Settings.Menu)).toBe(true);
        });

        test('should return the animationClips as RadioItems', () => {
            const onAnimationClipSelect = jest.fn();
            const wrapper = getWrapper({ onAnimationClipSelect });
            const radioItems = wrapper.find(Settings.RadioItem);

            expect(radioItems).toHaveLength(2);
            expect(radioItems.at(0).props()).toMatchObject({
                className: 'bp-AnimationClipsControl-radioItem',
                isSelected: true,
                label: '00:00:01 first',
                onChange: onAnimationClipSelect,
                value: animationClips[0].id,
            });
            expect(radioItems.at(1).props()).toMatchObject({
                className: 'bp-AnimationClipsControl-radioItem',
                isSelected: false,
                label: '00:00:02 second',
                onChange: onAnimationClipSelect,
                value: animationClips[1].id,
            });
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
