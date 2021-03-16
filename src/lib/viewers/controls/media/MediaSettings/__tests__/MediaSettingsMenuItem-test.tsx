import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import IconArrowRight24 from '../../../icons/IconArrowRight24';
import MediaSettingsContext, { Menu, Context } from '../MediaSettingsContext';
import MediaSettingsMenuItem from '../MediaSettingsMenuItem';

describe('MediaSettingsMenuItem', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = {}): ReactWrapper =>
        mount(<MediaSettingsMenuItem label="Speed" target={Menu.AUTOPLAY} value="Normal" {...props} />, {
            wrappingComponent: MediaSettingsContext.Provider,
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

            expect(wrapper.getDOMNode()).toHaveClass('bp-MediaSettingsMenuItem');
            expect(wrapper.find('.bp-MediaSettingsMenuItem-label').contains('Speed')).toBe(true);
            expect(wrapper.find('.bp-MediaSettingsMenuItem-value').contains('Normal')).toBe(true);
            expect(wrapper.exists(IconArrowRight24)).toBe(true);
        });
    });
});
