import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import fullscreen from '../../../../Fullscreen';
import FullscreenToggle from '../FullscreenToggle';
import IconFullscreenIn24 from '../../icons/IconFullscreenIn24';
import IconFullscreenOut24 from '../../icons/IconFullscreenOut24';

describe('FullscreenToggle', () => {
    const getButton = (wrapper: ReactWrapper): ReactWrapper => wrapper.childAt(0);
    const getWrapper = (props = {}): ReactWrapper =>
        mount(<FullscreenToggle onFullscreenToggle={jest.fn()} {...props} />);

    describe('event handlers', () => {
        test('should respond to fullscreen events', () => {
            const wrapper = getWrapper();

            act(() => {
                fullscreen.enter();
            });
            wrapper.update();

            expect(getButton(wrapper).exists(IconFullscreenOut24)).toBe(true);
            expect(getButton(wrapper).prop('title')).toBe(__('exit_fullscreen'));

            act(() => {
                fullscreen.exit();
            });
            wrapper.update();

            expect(getButton(wrapper).exists(IconFullscreenIn24)).toBe(true);
            expect(getButton(wrapper).prop('title')).toBe(__('enter_fullscreen'));
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
            const button = getButton(wrapper);

            expect(button.hasClass('bp-FullscreenToggle')).toBe(true);
        });
    });
});
