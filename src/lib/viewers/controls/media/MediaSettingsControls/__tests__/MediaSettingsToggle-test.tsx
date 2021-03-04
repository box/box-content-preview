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
        });

        test.each([true, false])('should add bp-is-open class %s', isOpen => {
            const wrapper = getWrapper({ isOpen });

            expect(wrapper.hasClass('bp-is-open')).toBe(isOpen);
        });

        test('should render the correct icon and title ', () => {
            const wrapper = getWrapper();

            expect(wrapper.exists(IconGear24)).toBe(true);
            expect(wrapper.prop('title')).toBe('Settings');
        });
    });
});
