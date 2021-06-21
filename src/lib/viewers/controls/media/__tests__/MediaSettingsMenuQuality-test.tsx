import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettingsMenuQuality, { Quality } from '../MediaSettingsMenuQuality';
import Settings, { Context, Menu } from '../../settings';

describe('MediaSettingsMenuQuality', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(<MediaSettingsMenuQuality onQualityChange={jest.fn()} quality={Quality.AUTO} {...props} />, {
            wrappingComponent: Settings.Context.Provider,
            wrappingComponentProps: { value: context },
        });

    describe('event handlers', () => {
        test('should surface the selected item on change', () => {
            const onQualityChange = jest.fn();
            const wrapper = getWrapper({ onQualityChange });

            wrapper.find({ value: 'sd' }).simulate('click');

            expect(onQualityChange).toBeCalledWith('sd');
        });

        test('should reset the active menu on change', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.find({ value: 'sd' }).simulate('click');

            expect(context.setActiveMenu).toBeCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should not render if no quality is provided', () => {
            const wrapper = getWrapper({ quality: undefined });

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should not render if no callback is provided', () => {
            const wrapper = getWrapper({ onQualityChange: undefined });

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();
            const radioItems = wrapper.find(Settings.RadioItem);

            expect(wrapper.exists(Settings.MenuBack)).toBe(true);
            expect(radioItems.length).toBe(3);
            expect(radioItems.at(2).prop('isSelected')).toBe(true);
        });
    });
});
