import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import MediaSettingsControls from '../MediaSettingsControls';
import MediaSettingsToggle from '../MediaSettingsToggle';

describe('MediaSettingsControls', () => {
    const getWrapper = (props = {}): ShallowWrapper =>
        shallow(
            <MediaSettingsControls {...props}>
                <div />
            </MediaSettingsControls>,
        );

    describe('event handlers', () => {
        test('should update the toggle button when clicked', () => {
            const wrapper = getWrapper();
            const isOpen = (): boolean => wrapper.find(MediaSettingsToggle).prop('isOpen');

            expect(isOpen()).toBe(false);

            wrapper.find(MediaSettingsToggle).simulate('click');

            expect(isOpen()).toBe(true);
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.hasClass('bp-MediaSettingsControls')).toBe(true);
            expect(wrapper.exists(MediaSettingsToggle)).toBe(true);
        });
    });
});
