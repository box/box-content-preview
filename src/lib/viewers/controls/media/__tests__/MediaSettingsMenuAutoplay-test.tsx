import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettingsMenu from '../MediaSettingsMenuAutoplay';
import Settings, { Context, Menu } from '../../settings';

describe('MediaSettingsMenuAutoplay', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(<MediaSettingsMenu autoplay onAutoplayChange={jest.fn()} {...props} />, {
            wrappingComponent: Settings.Context.Provider,
            wrappingComponentProps: { value: context },
        });

    describe('event handlers', () => {
        test('should surface the selected item on change', () => {
            const onAutoplayChange = jest.fn();
            const wrapper = getWrapper({ onAutoplayChange });

            wrapper.find({ value: true }).simulate('click');

            expect(onAutoplayChange).toBeCalledWith(true);
        });

        test('should reset the active menu on change', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.find({ value: true }).simulate('click');

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
