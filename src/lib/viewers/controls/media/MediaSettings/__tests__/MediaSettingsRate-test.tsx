import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettings, { Context, Menu } from '..';
import MediaSettingsRate from '../MediaSettingsRate';

describe('MediaSettingsRate', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(<MediaSettingsRate onRateChange={jest.fn()} rate="1.0" {...props} />, {
            wrappingComponent: MediaSettings.Context.Provider,
            wrappingComponentProps: { value: context },
        });

    describe('event handlers', () => {
        test('should surface the selected item on change', () => {
            const onRateChange = jest.fn();
            const wrapper = getWrapper({ onRateChange });

            wrapper.find({ value: '2.0' }).simulate('click');

            expect(onRateChange).toBeCalledWith('2.0');
        });

        test('should reset the active menu on change', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.find({ value: '2.0' }).simulate('click');

            expect(context.setActiveMenu).toBeCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.exists(MediaSettings.MenuBack)).toBe(true);
            expect(wrapper.exists(MediaSettings.RadioItem)).toBe(true);
        });
    });
});
