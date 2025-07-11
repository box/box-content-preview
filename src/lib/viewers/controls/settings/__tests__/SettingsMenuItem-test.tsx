import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsContext, { Context, Menu } from '../SettingsContext';
import SettingsMenuItem from '../SettingsMenuItem';

describe('SettingsMenuItem', () => {
    const getContext = (): Context => ({
        activeMenu: Menu.MAIN,
        setActiveMenu: jest.fn(),
        setActiveRect: jest.fn(),
    });
    const getWrapper = (props = {}, context = getContext()) =>
        render(
            <SettingsContext.Provider value={context}>
                <SettingsMenuItem label="Speed" target={Menu.AUTOPLAY} value="Normal" {...props} />
            </SettingsContext.Provider>,
        );

    const getMenuItem = async () => screen.findByRole('menuitem');

    describe('event handlers', () => {
        test('should set the active menu when clicked', async () => {
            const context = getContext();
            getWrapper({}, context);
            const menuItem = await getMenuItem();

            await userEvent.click(menuItem);

            expect(context.setActiveMenu).toHaveBeenCalled();
        });

        test.each`
            key             | calledTimes
            ${'ArrowRight'} | ${1}
            ${'Enter'}      | ${1}
            ${'Escape'}     | ${0}
            ${'Space'}      | ${1}
        `('should set the active menu $calledTimes times when $key is pressed', async ({ key, calledTimes }) => {
            const context = getContext();
            getWrapper({}, context);

            // focus on menu item
            await userEvent.tab();
            await userEvent.keyboard(`{${key}}`);

            expect(context.setActiveMenu).toHaveBeenCalledTimes(calledTimes);
        });

        test('should not set the active menu when clicked while disabled', async () => {
            const context = getContext();
            getWrapper({ isDisabled: true }, context);
            const menuItem = await getMenuItem();

            await userEvent.click(menuItem);

            expect(context.setActiveMenu).not.toHaveBeenCalled();
        });

        test.each`
            key
            ${'ArrowRight'}
            ${'Enter'}
            ${'Space'}
        `('should not set the active menu when $key is pressed while disabled', async ({ key }) => {
            const context = getContext();
            getWrapper({ isDisabled: true }, context);

            // focus on menu item
            await userEvent.tab();
            await userEvent.keyboard(`{${key}}`);

            expect(context.setActiveMenu).not.toHaveBeenCalled();
        });
    });

    describe('render', () => {
        test('should return a valid wrapper', async () => {
            getWrapper();

            const menuItem = await getMenuItem();
            const label = await screen.findByText('Speed');
            const value = await screen.findByText('Normal');
            const icon = await screen.findByTestId('IconArrowRight24');

            expect(menuItem).toBeInTheDocument();
            expect(menuItem).toHaveAttribute('aria-disabled', 'false');
            expect(label).toBeInTheDocument();
            expect(value).toBeInTheDocument();
            expect(icon).toBeInTheDocument();
        });

        test('should render as disabled when isDisabled is true', async () => {
            getWrapper({ isDisabled: true });
            const menuItem = await getMenuItem();
            const icon = screen.queryByTestId('IconArrowRight24');

            expect(menuItem).toHaveAttribute('aria-disabled', 'true');
            expect(icon).toBeNull();
        });
    });
});
