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
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.getDOMNode()).toHaveClass('bp-SettingsMenuItem');
            expect(wrapper.find('.bp-SettingsMenuItem-label').contains('Speed')).toBe(true);
            expect(wrapper.find('.bp-SettingsMenuItem-value').contains('Normal')).toBe(true);
            expect(wrapper.exists(IconArrowRight24)).toBe(true);
        });
    });
});
