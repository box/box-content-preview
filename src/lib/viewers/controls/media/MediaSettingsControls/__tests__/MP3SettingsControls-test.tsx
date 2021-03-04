import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaSettingsControls from '../MediaSettingsControls';
import MP3SettingsControls from '../MP3SettingsControls';
import MP3SettingsFlyout from '../MP3SettingsFlyout';

describe('MP3SettingsControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <MP3SettingsControls
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

            expect(wrapper.exists(MediaSettingsControls)).toBe(true);
            expect(wrapper.exists(MP3SettingsFlyout)).toBe(true);
        });
    });
});
