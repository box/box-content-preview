import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import IconArrowRight24 from '../../icons/IconArrowRight24';
import SettingsContext, { Menu, Context } from '../SettingsContext';
import SettingsMenuItem from '../SettingsMenuItem';

describe('SettingsMenuItem', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = {}): ReactWrapper =>
        mount(<SettingsMenuItem label="Speed" target={Menu.AUTOPLAY} value="Normal" {...props} />, {
            wrappingComponent: SettingsContext.Provider,
            wrappingComponentProps: { value: context },
        });

    describe('event handlers', () => {
        test('should set the active menu when clicked', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.simulate('click');

            expect(context.setActiveMenu).toBeCalled();
        });

        test.each`
            key             | calledTimes
            ${'ArrowRight'} | ${1}
            ${'Enter'}      | ${1}
            ${'Escape'}     | ${0}
            ${'Space'}      | ${1}
        `('should set the active menu $calledTimes times when $key is pressed', ({ key, calledTimes }) => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.simulate('keydown', { key });

            expect(context.setActiveMenu).toBeCalledTimes(calledTimes);
        });

        test('should not set the active menu when clicked while disabled', () => {
            const context = getContext();
            const wrapper = getWrapper({ isDisabled: true }, context);

            wrapper.simulate('click');

            expect(context.setActiveMenu).not.toBeCalled();
        });

        test.each`
            key
            ${'ArrowRight'}
            ${'Enter'}
            ${'Space'}
        `('should not set the active menu when $key is pressed while disabled', ({ key }) => {
            const context = getContext();
            const wrapper = getWrapper({ isDisabled: true }, context);

            wrapper.simulate('keydown', { key });

            expect(context.setActiveMenu).not.toBeCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.getDOMNode()).toHaveClass('bp-SettingsMenuItem');
            expect(wrapper.getDOMNode().getAttribute('aria-disabled')).toBe('false');
            expect(wrapper.find('.bp-SettingsMenuItem-label').contains('Speed')).toBe(true);
            expect(wrapper.find('.bp-SettingsMenuItem-value').contains('Normal')).toBe(true);
            expect(wrapper.exists(IconArrowRight24)).toBe(true);
        });

        test('should render as disabled when isDisabled is true', () => {
            const wrapper = getWrapper({ isDisabled: true });

            expect(wrapper.getDOMNode().getAttribute('aria-disabled')).toBe('true');
            expect(wrapper.exists(IconArrowRight24)).toBe(false);
        });
    });
});
