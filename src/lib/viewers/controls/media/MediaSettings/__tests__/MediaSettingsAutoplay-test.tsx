import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettings, { Context, Menu } from '..';
import MediaSettingsAutoplay from '../MediaSettingsAutoplay';

describe('MediaSettingsAutoplay', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(<MediaSettingsAutoplay autoplay onAutoplayChange={jest.fn()} {...props} />, {
            wrappingComponent: MediaSettings.Context.Provider,
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

            expect(wrapper.exists(MediaSettings.MenuBack)).toBe(true);
            expect(wrapper.exists(MediaSettings.RadioItem)).toBe(true);
        });
    });
});
