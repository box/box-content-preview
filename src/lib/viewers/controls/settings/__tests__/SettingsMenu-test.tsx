import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsContext, { Context, Menu } from '../SettingsContext';
import SettingsMenu from '../SettingsMenu';

describe('SettingsMenu', () => {
    const getContext = (overrides = {}): Context => ({
        activeMenu: Menu.MAIN,
        setActiveRect: jest.fn(),
        setActiveMenu: jest.fn(),
        ...overrides,
    });

    const getComponent = (props = {}, context = getContext()) => (
        <SettingsContext.Provider value={context}>
            <SettingsMenu name={Menu.MAIN} {...props}>
                <div role="menuitem" tabIndex={0} />
                <div role="menuitem" tabIndex={0} />
                <div role="menuitem" tabIndex={0} />
            </SettingsMenu>
        </SettingsContext.Provider>
    );

    const getWrapper = (props = {}, context = getContext()) => render(getComponent(props, context));

    const getSettingsList = async () => screen.findByRole('menu');
    const getSettinglistItems = async () => screen.findAllByRole('menuitem');

    describe('event handlers', () => {
        test('should focus the active menu index based on the arrow keys', async () => {
            getWrapper();

            const [test1, test2, test3] = await getSettinglistItems();

            expect(test1).toHaveFocus(); // Default case on mount

            await userEvent.keyboard('{ArrowDown}');
            expect(test2).toHaveFocus();

            await userEvent.keyboard('{ArrowDown}');
            expect(test3).toHaveFocus();

            await userEvent.keyboard('{ArrowDown}');
            expect(test3).toHaveFocus(); // Increment stops at list end

            await userEvent.keyboard('{ArrowUp}');
            expect(test2).toHaveFocus();

            await userEvent.keyboard('{ArrowUp}');
            expect(test1).toHaveFocus();

            await userEvent.keyboard('{ArrowUp}');
            expect(test1).toHaveFocus(); // Decrement stops at list start
        });
    });

    describe('lifecycle', () => {
        test('should update the active rect on mount', async () => {
            const context = getContext();
            getWrapper({}, context);
            const settingsList = await getSettingsList();

            expect(context.setActiveRect).toHaveBeenCalledWith(settingsList.getBoundingClientRect());
        });
    });

    describe('render', () => {
        test('should set classes based on the active menu', () => {
            const context = getContext({ activeMenu: Menu.MAIN });
            const { rerender } = getWrapper({ name: Menu.MAIN }, context);
            const settingsList = screen.getByRole('menu');

            expect(settingsList).toHaveClass('bp-is-active');

            context.activeMenu = Menu.AUTOPLAY;
            rerender(getComponent({ name: Menu.MAIN }, context));

            expect(settingsList).not.toHaveClass('bp-is-active');
        });

        test('should return a valid wrapper', () => {
            getWrapper();
            const settingsList = screen.getByRole('menu');

            expect(settingsList).toBeInTheDocument();
        });
    });
});
