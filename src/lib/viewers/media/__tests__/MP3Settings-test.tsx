import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaSettings from '../../controls/media/MediaSettings/MediaSettings';
import MP3Settings from '../MP3Settings';
import MediaSettingsMenu from '../../controls/media/MediaSettings/MediaSettingsMenu';
import MediaSettingsMenuItem from '../../controls/media/MediaSettings/MediaSettingsMenuItem';

describe('MP3SettingsControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <MP3Settings
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

            expect(wrapper.exists(MediaSettings)).toBe(true);
            expect(wrapper.exists(MediaSettingsMenu)).toBe(true);
            expect(wrapper.exists(MediaSettingsMenuItem)).toBe(true);
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
    });
});
