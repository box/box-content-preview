import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaSettingsFlyout from '../MediaSettingsFlyout';
import { Menu } from '../MediaSettingsMenu';

describe('MediaSettingsFlyout', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <MediaSettingsFlyout menu={Menu.MAIN} {...props}>
                <div />
            </MediaSettingsFlyout>,
        );

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-MediaSettingsFlyout')).toBe(true);
        });
    });
});
