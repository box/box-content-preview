import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import audioTracks from '../__mocks__/audioTracks';
import MediaSettingsAudioTracks from '../MediaSettingsAudioTracks';
import Settings, { Context, Menu } from '../../settings';

describe('MediaSettingsAudioTracks', () => {
    const getContext = (): Partial<Context> => ({ setActiveMenu: jest.fn() });
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(
            <MediaSettingsAudioTracks
                audioTrack={1}
                audioTracks={audioTracks}
                onAudioTrackChange={jest.fn()}
                {...props}
            />,
            {
                wrappingComponent: Settings.Context.Provider,
                wrappingComponentProps: { value: context },
            },
        );

    describe('event handlers', () => {
        test('should surface the selected item on change', () => {
            const onAudioTrackChange = jest.fn();
            const wrapper = getWrapper({ onAudioTrackChange });

            wrapper.find({ value: 0 }).simulate('click');

            expect(onAudioTrackChange).toBeCalledWith(0);
        });

        test('should reset the active menu on change', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            wrapper.find({ value: 0 }).simulate('click');

            expect(context.setActiveMenu).toBeCalledWith(Menu.MAIN);
        });
    });

    describe('render', () => {
        test('should not render if audiotracks is <= 1', () => {
            const wrapper = getWrapper({ audioTracks: [] });

            expect(wrapper.isEmptyRender()).toBe(true);
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.exists(Settings.MenuBack)).toBe(true);
            expect(wrapper.exists(Settings.RadioItem)).toBe(true);
        });
    });
});
