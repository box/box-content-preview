import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import MediaSettingsContext, { Context, Menu } from '../MediaSettingsContext';
import MediaSettingsMenu from '../MediaSettingsMenu';

describe('MediaSettingsMenu', () => {
    const getContext = (overrides = {}): Partial<Context> => ({
        activeMenu: Menu.MAIN,
        setActiveRect: jest.fn(),
        ...overrides,
    });
    const getHostNode = (): HTMLDivElement => {
        return document.body.appendChild(document.createElement('div'));
    };
    const getWrapper = (props = {}, context = getContext()): ReactWrapper =>
        mount(
            <MediaSettingsMenu name={Menu.MAIN} {...props}>
                <div data-testid="test1" role="menuitem" tabIndex={0} />
                <div data-testid="test2" role="menuitem" tabIndex={0} />
                <div data-testid="test3" role="menuitem" tabIndex={0} />
            </MediaSettingsMenu>,
            {
                attachTo: getHostNode(),
                wrappingComponent: MediaSettingsContext.Provider,
                wrappingComponentProps: { value: context },
            },
        );

    describe('event handlers', () => {
        test('should focus the active menu index based on the arrow keys', () => {
            const wrapper = getWrapper();
            const simulateKey = (key: string): void => {
                act(() => {
                    wrapper.simulate('keydown', { key });
                });
                wrapper.update();
            };

            expect(wrapper.find('[data-testid="test1"]').getDOMNode()).toHaveFocus(); // Default case on mount

            simulateKey('ArrowDown');
            expect(wrapper.find('[data-testid="test2"]').getDOMNode()).toHaveFocus();

            simulateKey('ArrowDown');
            expect(wrapper.find('[data-testid="test3"]').getDOMNode()).toHaveFocus();

            simulateKey('ArrowDown');
            expect(wrapper.find('[data-testid="test3"]').getDOMNode()).toHaveFocus(); // Increment stops at list end

            simulateKey('ArrowUp');
            expect(wrapper.find('[data-testid="test2"]').getDOMNode()).toHaveFocus();

            simulateKey('ArrowUp');
            expect(wrapper.find('[data-testid="test1"]').getDOMNode()).toHaveFocus();

            simulateKey('ArrowUp');
            expect(wrapper.find('[data-testid="test1"]').getDOMNode()).toHaveFocus(); // Decrement stops at list start
        });
    });

    describe('lifecycle', () => {
        test('should update the active rect on mount', () => {
            const context = getContext();
            const wrapper = getWrapper({}, context);

            expect(context.setActiveRect).toBeCalledWith(wrapper.getDOMNode().getBoundingClientRect());
        });
    });

    describe('render', () => {
        test('should set classes based on the active menu', () => {
            const context = getContext({ activeMenu: Menu.MAIN });
            const wrapper = getWrapper({ name: Menu.MAIN }, context);

            expect(wrapper.childAt(0).hasClass('bp-is-active')).toBe(true);

            context.activeMenu = Menu.AUTOPLAY;
            wrapper.setProps({}); // Force re-render
            wrapper.update();

            expect(wrapper.childAt(0).hasClass('bp-is-active')).toBe(false);
        });

        test('should return a valid wrapper', () => {
            const wrapper = getWrapper();
            const element = wrapper.getDOMNode();

            expect(element).toHaveClass('bp-MediaSettingsMenu');
            expect(element).toHaveAttribute('role', 'menu');
        });
    });
});
