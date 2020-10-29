import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import Fullscreen from '../../../../Fullscreen';
import FullscreenToggle from '../FullscreenToggle';
import IconFullscreenIn24 from '../../icons/IconFullscreenIn24';
import IconFullscreenOut24 from '../../icons/IconFullscreenOut24';

describe('FullscreenToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<FullscreenToggle onFullscreenToggle={jest.fn()} {...props} />);

    beforeEach(() => {
        jest.spyOn(React, 'useEffect').mockImplementation(fn => fn());
    });

    describe('event handlers', () => {
        test('should respond to fullscreen events', () => {
            const wrapper = getWrapper();

            Fullscreen.enter();
            expect(wrapper.exists(IconFullscreenOut24)).toBe(true);
            expect(wrapper.prop('title')).toBe(__('exit_fullscreen'));

            Fullscreen.exit();
            expect(wrapper.exists(IconFullscreenIn24)).toBe(true);
            expect(wrapper.prop('title')).toBe(__('enter_fullscreen'));
        });

        test('should invoke onFullscreenToggle prop on click', () => {
            const onToggle = jest.fn();
            const wrapper = getWrapper({ onFullscreenToggle: onToggle });

            wrapper.simulate('click');
            expect(onToggle).toBeCalledWith(true);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-FullscreenToggle')).toBe(true);
        });
    });
});
