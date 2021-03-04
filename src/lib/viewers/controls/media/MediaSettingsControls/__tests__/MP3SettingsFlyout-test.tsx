import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaSettingsFlyout from '../MediaSettingsFlyout';
import MP3SettingsFlyout from '../MP3SettingsFlyout';
import MP3SettingsMenu from '../MP3SettingsMenu';

describe('MP3SettingsFlyout', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <MP3SettingsFlyout
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

            expect(wrapper.exists(MediaSettingsFlyout)).toBe(true);
            expect(wrapper.exists(MP3SettingsMenu)).toBe(true);
        });

        test('main menu should be active on first rendering', () => {
            expect(
                getWrapper()
                    .find(MP3SettingsMenu)
                    .prop('isActive'),
            ).toBe(true);
        });
    });
});
