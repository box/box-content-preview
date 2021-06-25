import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconGear24 from '../../icons/IconGear24';
import SettingsToggle from '../SettingsToggle';

describe('SettingsToggle', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(<SettingsToggle isOpen={false} onClick={jest.fn()} {...props} />);

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-SettingsToggle')).toBe(true);
            expect(wrapper.exists(IconGear24)).toBe(true);
            expect(wrapper.find('button').prop('title')).toBe(__('media_settings'));
        });

        test.each([true, false])('should add or remove class based on isOpen prop', isOpen => {
            const wrapper = getWrapper({ isOpen });

            expect(wrapper.hasClass('bp-is-open')).toBe(isOpen);
        });

        test('should render badge if provided', () => {
            const Badge = (): JSX.Element => <div className="badge">Badge</div>;
            const wrapper = getWrapper({ badge: <Badge /> });

            expect(wrapper.exists(Badge)).toBe(true);
        });
    });
});
