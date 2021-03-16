import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconGear24 from '../../../icons/IconGear24';
import MediaSettingsToggle from '../MediaSettingsToggle';

describe('MediaSettingsToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<MediaSettingsToggle isOpen={false} onClick={jest.fn()} {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-MediaSettingsToggle')).toBe(true);
            expect(wrapper.exists(IconGear24)).toBe(true);
            expect(wrapper.prop('title')).toBe('Settings');
        });

        test.each([true, false])('should add or remove class based on isOpen prop', isOpen => {
            const wrapper = getWrapper({ isOpen });

            expect(wrapper.hasClass('bp-is-open')).toBe(isOpen);
        });
    });
});
