import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import Settings from '../Settings';
import SettingsToggle from '../SettingsToggle';
import SettingsFlyout from '../SettingsFlyout';

describe('Settings', () => {
    const getHostNode = (): HTMLDivElement => {
        return document.body.appendChild(document.createElement('div'));
    };
    const getWrapper = (props = {}): ReactWrapper => mount(<Settings {...props} />, { attachTo: getHostNode() });

    describe('event handlers', () => {
        test('should update the flyout and toggle button isOpen prop when clicked', () => {
            const wrapper = getWrapper();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(false);
            expect(wrapper.find(SettingsToggle).prop('isOpen')).toBe(false);

            wrapper.find(SettingsToggle).simulate('click');

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(true);
            expect(wrapper.find(SettingsToggle).prop('isOpen')).toBe(true);
        });

        test.each`
            key             | isFocused
            ${'1'}          | ${false}
            ${'A'}          | ${false}
            ${'ArrowDown'}  | ${true}
            ${'ArrowLeft'}  | ${true}
            ${'ArrowRight'} | ${true}
            ${'ArrowUp'}    | ${true}
            ${'Enter'}      | ${true}
            ${'Space'}      | ${true}
            ${'Tab'}        | ${true}
        `('should update the focused state to $isFocused if $key is pressed', ({ key, isFocused }) => {
            const wrapper = getWrapper();

            expect(wrapper.childAt(0).hasClass('bp-is-focused')).toBe(false);

            act(() => {
                wrapper.simulate('keydown', { key });
            });
            wrapper.update();

            expect(wrapper.childAt(0).hasClass('bp-is-focused')).toBe(isFocused);
        });

        test('should reset the parent context when a click is detected outside the controls', () => {
            const wrapper = getWrapper();
            const getEvent = (target: HTMLElement): MouseEvent => {
                const event = new MouseEvent('click');
                Object.defineProperty(event, 'target', { enumerable: true, value: target });
                return event;
            };

            wrapper.find(SettingsToggle).simulate('click'); // Open the controls
            expect(wrapper.find(SettingsToggle).prop('isOpen')).toBe(true);

            act(() => {
                document.dispatchEvent(getEvent(document.body)); // Click outside the controls
            });
            wrapper.update();
            expect(wrapper.find(SettingsToggle).prop('isOpen')).toBe(false);

            wrapper.find(SettingsToggle).simulate('click'); // Re-open the controls
            expect(wrapper.find(SettingsToggle).prop('isOpen')).toBe(true);

            wrapper.find(SettingsFlyout).simulate('click'); // Click within the controls
            expect(wrapper.find(SettingsToggle).prop('isOpen')).toBe(true);
        });

        test('should stop propagation on all keydown events to prevent triggering global event listeners', () => {
            const wrapper = getWrapper();
            const event = { stopPropagation: jest.fn() }; // Key is not relevant

            act(() => {
                wrapper.simulate('keydown', event);
            });
            wrapper.update();

            expect(event.stopPropagation).toBeCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();

            expect(wrapper.getDOMNode()).toHaveClass('bp-Settings');
            expect(wrapper.exists(SettingsFlyout)).toBe(true);
            expect(wrapper.exists(SettingsToggle)).toBe(true);
        });
    });
});
