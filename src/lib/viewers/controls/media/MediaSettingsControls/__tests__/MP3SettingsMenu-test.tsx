import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaSettingsMenu from '../MediaSettingsMenu';
import MediaSettingsMenuItem from '../MediaSettingsMenuItem';
import MP3SettingsMenu from '../MP3SettingsMenu';

describe('MP3SettingsMenu', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<MP3SettingsMenu autoplay={false} isActive onMenuChange={jest.fn()} rate="1.0" {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.exists(MediaSettingsMenu)).toBe(true);
            expect(wrapper.exists(MediaSettingsMenuItem)).toBe(true);
        });

        test.each`
            menuItem      | value    | displayValue
            ${'autoplay'} | ${true}  | ${'Enabled'}
            ${'autoplay'} | ${false} | ${'Disabled'}
            ${'rate'}     | ${'1.0'} | ${'Normal'}
            ${'rate'}     | ${'2.0'} | ${'2.0'}
        `('should set $menuItem $displayValue', ({ menuItem, value, displayValue }) => {
            expect(
                getWrapper({ [menuItem]: value })
                    .find(`[data-testid="bp-MP3SettingsMenu-${menuItem}"]`)
                    .prop('value'),
            ).toBe(displayValue);
        });
    });
});
