import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import IconGear24 from '../../icons/IconGear24';
import MediaToggle from '../MediaToggle';
import SettingsControls from '../SettingsControls';

describe('SettingsControls', () => {
    const getWrapper = (props = {}): ShallowWrapper => shallow(<SettingsControls {...props} />);

    describe('event handlers', () => {
        test('should update the toggle button when clicked', () => {
            const wrapper = getWrapper();
            const isOpen = (): boolean => wrapper.find(MediaToggle).hasClass('bp-is-open');

            expect(isOpen()).toBe(false);

            wrapper.find(MediaToggle).simulate('click');

            expect(isOpen()).toBe(true);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-SettingsControls')).toBe(true);
            expect(wrapper.exists(MediaToggle)).toBe(true);
            expect(wrapper.exists(IconGear24)).toBe(true);
        });
    });
});
