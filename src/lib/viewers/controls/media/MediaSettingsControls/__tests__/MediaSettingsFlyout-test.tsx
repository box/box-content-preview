import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettingsContext, { Context } from '../MediaSettingsContext';
import MediaSettingsFlyout from '../MediaSettingsFlyout';

describe('MediaSettingsFlyout', () => {
    const getContext = (): Partial<Context> => ({ activeRect: undefined });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(<MediaSettingsFlyout isOpen={false} {...props} />, {
            wrappingComponent: MediaSettingsContext.Provider,
            wrappingComponentProps: { value: context },
        });

    describe('event handlers', () => {
        test('should set classes based on the transitionstart/end events', () => {
            const wrapper = getWrapper();
            expect(wrapper.getDOMNode()).not.toHaveClass('bp-is-transitioning');

            act(() => {
                wrapper.getDOMNode().dispatchEvent(new Event('transitionstart'));
            });
            expect(wrapper.getDOMNode()).toHaveClass('bp-is-transitioning');

            act(() => {
                wrapper.getDOMNode().dispatchEvent(new Event('transitionend'));
            });
            expect(wrapper.getDOMNode()).not.toHaveClass('bp-is-transitioning');
        });
    });

    describe('render', () => {
        test.each([true, false])('should set classes based on the isOpen prop %s', isOpen => {
            const wrapper = getWrapper({ isOpen });

            expect(wrapper.childAt(0).hasClass('bp-is-open')).toBe(isOpen);
        });

        test('should set styles based on the activeRect, if present', () => {
            const activeRect = { bottom: 0, left: 0, height: 100, right: 0, top: 0, width: 100 };
            const wrapper = getWrapper({}, { activeRect });

            expect(wrapper.childAt(0).prop('style')).toEqual({
                height: 100,
                width: 100,
            });
        });

        test('should set styles based on defaults if activeRect is not present', () => {
            const wrapper = getWrapper();

            expect(wrapper.childAt(0).prop('style')).toEqual({
                height: 'auto',
                width: 'auto',
            });
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.getDOMNode()).toHaveClass('bp-MediaSettingsFlyout');
        });
    });
});
