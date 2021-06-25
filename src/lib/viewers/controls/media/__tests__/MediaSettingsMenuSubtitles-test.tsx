import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettingsMenuSubtitles from '../MediaSettingsMenuSubtitles';
import Settings, { Context, Menu } from '../../settings';
import subtitles from '../__mocks__/subtitles';

describe('MediaSettingsSubtitles', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(
            <MediaSettingsMenuSubtitles onSubtitleChange={jest.fn()} subtitle={1} subtitles={subtitles} {...props} />,
            {
                wrappingComponent: Settings.Context.Provider,
                wrappingComponentProps: { value: context },
            },
        );

    describe('event handlers', () => {
        test('should surface the selected item on change', () => {
            const onSubtitleChange = jest.fn();
            const wrapper = getWrapper({ onSubtitleChange });

            wrapper.find({ value: 0 }).simulate('click');

            expect(onSubtitleChange).toBeCalledWith(0);
        });

        test('should reset the active menu on change', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.find({ value: 0 }).simulate('click');

            expect(context.setActiveMenu).toBeCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();
            const radioItems = wrapper.find(Settings.RadioItem);

            expect(wrapper.find(Settings.MenuBack).prop('label')).toBe(`${__('subtitles')}/CC`);
            expect(radioItems.at(0).prop('label')).toBe(__('off'));
            expect(radioItems.at(1).prop('label')).toBe('English');
            expect(radioItems.at(2).prop('label')).toBe('Spanish');
        });
    });
});
