import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import SettingsList from '../SettingsList';

describe('SettingsList', () => {
    const getHostNode = (): HTMLDivElement => {
        return document.body.appendChild(document.createElement('div'));
    };
    const getWrapper = (props = {}): ReactWrapper =>
        mount(
            <SettingsList {...props}>
                <div aria-selected="true" data-testid="test1" role="option" tabIndex={0} />
                <div aria-selected="false" data-testid="test2" role="option" tabIndex={0} />
                <div aria-selected="false" data-testid="test3" role="option" tabIndex={0} />
            </SettingsList>,
            {
                attachTo: getHostNode(),
            },
        );

    describe('Event handling', () => {
        test('should handle navigating the list and setting focus on the active item', () => {
            const wrapper = getWrapper();

            // index 0 has focus
            expect(document.querySelector('[data-testid="test1"]')).toHaveFocus();
            expect(document.querySelector('[data-testid="test2"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test3"]')).not.toHaveFocus();

            // index 1 has focus
            act(() => {
                wrapper.find('.bp-SettingsList').simulate('keydown', { key: 'ArrowDown' });
            });
            wrapper.update();

            expect(document.querySelector('[data-testid="test1"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test2"]')).toHaveFocus();
            expect(document.querySelector('[data-testid="test3"]')).not.toHaveFocus();

            // index 2 has focus
            act(() => {
                wrapper.find('.bp-SettingsList').simulate('keydown', { key: 'ArrowDown' });
            });
            wrapper.update();

            expect(document.querySelector('[data-testid="test1"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test2"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test3"]')).toHaveFocus();

            // index 2 should keep focus because we are at the end of the list
            act(() => {
                wrapper.find('.bp-SettingsList').simulate('keydown', { key: 'ArrowDown' });
            });
            wrapper.update();

            expect(document.querySelector('[data-testid="test1"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test2"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test3"]')).toHaveFocus();

            // index 1 has focus
            act(() => {
                wrapper.find('.bp-SettingsList').simulate('keydown', { key: 'ArrowUp' });
            });
            wrapper.update();

            expect(document.querySelector('[data-testid="test1"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test2"]')).toHaveFocus();
            expect(document.querySelector('[data-testid="test3"]')).not.toHaveFocus();

            // index 0 has focus
            act(() => {
                wrapper.find('.bp-SettingsList').simulate('keydown', { key: 'ArrowUp' });
            });
            wrapper.update();

            expect(document.querySelector('[data-testid="test1"]')).toHaveFocus();
            expect(document.querySelector('[data-testid="test2"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test3"]')).not.toHaveFocus();

            // index 0 should keep focus because we are at the top of the list
            act(() => {
                wrapper.find('.bp-SettingsList').simulate('keydown', { key: 'ArrowUp' });
            });
            wrapper.update();

            expect(document.querySelector('[data-testid="test1"]')).toHaveFocus();
            expect(document.querySelector('[data-testid="test2"]')).not.toHaveFocus();
            expect(document.querySelector('[data-testid="test3"]')).not.toHaveFocus();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', () => {
            const onKeyDown = jest.fn();
            const wrapper = getWrapper({ onKeyDown });
            const element = wrapper.getDOMNode();

            expect(element).toHaveClass('bp-SettingsList');
            expect(element).toHaveAttribute('role', 'listbox');
            expect(element).toHaveAttribute('tabIndex', '0');
        });
    });
});
