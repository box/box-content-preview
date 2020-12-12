import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconPause24 from '../../icons/IconPause24';
import IconPlay24 from '../../icons/IconPlay24';
import MediaToggle from '../MediaToggle';
import PlayPauseToggle from '../PlayPauseToggle';

describe('PlayPauseToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper => shallow(<PlayPauseToggle onPlayPause={jest.fn()} {...props} />);

    describe('event handlers', () => {
        test('should toggle isPlaying when clicked', () => {
            const onPlayPause = jest.fn();
            const wrapper = getWrapper({ isPlaying: false, onPlayPause });
            const toggle = wrapper.find(MediaToggle);

            toggle.simulate('click');
            expect(onPlayPause).toBeCalledWith(true);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-PlayPauseToggle')).toBe(true);
        });

        test.each`
            isPlaying | icon           | title
            ${true}   | ${IconPause24} | ${'Pause'}
            ${false}  | ${IconPlay24}  | ${'Play'}
        `('should render the correct icon and title if isPlaying is $isPlaying', ({ isPlaying, icon, title }) => {
            const wrapper = getWrapper({ isPlaying });

            expect(wrapper.exists(icon)).toBe(true);
            expect(wrapper.prop('title')).toBe(title);
        });
    });
});
