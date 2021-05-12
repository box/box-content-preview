import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import SettingsDropdown, { Props } from '../SettingsDropdown';
import SettingsFlyout from '../SettingsFlyout';
import SettingsList from '../SettingsList';

describe('SettingsDropdown', () => {
    const listItems = [
        { label: 'first', value: 'first' },
        { label: 'second', value: 'second' },
        { label: 'third', value: 'third' },
    ];
    const getDefaults = (): Props<string> => ({
        label: 'Dropdown Label',
        listItems,
        onSelect: jest.fn(),
        value: 'first',
    });
    const getHostNode = (): HTMLDivElement => {
        return document.body.appendChild(document.createElement('div'));
    };
    const getWrapper = (props = {}): ReactWrapper =>
        mount(<SettingsDropdown {...getDefaults()} {...props} />, {
            attachTo: getHostNode(),
        });

    describe('toggling', () => {
        test('should toggle open the flyout and render the list', () => {
            const wrapper = getWrapper();

            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            const renderedItems = wrapper.find('.bp-SettingsDropdown-listitem');

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(true);
            expect(renderedItems.length).toBe(listItems.length);
        });

        test('should select the specified value', () => {
            const wrapper = getWrapper({ value: 'second' });

            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            const renderedItems = wrapper.find('.bp-SettingsDropdown-listitem');

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(true);
            expect(renderedItems.length).toBe(listItems.length);
            expect(renderedItems.get(0).props['aria-selected']).toBe(false);
            expect(renderedItems.get(1).props['aria-selected']).toBe(true);
            expect(renderedItems.get(2).props['aria-selected']).toBe(false);
        });
    });

    describe('events', () => {
        test('should call onSelect with the list item value when clicked', () => {
            const mockEvent = { stopPropagation: jest.fn() };
            const onSelect = jest.fn();
            const wrapper = getWrapper({ onSelect });

            // Open the flyout
            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            act(() => {
                wrapper
                    .find('.bp-SettingsDropdown-listitem')
                    .get(1)
                    .props.onClick(mockEvent);
            });
            wrapper.update();

            expect(onSelect).toBeCalledWith('second');
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });

        test.each(['Space', 'Enter'])('should call onSelect with the list item value when keydown %s', key => {
            const mockEvent = { key };
            const onSelect = jest.fn();
            const wrapper = getWrapper({ onSelect });

            // Open the flyout
            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            act(() => {
                wrapper
                    .find('.bp-SettingsDropdown-listitem')
                    .get(1)
                    .props.onKeyDown(mockEvent);
            });
            wrapper.update();

            expect(onSelect).toBeCalledWith('second');
        });

        test.each(['Escape', 'ArrowLeft'])('should not call onSelect with the list item value when keydown %s', key => {
            const mockEvent = { key };
            const onSelect = jest.fn();
            const wrapper = getWrapper({ onSelect });

            // Open the flyout
            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            act(() => {
                wrapper
                    .find('.bp-SettingsDropdown-listitem')
                    .get(1)
                    .props.onKeyDown(mockEvent);
            });
            wrapper.update();

            expect(onSelect).not.toBeCalled();
        });

        test('should close dropdown after making selection', () => {
            const mockEvent = { stopPropagation: jest.fn() };
            const onSelect = jest.fn();
            const wrapper = getWrapper({ onSelect });

            // Open the flyout
            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            act(() => {
                wrapper
                    .find('.bp-SettingsDropdown-listitem')
                    .get(1)
                    .props.onClick(mockEvent);
            });
            wrapper.update();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(false);
        });

        test('should close dropdown if Escape is pressed', () => {
            const mockEvent = { key: 'Escape', stopPropagation: jest.fn() };
            const wrapper = getWrapper();

            // Open the flyout
            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            act(() => {
                wrapper.find(SettingsList).simulate('keydown', mockEvent);
            });
            wrapper.update();

            expect(wrapper.find(SettingsFlyout).prop('isOpen')).toBe(false);
            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });

        test.each(['ArrowUp', 'ArrowDown', 'Escape'])('should prevent propagation of keydown events for %s', key => {
            const mockEvent = { key, stopPropagation: jest.fn() };
            const wrapper = getWrapper();

            // Open the flyout
            act(() => {
                wrapper.find('.bp-SettingsDropdown-button').simulate('click');
            });
            wrapper.update();

            act(() => {
                wrapper.find(SettingsList).simulate('keydown', mockEvent);
            });
            wrapper.update();

            expect(mockEvent.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();
            const element = wrapper.getDOMNode();

            expect(element).toHaveClass('bp-SettingsDropdown');
            expect(wrapper.find('.bp-SettingsDropdown-label').text()).toBe('Dropdown Label');
            expect(wrapper.find('.bp-SettingsDropdown-button').text()).toBe('first');
            expect(wrapper.exists(SettingsFlyout));
            expect(wrapper.exists(SettingsList));
        });
    });
});
