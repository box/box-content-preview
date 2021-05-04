import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettingsMenuRate from '../MediaSettingsMenuRate';
import Settings, { Context, Menu } from '../../settings';

describe('SettingsRate', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(<MediaSettingsMenuRate onRateChange={jest.fn()} rate="1.0" {...props} />, {
            wrappingComponent: Settings.Context.Provider,
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

            expect(wrapper.exists(Settings.MenuBack)).toBe(true);
            expect(wrapper.exists(Settings.RadioItem)).toBe(true);
        });
    });
});
