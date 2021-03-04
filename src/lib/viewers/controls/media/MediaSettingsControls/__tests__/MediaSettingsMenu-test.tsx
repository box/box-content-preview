import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaSettingsMenu from '../MediaSettingsMenu';

describe('MediaSettingsMenu', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <MediaSettingsMenu isActive {...props}>
                <div />
            </MediaSettingsMenu>,
        );

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-MediaSettingsMenu')).toBe(true);
            expect(wrapper.prop('role')).toBe('menu');
        });

        test.each([true, false])('should add bp-is-active class %s', isActive => {
            const wrapper = getWrapper({ isActive });

            expect(wrapper.hasClass('bp-is-active')).toBe(isActive);
        });
    });
});
