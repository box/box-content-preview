import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import ControlsLayer, { Helpers, HIDE_DELAY_MS, SHOW_CLASSNAME } from '../ControlsLayer';

describe('ControlsLayer', () => {
    const children = <div className="TestControls">Controls</div>;
    const getElement = (wrapper: ReactWrapper): ReactWrapper => wrapper.childAt(0);
    const getWrapper = (props = {}): ReactWrapper => mount(<ControlsLayer {...props}>{children}</ControlsLayer>);

    beforeEach(() => {
        jest.useFakeTimers();
    });

    describe('event handlers', () => {
        test.each(['focus', 'mouseenter'])('should show the controls %s', eventProp => {
            const wrapper = getWrapper();

            act(() => {
                getElement(wrapper).simulate(eventProp);
            });
            wrapper.update();

            expect(getElement(wrapper).hasClass(SHOW_CLASSNAME)).toBe(true);
        });

        test.each`
            showTrigger     | hideTrigger
            ${'focus'}      | ${'blur'}
            ${'mouseenter'} | ${'mouseleave'}
        `('should show $showTrigger and hide $hideTrigger', ({ hideTrigger, showTrigger }) => {
            const wrapper = getWrapper();

            act(() => {
                getElement(wrapper).simulate(showTrigger);
            });
            wrapper.update();

            expect(getElement(wrapper).hasClass(SHOW_CLASSNAME)).toBe(true);

            act(() => {
                getElement(wrapper).simulate(hideTrigger);
                jest.advanceTimersByTime(HIDE_DELAY_MS);
            });
            wrapper.update();

            expect(getElement(wrapper).hasClass(SHOW_CLASSNAME)).toBe(false);
        });

        test('should always show the controls if they have focus', () => {
            const wrapper = getWrapper();

            act(() => {
                getElement(wrapper).simulate('focus');
                getElement(wrapper).simulate('mouseenter');
            });
            wrapper.update();

            expect(getElement(wrapper).hasClass(SHOW_CLASSNAME)).toBe(true);

            act(() => {
                getElement(wrapper).simulate('mouseleave');
                jest.advanceTimersByTime(HIDE_DELAY_MS);
            });
            wrapper.update();

            expect(getElement(wrapper).hasClass(SHOW_CLASSNAME)).toBe(true);
        });

        test('should always show the controls if they have the mouse cursor', () => {
            const wrapper = getWrapper();

            act(() => {
                getElement(wrapper).simulate('focus');
                getElement(wrapper).simulate('mouseenter');
            });
            wrapper.update();

            expect(getElement(wrapper).hasClass(SHOW_CLASSNAME)).toBe(true);

            act(() => {
                getElement(wrapper).simulate('blur');
                jest.advanceTimersByTime(HIDE_DELAY_MS);
            });
            wrapper.update();

            expect(getElement(wrapper).hasClass(SHOW_CLASSNAME)).toBe(true);
        });
    });

    describe('unmount', () => {
        test('should destroy any existing hide timeout', () => {
            let unmount = (): void => {
                // placeholder
            };

            jest.spyOn(window, 'clearTimeout');
            jest.spyOn(React, 'useEffect').mockImplementation(cb => {
                unmount = cb() as () => void; // Enzyme unmount helper does not currently invoke useEffect cleanup
            });

            getWrapper({
                onMount: (helpers: Helpers): void => {
                    helpers.hide(); // Kick off the hide timeout
                },
            });
            unmount();

            expect(window.clearTimeout).toBeCalledTimes(2); // Once on hide, once on unmount
        });
    });

    describe('render', () => {
        test('should invoke the onMount callback once with the visibility helpers', () => {
            const onMount = jest.fn();
            const wrapper = getWrapper({ onMount });

            wrapper.update();
            wrapper.update();
            wrapper.update();

            expect(onMount).toBeCalledTimes(1);
            expect(onMount).toBeCalledWith({
                clean: expect.any(Function),
                hide: expect.any(Function),
                reset: expect.any(Function),
                show: expect.any(Function),
            });
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.contains(children)).toBe(true);
            expect(wrapper.childAt(0).hasClass('bp-ControlsLayer')).toBe(true);
        });
    });
});
