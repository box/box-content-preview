import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import audioTracks from '../__mocks__/audioTracks';
import MediaSettings from '../MediaSettings';
import Settings from '../../settings/Settings';
import SettingsMenu from '../../settings/SettingsMenu';
import SettingsMenuItem from '../../settings/SettingsMenuItem';
import MediaSettingsMenuAudioTracks from '../MediaSettingsAudioTracks';

describe('MediaSettings', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <MediaSettings
                autoplay={false}
                onAutoplayChange={jest.fn()}
                onRateChange={jest.fn()}
                rate="1.0"
                {...props}
            />,
        );

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.exists(Settings)).toBe(true);
            expect(wrapper.exists(SettingsMenu)).toBe(true);
            expect(wrapper.exists(SettingsMenuItem)).toBe(true);
        });

        test.each`
            menuItem      | value    | displayValue
            ${'autoplay'} | ${true}  | ${'Enabled'}
            ${'autoplay'} | ${false} | ${'Disabled'}
            ${'rate'}     | ${'1.0'} | ${'Normal'}
            ${'rate'}     | ${'2.0'} | ${'2.0'}
        `('should display $displayValue for the $menuItem value $value', ({ displayValue, menuItem, value }) => {
            const wrapper = getWrapper({ [menuItem]: value });

            expect(wrapper.find({ target: menuItem }).prop('value')).toBe(displayValue);
        });

        test('should not render the audio menu item if no audio tracks are provided', () => {
            const wrapper = getWrapper();
            expect(wrapper.exists({ target: 'audio' })).toBe(false);
            expect(wrapper.exists(MediaSettingsMenuAudioTracks)).toBe(false);
        });

        test('should not render the audio menu item if only 1 audio track is present', () => {
            const singleAudioTrack = [{ id: 0, language: 'und' }];
            const wrapper = getWrapper({ audioTracks: singleAudioTrack });
            expect(wrapper.exists({ target: 'audio' })).toBe(false);
            expect(wrapper.exists(MediaSettingsMenuAudioTracks)).toBe(false);
        });

        test('should render the audio menu if > 1 audio tracks are present', () => {
            const wrapper = getWrapper({ audioTracks });
            expect(wrapper.exists({ target: 'audio' })).toBe(true);
            expect(wrapper.exists(MediaSettingsMenuAudioTracks)).toBe(true);
        });

        test('should display the generated track label for the selected audio track', () => {
            const wrapper = getWrapper({ audioTrack: 1, audioTracks });
            const expectedLabel = `${__('track')} 2 (English)`;
            expect(wrapper.find({ target: 'audio' }).prop('value')).toBe(expectedLabel);
        });
    });
});
