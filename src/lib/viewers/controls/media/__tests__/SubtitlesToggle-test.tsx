import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaToggle from '../MediaToggle';
import SubtitlesToggle from '../SubtitlesToggle';
import subtitles from '../__mocks__/subtitles';

describe('SubtitlesToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<SubtitlesToggle isShowingSubtitles onSubtitlesToggle={jest.fn()} subtitles={subtitles} {...props} />);

    describe('event handlers', () => {
        test('should toggle isShowingSubtitles when clicked', () => {
            const onSubtitlesToggle = jest.fn();
            const wrapper = getWrapper({ isShowingSubtitles: false, onSubtitlesToggle });
            const toggle = wrapper.find(MediaToggle);

            toggle.simulate('click');
            expect(onSubtitlesToggle).toBeCalledWith(true);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-SubtitlesToggle')).toBe(true);
        });

        test('should return null if no subtitles are passed in', () => {
            const wrapper = getWrapper({ subtitles: [] });

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test.each([true, false])(
            'should set the aria-pressed attribute correspondingly when isShowingSubtitles is %s',
            isShowingSubtitles => {
                const wrapper = getWrapper({ isShowingSubtitles });

                expect(wrapper.prop('aria-pressed')).toBe(isShowingSubtitles);
            },
        );
    });
});
